import { Elysia, type Context } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { cors } from '@elysiajs/cors';
import { helmet } from 'elysia-helmet';
import { verifyToken } from './middleware/auth';
import { setupRoutes } from './routes';

// Load environment variables
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Create Elysia app with middleware
export const app = new Elysia()
	// Security middleware
	.use(helmet())
	// CORS configuration
	.use(
		cors({
			origin: FRONTEND_URL,
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization'],
		}),
	)
	// JWT plugin
	.use(
		jwt({
			name: 'jwt',
			secret: JWT_SECRET,
		}),
	)
	// Global error handler
	.onError(({ code, error }) => {
		console.error(`[${code}]`, error);
		const message = (error instanceof Error && error.message) || 'Internal Server Error';
		return {
			status: code === 'NOT_FOUND' ? 404 : 500,
			message,
			code,
		};
	})
	// Public health check endpoint
	.get('/health', () => ({
		status: 'ok',
		timestamp: new Date().toISOString(),
	}))
	.group('/api', (app) =>
		app
			// JWT verification middleware for protected routes
			.derive(verifyToken)
			// Setup all routes
			.use(setupRoutes),
	);

app.listen(PORT, () => {
	console.log(`🚀 Gateway running on http://localhost:${PORT}`);
	console.log(`📝 Serving for frontend URL: ${FRONTEND_URL}`);
});

export type App = typeof app;
