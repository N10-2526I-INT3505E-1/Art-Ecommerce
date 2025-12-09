import { Elysia, type Context } from 'elysia';
import { composeErrorHandler } from 'elysia/compose';
import { type User } from './middleware/auth';

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
	user?: User,
): Promise<Response> {
	const finalPath = fullPath.replace(/^\/api/, '');
	const url = `${serviceUrl}${finalPath}`;

	// Prepare headers for forwarding
	const forwardHeaders = new Headers(headers);
	forwardHeaders.delete('host');

	// Add user context headers if authenticated
	if (user) {
		forwardHeaders.set('x-user-id', user.id.toString());
		forwardHeaders.set('x-user-role', user.role);
	}
	try {
		const response = await fetch(url, {
			method,
			headers: forwardHeaders,
			body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
		});

		return response;
	} catch (error) {
		throw new Error(`Failed to reach ${serviceUrl}`);
	}
}

export function setupRoutes(app: Elysia) {
	return (
		app
			// Sessions routes (public, no JWT required)
			.all('/sessions*', async (ctx: ContextWithUser) => {
				const urlPath = new URL(ctx.request.url).pathname;
				const response = await proxyRequest(
					USERS_SERVICE_URL,
					urlPath,
					ctx.request.method,
					ctx.request.headers,
					ctx.request.body,
					ctx.user,
				);

				return new Response(response.body, {
					status: response.status,
					headers: response.headers,
				});
			})

			// Orders routes
			.all('/orders*', async (ctx: ContextWithUser) => {
				const urlPath = new URL(ctx.request.url).pathname;
				const response = await proxyRequest(
					ORDERS_SERVICE_URL,
					urlPath,
					ctx.request.method,
					ctx.request.headers,
					ctx.request.body,
					ctx.user,
				);
				return new Response(response.body, {
					status: response.status,
					headers: response.headers,
				});
			})

			// Payments routes
			.all('/payments*', async (ctx: ContextWithUser) => {
				const urlPath = new URL(ctx.request.url).pathname;
				const response = await proxyRequest(
					PAYMENTS_SERVICE_URL,
					urlPath,
					ctx.request.method,
					ctx.request.headers,
					ctx.request.body,
					ctx.user,
				);
				return new Response(response.body, {
					status: response.status,
					headers: response.headers,
				});
			})

			// Products routes
			.all('/products*', async (ctx: ContextWithUser) => {
				const urlPath = new URL(ctx.request.url).pathname;
				const response = await proxyRequest(
					PRODUCTS_SERVICE_URL,
					urlPath,
					ctx.request.method,
					ctx.request.headers,
					ctx.request.body,
					ctx.user,
				);
				return new Response(response.body, {
					status: response.status,
					headers: response.headers,
				});
			})

			// Users routes
			.all('/users*', async (ctx: ContextWithUser) => {
				const urlPath = new URL(ctx.request.url).pathname;
				const response = await proxyRequest(
					USERS_SERVICE_URL,
					urlPath,
					ctx.request.method,
					ctx.request.headers,
					ctx.request.body,
					ctx.user,
				);
				return new Response(response.body, {
					status: response.status,
					headers: response.headers,
				});
			})
	);
}
