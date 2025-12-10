import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { cors } from '@elysiajs/cors';
import { helmet } from 'elysia-helmet';
import { verifyToken } from './middleware/auth';
import { routes } from './routes'; // Import the plugin instance

// Load environment variables
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const app = new Elysia()
	// 1. Security & Global Middleware
	.use(helmet())
	.use(
		cors({
			origin: [
				FRONTEND_URL,
				'https://novus.io.vn/',
				'http://localhost:5173',
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

app.listen(PORT, () => {
	console.log(`🚀 Gateway running on http://localhost:${PORT}`);
	console.log(`📝 Serving for frontend URL: ${FRONTEND_URL}`);
});

export type App = typeof app;
