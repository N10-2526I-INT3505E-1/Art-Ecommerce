import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Check if user is logged in
	if (!locals.user) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	// Check if user has management role (operator or manager)
	const allowedRoles = ['operator', 'manager'];
	if (!allowedRoles.includes(locals.user.role)) {
		throw redirect(302, '/');
	}

	// Check if trying to access manager-only routes
	const managerOnlyPaths = ['/manage/statistics', '/manage/reports'];
	const isManagerOnlyPath = managerOnlyPaths.some((path) => url.pathname.startsWith(path));

	if (isManagerOnlyPath && locals.user.role !== 'manager') {
		throw redirect(302, '/manage');
	}

	return {
		user: locals.user,
		role: locals.user.role as 'operator' | 'manager',
	};
};
