import { cors } from '@elysiajs/cors'
import { jwt } from '@elysiajs/jwt'
import { type Context, Elysia } from 'elysia'
import { helmet } from 'elysia-helmet'

// --- TYPES ---
interface UserPayload {
    id: number;
    username?: string;
    email?: string;
    role: string;
}

// --- CONFIG ---
const PORT = Number(Bun.env.PORT || 3000);
// Xử lý dấu / ở cuối
const BACKEND_URL = (Bun.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
const FRONTEND_URL = (Bun.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const JWT_SECRET = Bun.env.JWT_SECRET || 'secret-phai-giong-het-ben-backend';

// --- SERVICE REGISTRY ---
const ServiceRegistry = {
    'core-api': [BACKEND_URL]
};

// --- HELPER CLASSES (Nên tách ra file riêng như lib/circuit-breaker.ts) ---
// Giả lập Circuit Breaker đơn giản hóa
class CircuitBreaker {
    private failures: Record<string, number> = {};
    private openCircuits: Record<string, number> = {};
    private readonly THRESHOLD = 5;
    private readonly COOLDOWN = 30_000;

    async execute(url: string, options: RequestInit): Promise<Response> {
        const host = new URL(url).host;

        if (this.openCircuits[host]) {
            if (Date.now() - this.openCircuits[host] < this.COOLDOWN) {
                throw new Error('CircuitOpen');
            }
            delete this.openCircuits[host]; // Reset sau cooldown
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
            
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (res.ok) this.failures[host] = 0; // Reset failure count on success
            return res;
        } catch (err) {
            this.failures[host] = (this.failures[host] || 0) + 1;
            if (this.failures[host] >= this.THRESHOLD) {
                this.openCircuits[host] = Date.now();
                console.error(`[CircuitBreaker] Opened for ${host}`);
            }
            throw err;
        }
    }
}
const breaker = new CircuitBreaker();

// --- CACHE & RATE LIMIT (In-Memory cho đơn giản hóa demo) ---
const cacheStore = new Map<string, { data: any, expiry: number }>();
const rateLimitStore = new Map<string, { count: number, resetAt: number }>();

// --- APP ---
const app = new Elysia()
    // 1. Logging & Timing Middleware
    .onRequest(({ request }) => {
        request.headers.set('X-Start-Time', Date.now().toString());
    })
    .onAfterHandle(({ request, set }) => {
        const start = Number(request.headers.get('X-Start-Time'));
        const duration = Date.now() - start;
        set.headers['Server-Timing'] = `total;dur=${duration}`;
        console.log(`[${new Date().toLocaleTimeString()}] ${request.method} ${request.url} - ${duration}ms`);
    })

    // 2. Security
    .use(cors({
        origin: FRONTEND_URL,
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
    }))
    .use(helmet())

    // 3. Rate Limiting Middleware (Global)
    .onBeforeHandle(({ request, set }) => {
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const now = Date.now();
        const record = rateLimitStore.get(ip) || { count: 0, resetAt: now + 60000 };

        if (now > record.resetAt) {
            record.count = 0;
            record.resetAt = now + 60000;
        }

        record.count++;
        rateLimitStore.set(ip, record);

        if (record.count > 100) { // Giới hạn 100 requests/phút
            set.status = 429;
            return { message: 'Too Many Requests' };
        }
    })

    // 4. Auth Middleware
    .use(jwt({ name: 'jwt', secret: JWT_SECRET }))
    .derive(async ({ cookie: { auth }, jwt, request, headers }: any) => {
        let user: UserPayload | null = null;
        const authHeader = (headers?.get?.('Authorization') as string) || '';
        const token = auth?.value || (authHeader ? authHeader.replace('Bearer ', '') : null);
        
        if (token) {
            const profile = await jwt.verify(token);
            if (profile) user = profile as unknown as UserPayload;
        }
        return { user };
    })

    // --- ROUTES ---

    // Healthcheck
    .get('/health', () => ({ status: 'ok', uptime: process.uptime() }))

    // Aggregation Example (Dashboard)
    .get('/api/dashboard-summary', async ({ user, set }) => {
        if (!user) { set.status = 401; return { message: 'Unauthorized' }; }

        const cacheKey = `dash:${user.id}`;
        const cached = cacheStore.get(cacheKey);
        if (cached && cached.expiry > Date.now()) return cached.data;

        try {
            // Sử dụng breaker để gọi an toàn
            const [userRes, orderRes] = await Promise.all([
                breaker.execute(`${BACKEND_URL}/api/users/${user.id}`, {}),
                breaker.execute(`${BACKEND_URL}/api/orders?user_id=${user.id}&limit=5`, {})
            ]);

            const [userData, orderData]: [any, any] = await Promise.all([userRes.json(), orderRes.json()]);

            const result = {
                greeting: `Xin chào, ${userData?.username ?? ''}`,
                recent_orders: orderData?.orders || []
            };

            // Cache 60s
            cacheStore.set(cacheKey, { data: result, expiry: Date.now() + 60000 });
            return result;

        } catch (err: any) {
            if (err.message === 'CircuitOpen') {
                set.status = 503;
                return { message: 'System is cooling down, please try again later.' };
            }
            console.error(err);
            set.status = 502;
            return { message: 'Backend aggregation failed' };
        }
    })

    // Generic Proxy
    .all('/api/*', async ({ request, user, set }) => {
        const url = new URL(request.url);
        const isProtected = url.pathname.includes('/orders') || url.pathname.includes('/payments');
        
        if (isProtected && !user) {
            set.status = 401;
            return { message: 'Unauthorized' };
        }

        const targetUrl = `${BACKEND_URL}${url.pathname}${url.search}`;
        const headers = new Headers(request.headers);
        headers.delete('host');
        
        if (user) {
            headers.set('X-User-Id', String(user.id));
            headers.set('X-User-Role', user.role);
        }

        try {
            const response = await breaker.execute(targetUrl, {
                method: request.method,
                headers,
                body: request.body,
                // @ts-expect-error
                duplex: 'half'
            });

            // Proxy response headers & status
            set.status = response.status;
            // Copy headers từ backend trả về client
            response.headers.forEach((val, key) => {
                set.headers[key] = val;
            });

            return response;
        } catch (err: any) {
            if (err.message === 'CircuitOpen') {
                set.status = 503;
                return { message: 'Service Unavailable (Circuit Open)' };
            }
            set.status = 502;
            return { message: 'Bad Gateway' };
        }
    })

    .listen(PORT);

console.log(`🛡️ Gateway running at port ${PORT}`);