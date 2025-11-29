import { type Actions, fail, redirect } from '@sveltejs/kit';
import { HTTPError } from 'ky';
import { api } from '$lib/server/http';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    if (event.locals.user) {
        throw redirect(302, '/');
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
            await client.post('api/users', { json: payload }).json();
            throw redirect(303, '/login');
        } catch (e) {
            if (e instanceof HTTPError) {
                const body = await e.response.json().catch(() => null);
                return fail(e.response.status ?? 400, {
                    message: body?.message ?? 'Sign up failed.'
                });
            }
            return fail(500, { message: 'An error occurred. Please try again.' });
        }
    }
};
