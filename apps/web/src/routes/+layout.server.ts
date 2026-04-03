import { api } from '$lib/server/http';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, fetch, request }) => {
	let baziProfile = null;

	// Only try to fetch bazi profile if user is logged in
	if (locals.user) {
		try {
			const client = api({ fetch, request });
			const response = await client.get(`users/profile/bazi`).json();
			baziProfile = response.profile;
		} catch (error) {
			// Profile doesn't exist yet - this is expected for new users
			// Silently ignore
		}
	}

	return {
		user: locals.user,
		baziProfile,
	};
};
