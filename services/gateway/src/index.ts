import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { cors } from '@elysiajs/cors';
import { helmet } from 'elysia-helmet';
import { verifyToken } from './middleware/auth';
import { routes } from './routes'; // Import the plugin instance
import path from 'path';

// Load environment variables
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
	throw new Error('JWT_SECRET is not defined in environment variables.');
}

// Resolve SSL certificate paths
const certPath = path.join('/app/certs/tls.crt');
const keyPath = path.join('/app/certs/tls.key');

// Check if SSL files exist - gracefully handle missing certs
let sslEnabled = false;
try {
	const cert = Bun.file(certPath);
	const key = Bun.file(keyPath);
	sslEnabled = cert.size > 0 && key.size > 0;
} catch {
	sslEnabled = false;
}

console.log(`SSL Enabled: ${sslEnabled}`);
if (!sslEnabled) {
	console.warn('⚠️  SSL certificates not found. Running in HTTP mode.');
	console.warn(`Expected cert at: ${certPath}`);
	console.warn(`Expected key at: ${keyPath}`);
}

export const app = new Elysia()
	// 1. Security & Global Middleware
	.use(helmet())
	.use(
		cors({
			origin: [
				'http://localhost:5173',
				'https://novus.io.vn',
				'https://api.novus.io.vn',
				'http://localhost:3000',
			],
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization'],
		}),
	)

	// 2. Global Error Handler
	.onError(({ code, error }) => {
		console.error(`[Global Error ${code}]:`, error);
		const message = (error instanceof Error && error.message) || 'Internal Server Error';
		return {
			status: code === 'NOT_FOUND' ? 404 : 500,
			message,
			code,
		};
	})

	// 3. Health Check
	.get('/health', () => ({
		status: 'ok',
		timestamp: new Date().toISOString(),
	}))

	// 4. Auth Configuration
	.use(
		jwt({
			name: 'jwt',
			secret: JWT_SECRET,
		}),
	)

	// 5. Register Application Routes
	.use(routes);

// Start the server
const serverConfig: any = { port: PORT };

if (sslEnabled) {
	serverConfig.tls = {
		cert: Bun.file(certPath),
		key: Bun.file(keyPath),
	};
}

app.listen(serverConfig, (server) => {
	const protocol = sslEnabled ? 'https' : 'http';
	console.log(`🚀 Gateway running on ${protocol}://${server.hostname}:${server.port}`);
	console.log(`📝 Serving for frontend URL: ${FRONTEND_URL}`);
});

export type App = typeof app;
