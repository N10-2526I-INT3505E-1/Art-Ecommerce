import { api } from '$lib/server/http'; // Adjust path if needed
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

const isProduction = process.env.NODE_ENV === 'production';

// Common cookie options to match your hooks.server.ts logic
const cookieOptions = {
	path: '/',
	domain: isProduction ? '.novus.io.vn' : undefined,
	httpOnly: true,
	secure: isProduction,
	sameSite: 'lax' as const,
	maxAge: 60 * 30, // 30 minutes for access token
};

const refreshCookieOptions = {
	...cookieOptions,
	maxAge: 60 * 60 * 24 * 7, // 7 days (example for refresh token)
};

export const actions = {
	// Standard Login Action
	login: async ({ request, cookies, fetch }) => {
		const formData = await request.formData();
		const loginId = formData.get('loginId') as string;
		const password = formData.get('password') as string;

		if (!loginId || !password) {
			return fail(400, { message: 'Missing credentials' });
		}

		const client = api({ fetch, request });

		try {
			// Adjust endpoint to match your backend
			const response = await client
				.post('sessions', {
					json: { loginId, password },
				})
				.json<{ accessToken: string; refreshToken?: string }>();

			// Set Access Token
			cookies.set('auth', response.accessToken, cookieOptions);

			// Set Refresh Token if returned
			if (response.refreshToken) {
				cookies.set('refresh_token', response.refreshToken, refreshCookieOptions);
			}

			return { success: true };
		} catch (err: any) {
			// Handle ky errors
			let message = 'Login failed';
			if (err.response) {
				try {
					const body = await err.response.json();
					message = body.message || message;
				} catch (e) {
					/* ignore */
				}
			}
			return fail(400, { message, type: 'error' });
		}
	},

	// Google Login Action
	google: async ({ request, cookies, fetch }) => {
		const formData = await request.formData();
		const credential = formData.get('credential');

		if (!credential) {
			return fail(400, { message: 'Missing Google credential' });
		}

		const client = api({ fetch, request });

		try {
			// Exchange Google token for App tokens
			const response = await client
				.post('sessions/google', {
					json: { token: credential },
				})
				.json<{ accessToken: string; refreshToken?: string }>();

			// Set Cookies on the Server Side
			cookies.set('auth', response.accessToken, cookieOptions);

			if (response.refreshToken) {
				cookies.set('refresh_token', response.refreshToken, refreshCookieOptions);
			}

			return { success: true };
		} catch (err: any) {
			console.error('Google Server Action Error:', err);
			return fail(400, { message: 'Google login failed on server', type: 'error' });
		}
	},
	logout: async (event) => {
		const client = api(event);
		const refreshToken = event.cookies.get('refresh_token');

		if (refreshToken) {
			try {
				await client.delete('sessions', { json: { refreshToken } });
			} catch (e) {
				console.error('Logout failed', e);
			}
		}

		const isProduction = !dev;
		const deleteOpts = {
			path: '/',
			domain: isProduction ? '.novus.io.vn' : undefined,
		};

		event.cookies.delete('auth', deleteOpts);
		event.cookies.delete('refresh_token', deleteOpts);

		throw redirect(303, '/login');
	},
} satisfies Actions;
