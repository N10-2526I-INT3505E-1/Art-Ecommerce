import { type Actions, fail, isRedirect, redirect } from '@sveltejs/kit';
import { HTTPError } from 'ky';
import { api } from '$lib/server/http';

export const load = async ({ locals }) => {
	if (locals.user) {
		redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	register: async (event) => {
		const fd = await event.request.formData();
		const payload = {
			first_name: String(fd.get('firstName') ?? ''),
			last_name: String(fd.get('lastName') ?? ''),
			username: String(fd.get('username') ?? ''),
			email: String(fd.get('email') ?? ''),
			password: String(fd.get('password') ?? ''),
		};

		if (payload.email.trim() === '' || payload.password.length < 6) {
			return fail(400, { message: 'Email and password (6+ chars) are required.' });
		}
		if (fd.get('confirmPassword') !== payload.password) {
			return fail(400, { message: 'Passwords do not match.' });
		}

		const client = api(event);
		try {
			const response = await client
				.post('users', { json: payload })
				.json<{ accessToken: string; refreshToken: string }>();

			event.cookies.set('auth', response.accessToken, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				maxAge: 60 * 30, // 30 minutes
			});

			event.cookies.set('refresh_token', response.refreshToken, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 7, // 7 days
			});

			throw redirect(303, '/');
		} catch (e) {
			if (isRedirect(e)) {
				throw e;
			}

			if (e instanceof HTTPError) {
				const body = await e.response.json().catch(() => null);
				console.error('API Error:', body);

				return fail(e.response.status ?? 400, {
					message: body?.message ?? 'Sign up failed.',
				});
			}

			console.error('Unexpected Register Error:', e);

			return fail(500, { message: 'An error occurred. Please try again.' });
		}
	},
};
