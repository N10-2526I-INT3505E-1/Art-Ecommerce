import { api } from '$lib/server/http';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch, request }) => {
	let baziProfile = null;

	// Only try to fetch bazi profile if user is logged in
	if (locals.user) {
		try {
			const client = api({ fetch, request });
			const response = await client.get(`users/profile/bazi`).json();
			baziProfile = response.profile;
		} catch (error) {
			// Profile doesn't exist yet - this is expected for new users
			console.log('No Bazi profile found for AI consult');
		}
	}

	return {
		user: locals.user ?? null,
		baziProfile,
	};
};
