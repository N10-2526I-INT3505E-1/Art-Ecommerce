import { type Actions, fail, redirect } from '@sveltejs/kit';
import { HTTPError } from 'ky';
import { api } from '$lib/server/http';

export const load = async ({ locals }) => {
	if (locals.user) {
		redirect(302, '/');
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
			const response = await client
				.post('api/sessions', { json: payload })
				.json<{ accessToken: string; refreshToken: string }>();

			event.cookies.set('auth', response.accessToken, {
				path: '/',
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 60 * 30, // 30 minutes
			});

			event.cookies.set('refresh_token', response.refreshToken, {
				path: '/',
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
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

		throw redirect(303, '/');
	},
	logout: async (event) => {
		const client = api(event);
		const refreshToken = event.cookies.get('refresh_token');

		if (refreshToken) {
			try {
				await client.delete('api/session', { json: { refreshToken } });
			} catch (e) {
				console.error('Logout failed', e);
			}
		}

		event.cookies.delete('auth', { path: '/' });
		event.cookies.delete('refresh_token', { path: '/' });

		throw redirect(303, '/login');
	},
};
