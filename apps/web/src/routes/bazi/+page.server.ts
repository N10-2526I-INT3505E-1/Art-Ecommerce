import { api } from '$lib/server/http';
import { fail, redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	if (!locals.user) {
		redirect(302, '/login');
	}

	return {
		user: locals.user,
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	updateBazi: async ({ request, locals, fetch }) => {
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const data = await request.formData();
		const dob = data.get('dob')?.toString();
		const birth_hour = data.get('birth_hour')?.toString();

		try {
			const client = api({ fetch, request });
			const response = await client
				.patch(`api/users/${locals.user.id}`, {
					json: {
						dob: dob || null,
						birth_hour: birth_hour || null,
					},
				})
				.json();

			return { success: true, user: response.user };
		} catch (error) {
			console.error('Bazi update error:', error);
			return fail(500, { message: 'Không thể cập nhật thông tin Bát tự' });
		}
	},
};
