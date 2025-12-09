import { type Context } from 'elysia';
import jwt from '@elysiajs/jwt';

export interface User {
	id: number;
	email: string;
	role: string;
}

export async function verifyToken(ctx: Context & { jwt: ReturnType<typeof jwt> }) {
	const authHeader = ctx.request.headers.get('Authorization');

	// Public endpoints that don't need auth
	if (ctx.request.url.includes('/health') || ctx.request.url.includes('/sessions')|| ctx.request.url.includes('/vnpay_ipn')) {
		return { user: null };
	}

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		throw new Error('Missing or invalid Authorization header');
	}

	const token = authHeader.substring(7);

	try {
		// Verify JWT token
		const payload = await ctx.jwt.verify(token) as unknown as User;
		return { user: payload };
	} catch (error) {
		throw new Error('Invalid or expired token');
	}
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
