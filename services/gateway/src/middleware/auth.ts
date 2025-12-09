import { type Context } from 'elysia';

export interface User {
	id: string | number;
	email: string;
	role: string;
}

interface JWTContext {
	jwt: {
		sign: (payload: Record<string, any>) => Promise<string>;
		verify: (token: string) => Promise<Record<string, any> | false>;
	};
	set: {
		status?: number;
	};
}

export async function verifyToken(ctx: Context & JWTContext) {
	const authorizationHeader =
		ctx.request.headers.get('Authorization') || ctx.request.headers.get('authorization');
	const cookieHeader = ctx.request.headers.get('Cookie') || ctx.request.headers.get('cookie');

	const url = new URL(ctx.request.url);

	// Public endpoints that don't need auth
	if (
		url.pathname.includes('/health') ||
		url.pathname.includes('/sessions') ||
		url.pathname.includes('/vnpay_ipn')
	) {
		return { user: null };
	}

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

	console.log('[auth] Authorization header:', !!authorizationHeader);
	console.log('[auth] Cookie header:', !!cookieHeader);
	console.log('[auth] Pathname:', url.pathname);

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

	// Clean up token
	if (token) {
		token = token.replace(/^["']|["']$/g, '');
		console.log('[auth] Token (masked):', `${token.slice(0, 10)}...`);
	}

	if (!token) {
		ctx.set.status = 401;
		throw new Error('Authorization token missing or malformed');
	}

	// Verify JWT
	const payload = await ctx.jwt.verify(token);

	if (!payload) {
		ctx.set.status = 401;
		console.error('[auth] JWT verification returned false');
		throw new Error('Invalid or expired token');
	}

	console.log('[auth] Verified payload:', payload);
	return { user: payload as User };
}

export function requireRole(allowedRoles: string[]) {
	return (ctx: Context & { user?: User }) => {
		if (!ctx.user) {
			throw new Error('User not authenticated');
		}
		if (!allowedRoles.includes(ctx.user.role)) {
			throw new Error(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
		}
	};
}
