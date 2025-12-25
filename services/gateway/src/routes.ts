import { Elysia, type Context } from 'elysia';
import { type User } from './middleware/auth';
import { verifyToken } from './middleware/auth';

// Service base URLs
const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://localhost:4001';
const PAYMENTS_SERVICE_URL = process.env.PAYMENTS_SERVICE_URL || 'http://localhost:4002';
const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:4003';
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://localhost:4004';
const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:4005';

// Default API version
const DEFAULT_API_VERSION = 'v1';

const VERSIONABLE_ROUTES = [
	'/products',
	'/orders',
	'/payments',
	'/users',
	'/sessions',
	'/vnpay_ipn',
	'/search',
];

// Helper to sanitize and join URLs
const joinUrl = (baseUrl: string, path: string, search: string) => {
	const cleanBase = baseUrl.replace(/\/$/, ''); // Remove trailing slash
	const cleanPath = path.startsWith('/') ? path : `/${path}`; // Ensure leading slash
	return `${cleanBase}${cleanPath}${search}`;
};

// Helper to check if a path matches any versionable route
const matchesVersionableRoute = (pathname: string): boolean => {
	return VERSIONABLE_ROUTES.some(
		(route) =>
			pathname === route || pathname.startsWith(`${route}/`) || pathname.startsWith(`${route}?`),
	);
};

// Helper to rewrite URL with version prefix
const rewriteUrlWithVersion = (
	request: Request,
	version: string = DEFAULT_API_VERSION,
): Request => {
	const url = new URL(request.url);
	const newPathname = `/${version}${url.pathname}`;
	const newUrl = new URL(newPathname + url.search, url.origin);

	console.log(`[Auto-Version] Rewriting ${url.pathname} -> ${newPathname}`);

	return new Request(newUrl.toString(), {
		method: request.method,
		headers: request.headers,
		body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
		duplex: 'half',
	} as RequestInit);
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
	// AUTO-VERSIONING MIDDLEWARE
	.onRequest(({ request, set }) => {
		const url = new URL(request.url);
		const pathname = url.pathname;

		// Skip if already versioned (starts with /v1, /v2, etc.)
		if (/^\/v\d+/.test(pathname)) {
			return;
		}

		// Check if this is a versionable route
		if (matchesVersionableRoute(pathname)) {
			// Redirect to versioned URL
			const versionedPath = `/${DEFAULT_API_VERSION}${pathname}${url.search}`;
			console.log(`[Auto-Version] Redirecting ${pathname} -> ${versionedPath}`);

			set.status = 308; // Permanent Redirect (preserves method)
			set.headers['Location'] = versionedPath;
			return { message: `Redirecting to ${versionedPath}` };
		}
	})

	// ==========================================
	// API v1 ROUTES
	// ==========================================
	.group('/v1', (v1) =>
		v1
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

			// Products (Public Read)
			.get('/products*', async (ctx) => {
				return proxyRequest(PRODUCTS_SERVICE_URL, ctx.request);
			})

			// Search (Public)
			.all('/search*', async (ctx) => {
				return proxyRequest(SEARCH_SERVICE_URL, ctx.request);
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
					})

					// Products (Create/Update/Delete - Protected)
					.put('/products*', async (ctx: ContextWithUser) => {
						return proxyRequest(PRODUCTS_SERVICE_URL, ctx.request, ctx.user);
					})
					.post('/products*', async (ctx: ContextWithUser) => {
						return proxyRequest(PRODUCTS_SERVICE_URL, ctx.request, ctx.user);
					})
					.delete('/products*', async (ctx: ContextWithUser) => {
						return proxyRequest(PRODUCTS_SERVICE_URL, ctx.request, ctx.user);
					})
					.patch('/products*', async (ctx: ContextWithUser) => {
						return proxyRequest(PRODUCTS_SERVICE_URL, ctx.request, ctx.user);
					}),
			),
	);
