import { fail, redirect } from '@sveltejs/kit';
import { api } from '$lib/server/http';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	if (!locals.user) {
		redirect(302, '/login');
	}
}

/** @type {import('./$types').Actions} */
export const actions = {
	updateProfile: async ({ request, locals, fetch }) => {
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const data = await request.formData();
		const first_name = data.get('first_name')?.toString();
		const last_name = data.get('last_name')?.toString();
		const username = data.get('username')?.toString();
		const dob = data.get('dob')?.toString();

		try {
			const client = api({ fetch, request });
			const response = await client
				.patch(`api/users/${locals.user.id}`, {
					json: {
						first_name,
						last_name,
						username,
						dob: dob || null,
					},
				})
				.json<{ user: App.User }>();

			return { success: true, user: response.user };
		} catch (error) {
			console.error('Profile update error:', error);
			return fail(500, { message: 'Failed to update profile' });
		}
	},
};
