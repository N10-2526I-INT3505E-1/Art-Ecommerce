import { Elysia, type Context } from 'elysia';
import { type User } from './middleware/auth';
import { verifyToken } from './middleware/auth';

// Service base URLs
const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://localhost:4001';
const PAYMENTS_SERVICE_URL = process.env.PAYMENTS_SERVICE_URL || 'http://localhost:4002';
const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:4003';
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://localhost:4004';

// Helper to sanitize and join URLs
const joinUrl = (baseUrl: string, path: string, search: string) => {
	const cleanBase = baseUrl.replace(/\/$/, ''); // Remove trailing slash
	const cleanPath = path.startsWith('/') ? path : `/${path}`; // Ensure leading slash
	return `${cleanBase}${cleanPath}${search}`;
};

async function proxyRequest(serviceUrl: string, request: Request, user?: User): Promise<Response> {
	const url = new URL(request.url);
	const targetUrl = joinUrl(serviceUrl, url.pathname, url.search);

	console.log(`[Proxy] ${request.method} ${url.pathname} -> ${targetUrl}`);

	const forwardHeaders = new Headers(request.headers);
	forwardHeaders.delete('host');
	forwardHeaders.delete('connection');

	if (user) {
		forwardHeaders.set('x-user-id', user.id.toString());
		forwardHeaders.set('x-user-role', user.role);
	}

	const body = request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined;

	try {
		return await fetch(targetUrl, {
			method: request.method,
			headers: forwardHeaders,
			body: body,
			duplex: 'half',
		});
	} catch (error) {
		console.error(`[Proxy Error] Failed to reach ${targetUrl}`, error);
		throw new Error(`Service Unavailable: ${serviceUrl}`);
	}
}

// Define Context type for routes that have gone through auth middleware
interface ContextWithUser extends Context {
	user?: User;
}

// Create and export the plugin
export const routes = new Elysia({ name: 'gateway-routes' })
	// ==========================================
	// 1. PUBLIC ROUTES (No Token Check)
	// ==========================================

	// Sessions (Login/Register/Google)
	.all('/sessions*', async (ctx) => {
		console.log(ctx.request.url);
		return proxyRequest(USERS_SERVICE_URL, ctx.request);
	})

	// User Registration (Must be public!)
	.post('/users', async (ctx) => {
		return proxyRequest(USERS_SERVICE_URL, ctx.request);
	})
	.post('/users/', async (ctx) => {
		return proxyRequest(USERS_SERVICE_URL, ctx.request);
	})

	// Payment Webhooks
	.all('/vnpay_ipn*', async (ctx) => {
		return proxyRequest(PAYMENTS_SERVICE_URL, ctx.request);
	})

	// Products (Public View)
	.all('/products*', async (ctx) => {
		return proxyRequest(PRODUCTS_SERVICE_URL, ctx.request);
	})

	// ==========================================
	// 2. PROTECTED ROUTES (Enforce Token)
	// ==========================================
	.group('', (app) =>
		app
			.derive(verifyToken) // This middleware will run for everything below

			// Orders
			.all('/orders*', async (ctx: ContextWithUser) => {
				return proxyRequest(ORDERS_SERVICE_URL, ctx.request, ctx.user);
			})

			// Payments (Create/Update)
			.all('/payments*', async (ctx: ContextWithUser) => {
				return proxyRequest(PAYMENTS_SERVICE_URL, ctx.request, ctx.user);
			})

			// Users (Profile, Addresses, Bazi - anything NOT registration)
			.all('/users*', async (ctx: ContextWithUser) => {
				return proxyRequest(USERS_SERVICE_URL, ctx.request, ctx.user);
			}),
	);
