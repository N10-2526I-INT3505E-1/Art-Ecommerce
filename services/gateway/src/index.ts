import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { jwt } from '@elysiajs/jwt'

// CẤU HÌNH
const BACKEND_URL = 'http://localhost:3001'; // Địa chỉ backend cũ sau khi đổi port
const FRONTEND_URL = 'http://localhost:5173'; // Địa chỉ Frontend
const JWT_SECRET = process.env.JWT_SECRET || 'secret-phai-giong-het-ben-backend'; 
// LƯU Ý: JWT_SECRET phải giống hệt file .env bên services/api thì mới giải mã được token

const app = new Elysia()
    // 1. Cấu hình CORS (Để Frontend gọi được vào Gateway)
    .use(cors({
        origin: FRONTEND_URL,
        credentials: true, // Cho phép nhận Cookie
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }))

    // 2. Cấu hình JWT (Để kiểm tra vé)
    .use(jwt({
        name: 'jwt',
        secret: JWT_SECRET
    }))

    // 3. Middleware: Kiểm tra đăng nhập (Guard)
    // Logic: Mỗi khi có request, ta xem thử token trong cookie có hợp lệ không
    .derive(async (ctx: any) => {
        // Mặc định là chưa đăng nhập
        let user = null;

        // Lấy các giá trị an toàn từ context
        const auth = ctx?.cookie?.auth;
        const jwt = ctx?.jwt;
        const request = ctx?.request;

        // Nếu có cookie 'auth', thử giải mã
        if (auth && auth.value && jwt && typeof jwt.verify === 'function') {
            const profile = await jwt.verify(auth.value);
            if (profile) {
                user = profile;
                console.log(`[GATEWAY] User ${profile.email || profile.username} is calling: ${request?.url}`);
            }
        }
        return { user };
    })

    // 4. ĐỊNH TUYẾN & PROXY (Chuyển tiếp yêu cầu)
    
    // API Login/Register (Không cần kiểm tra đăng nhập -> Cho qua luôn)
    .all('/api/auth/*', async ({ request }) => {
        return forwardRequest(request);
    })

    // Các API cần bảo vệ (Ví dụ: Đặt hàng, Thanh toán)
    // Bạn có thể thêm các đường dẫn khác vào đây
    .guard({
        beforeHandle: (ctx: any) => {
            const { user, set } = ctx || {};
            if (!user) {
                if (set && typeof set === 'object') set.status = 401;
                return { success: false, message: 'Unauthorized: Bạn cần đăng nhập qua Gateway!' };
            }
        }
    }, (protectedApp) => protectedApp
        // Chỉ những ai có 'user' hợp lệ mới chạy được dòng dưới
        .all('/api/orders/*', ({ request }) => forwardRequest(request))
        .all('/api/payments/*', ({ request }) => forwardRequest(request))
        // Nếu muốn chặn người thường vào API admin, check user.role ở đây
    )

    // Các API công khai khác (Xem sản phẩm - Không cần login vẫn xem được)
    .all('/api/*', async ({ request }) => {
        return forwardRequest(request);
    })

// Hàm hỗ trợ chuyển tiếp request sang Backend (Port 3001)
async function forwardRequest(request: Request) {
    // Tính path một cách an toàn: nếu request.url là full URL, lấy pathname+search,
    // nếu chỉ là path thì dùng nguyên chuỗi.
    let path = '';
    try {
        const u = new URL(request.url);
        path = `${u.pathname}${u.search}`;
    } catch {
        // request.url có thể là đường dẫn tương đối như '/api/orders'
        path = request.url;
    }

    const base = BACKEND_URL.replace(/\/$/, '');
    const targetUrl = `${base}${path.startsWith('/') ? path : `/${path}`}`;

    // Clone headers and remove Host to avoid forwarding original host
    const headers = new Headers(request.headers as any);
    headers.delete('host');

    // Tạo request mới để gửi đi
    // @ts-ignore - Bun-specific `duplex` option used for streaming bodies
    const newRequest = new Request(targetUrl, {
        method: request.method,
        headers,
        body: request.body,
        duplex: 'half',
    });

    try {
        const response = await fetch(newRequest);
        return response;
    } catch (error) {
        console.error('Lỗi khi gọi sang Backend:', error);
        return new Response(JSON.stringify({ message: 'Service Unavailable' }), { status: 503 });
    }
}

// Khởi động server và in host/port chính xác
(async () => {
    try {
        const server = await app.listen(3000);
        const host = (server as any).hostname ?? 'localhost';
        const port = (server as any).port ?? 3000;
        console.log(`🚪 API Gateway đang chạy tại http://${host}:${port}`);
        console.log(`➡️  Đang chuyển tiếp request sang Backend tại ${BACKEND_URL}`);
    } catch (err) {
        console.error('Không thể khởi động API Gateway:', err);
        process.exit(1);
    }
})();