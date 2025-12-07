import { Elysia, type Context } from 'elysia';

interface User {
	id: number;
	email: string;
	role: string;
}

// Service base URLs from environment
const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://localhost:3001';
const PAYMENTS_SERVICE_URL = process.env.PAYMENTS_SERVICE_URL || 'http://localhost:3002';
const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:3003';
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://localhost:3004';

interface ContextWithUser extends Context {
	user?: User;
}

async function proxyRequest(
	serviceUrl: string,
	fullPath: string,
	method: string,
	headers: Headers,
	body?: RequestInit['body'],
	user?: User
): Promise<Response> {
	const url = `${serviceUrl}${fullPath}`;

	// Prepare headers for forwarding
	const forwardHeaders = new Headers(headers);
	forwardHeaders.delete('host');

	// Add user context headers if authenticated
	if (user) {
		forwardHeaders.set('X-User-Id', user.id.toString());
		forwardHeaders.set('X-User-Role', user.role);
	}

	try {
		const response = await fetch(url, {
			method,
			headers: forwardHeaders,
			body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
		});

		return response;
	} catch (error) {
		console.error(`Proxy error to ${url}:`, error);
		throw new Error(`Failed to reach ${serviceUrl}`);
	}
}

export function setupRoutes(app: Elysia) {
	return app
		// Auth routes (public, no JWT required)
		.all('/api/auth/*', async (ctx: ContextWithUser) => {
			const urlPath = new URL(ctx.request.url).pathname;
			const response = await proxyRequest(
				USERS_SERVICE_URL,
				urlPath,
				ctx.request.method,
				ctx.request.headers,
				ctx.request.body,
				ctx.user
			);
			return new Response(response.body, {
				status: response.status,
				headers: response.headers,
			});
		})

		// Orders routes
		.all('/api/orders/*', async (ctx: ContextWithUser) => {
			const urlPath = new URL(ctx.request.url).pathname;
			const response = await proxyRequest(
				ORDERS_SERVICE_URL,
				urlPath,
				ctx.request.method,
				ctx.request.headers,
				ctx.request.body,
				ctx.user
			);
			return new Response(response.body, {
				status: response.status,
				headers: response.headers,
			});
		})

		// Payments routes
		.all('/api/payments/*', async (ctx: ContextWithUser) => {
			const urlPath = new URL(ctx.request.url).pathname;
			const response = await proxyRequest(
				PAYMENTS_SERVICE_URL,
				urlPath,
				ctx.request.method,
				ctx.request.headers,
				ctx.request.body,
				ctx.user
			);
			return new Response(response.body, {
				status: response.status,
				headers: response.headers,
			});
		})

		// Products routes
		.all('/api/products/*', async (ctx: ContextWithUser) => {
			const urlPath = new URL(ctx.request.url).pathname;
			const response = await proxyRequest(
				PRODUCTS_SERVICE_URL,
				urlPath,
				ctx.request.method,
				ctx.request.headers,
				ctx.request.body,
				ctx.user
			);
			return new Response(response.body, {
				status: response.status,
				headers: response.headers,
			});
		})

		// Users routes
		.all('/api/users/*', async (ctx: ContextWithUser) => {
			const urlPath = new URL(ctx.request.url).pathname;
			const response = await proxyRequest(
				USERS_SERVICE_URL,
				urlPath,
				ctx.request.method,
				ctx.request.headers,
				ctx.request.body,
				ctx.user
			);
			return new Response(response.body, {
				status: response.status,
				headers: response.headers,
			});
		});
}
