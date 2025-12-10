import { type Context } from 'elysia';

export interface User {
	id: string;
	email: string;
	role: string;
}

export async function verifyToken(ctx: any) {
	const url = new URL(ctx.request.url);
	const path = url.pathname;
	const method = ctx.request.method;

	if (
		path.startsWith('/sessions') || // Login/Google
		path.startsWith('/vnpay_ipn') || // Payment Webhook
		path.startsWith('/products') || // Public Catalog
		(path === '/users' && method === 'POST') || // Registration ONLY
		(path === '/users/' && method === 'POST') // Handle trailing slash
	) {
		console.log(`[Auth] Public route detected: ${method} ${path}`);
		return;
	}

	const authorizationHeader =
		ctx.request.headers.get('Authorization') || ctx.request.headers.get('authorization');
	const cookieHeader = ctx.request.headers.get('Cookie') || ctx.request.headers.get('cookie');

	function parseCookie(cookieHeaderStr: string | null, name: string): string | null {
		if (!cookieHeaderStr) return null;
		for (const part of cookieHeaderStr.split(';')) {
			const trimmed = part.trim();
			const eqIdx = trimmed.indexOf('=');
			if (eqIdx <= 0) continue;
			const k = trimmed.substring(0, eqIdx).trim();
			const v = trimmed.substring(eqIdx + 1);
			if (k === name) return v;
		}
		return null;
	}

	let token: string | null = null;

	// Try Authorization header first
	if (authorizationHeader?.toLowerCase().startsWith('bearer ')) {
		token = authorizationHeader.substring(7).trim();
	}

	// Fallback to cookie
	if (!token && cookieHeader) {
		const cookieToken = parseCookie(cookieHeader, 'auth');
		if (cookieToken) token = decodeURIComponent(cookieToken.trim());
	}

	if (token) {
		token = token.replace(/^["']|["']$/g, '');
	}

	if (!token) {
		ctx.set.status = 401;
		throw new Error('Authentication required');
	}

	// Verify JWT
	const payload = await ctx.jwt.verify(token);

	if (!payload) {
		ctx.set.status = 401;
		throw new Error('Invalid or expired token');
	}

	return { user: payload as User };
}
