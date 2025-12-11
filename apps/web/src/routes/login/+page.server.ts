import { type Actions, fail, redirect } from '@sveltejs/kit';
import { HTTPError } from 'ky';
import { api } from '$lib/server/http';
import { dev } from '$app/environment'; // Use SvelteKit's environment check

export const load = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	login: async (event) => {
		const fd = await event.request.formData();

		const loginId = String(fd.get('loginId') ?? '');
		const password = String(fd.get('password') ?? '');

		if (!loginId || !password) {
			return fail(400, { message: 'Username/Email and password are required.' });
		}

		const payload = loginId.includes('@')
			? { email: loginId, password }
			: { username: loginId, password };

		const client = api(event);

		try {
			// 1. Call API
			const response = await client
				.post('sessions', { json: payload })
				.json<{ accessToken: string; refreshToken: string }>();

			// 2. Define Cookie Options (CRITICAL FIX)
			const isProduction = !dev; // True if not in dev mode

			// This allows the cookie to be shared with subdomains (api.) if needed,
			// and matches the logic we used in Google Login/Refresh.
			const commonCookieOpts = {
				path: '/',
				httpOnly: true,
				secure: isProduction,
				sameSite: 'lax' as const,
				domain: isProduction ? '.novus.io.vn' : undefined,
			};

			// 3. Set Cookies with Domain
			event.cookies.set('auth', response.accessToken, {
				...commonCookieOpts,
				maxAge: 60 * 30, // 30 minutes
			});

			event.cookies.set('refresh_token', response.refreshToken, {
				...commonCookieOpts,
				maxAge: 60 * 60 * 24 * 7, // 7 days
			});
		} catch (e) {
			if (e instanceof HTTPError) {
				const body = await e.response.json().catch(() => null);
				return fail(e.response.status ?? 400, {
					message: body?.message ?? 'Invalid credentials.',
				});
			}
			console.error('Login Error:', e);
			return fail(500, { message: 'An unexpected error occurred.' });
		}

		// 4. Redirect
		throw redirect(303, '/');
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
};
