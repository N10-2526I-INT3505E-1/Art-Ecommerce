import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { jwt } from '@elysiajs/jwt'

// CẤU HÌNH
const BACKEND_URL = (Bun.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
const FRONTEND_URL = (Bun.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const JWT_SECRET = Bun.env.JWT_SECRET || 'secret-phai-giong-het-ben-backend'; 

interface UserPayload {
    id: number;
    username?: string;
    email?: string;
    role: string;
}

const app = new Elysia()
    .use(cors({
        origin: FRONTEND_URL,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }))
    .use(jwt({
        name: 'jwt',
        secret: JWT_SECRET
    }))
    
    // --- 1. MIDDLEWARE: GIẢI MÃ TOKEN ---
    .derive(async ({ cookie: { auth }, jwt, request }) => {
        let user: UserPayload | null = null;
        
        const token = auth?.value || request.headers.get('Authorization')?.replace('Bearer ', '');
        
        if (token && typeof token === 'string') {
            const profile = await jwt.verify(token);
            if (profile) {
                user = profile as unknown as UserPayload;
            }
        }
        return { user };
    })

    // --- 2. ĐỊNH TUYẾN (ROUTING) ---

    // A. NHÓM PUBLIC (Không cần đăng nhập)
    .all('/api/auth/*', ({ request }) => forwardRequest(request))
    .get('/api/products/*', ({ request, user }) => forwardRequest(request, user))
    .get('/api/categories/*', ({ request }) => forwardRequest(request))
    .get('/api/vnpay_ipn', ({ request }) => forwardRequest(request))


    // B. NHÓM PROTECTED (BẮT BUỘC ĐĂNG NHẬP)
    // Kiểm tra thủ công if (!user) - An toàn và dễ hiểu
    .all('/api/orders/*', ({ request, user, set }) => {
        if (!user) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
        }
        return forwardRequest(request, user);
    })
    .all('/api/payments/*', ({ request, user, set }) => {
        if (!user) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
        }
        return forwardRequest(request, user);
    })
    .all('/api/users/*', ({ request, user, set }) => {
        if (!user) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
        }
        return forwardRequest(request, user);
    })

    // C. CÁC API KHÁC (FALLBACK - 404)
    .all('/api/*', ({ set }) => {
        set.status = 404;
        return { message: 'API Route Not Found or Protected' };
    })

    .listen(3000);

// --- HELPER FUNCTION ---
async function forwardRequest(request: Request, user?: UserPayload | null) {
    const url = new URL(request.url);
    const path = url.pathname + url.search;
    const targetUrl = `${BACKEND_URL}${path}`;

    const headers = new Headers(request.headers);
    headers.delete('host');

    if (user) {
        headers.set('X-User-Id', String(user.id));
        headers.set('X-User-Role', String(user.role || 'user'));
        console.log(`[GATEWAY] 🟢 User ${user.id} -> ${request.method} ${path}`);
    } else {
        console.log(`[GATEWAY] ⚪ Guest -> ${request.method} ${path}`);
    }

    const newRequest = new Request(targetUrl, {
        method: request.method,
        headers,
        body: request.body,
        // @ts-ignore
        duplex: 'half', 
    });

    try {
        return await fetch(newRequest);
    } catch (error) {
        console.error(`[GATEWAY ERROR] Cannot connect to Backend at ${BACKEND_URL}`);
        return new Response(JSON.stringify({ message: "Service Unavailable: Backend is down" }), { status: 503 });
    }
}

console.log(`🛡️ Gateway đang chạy tại port 3000`);
console.log(`➡️  Backend target: ${BACKEND_URL}`);