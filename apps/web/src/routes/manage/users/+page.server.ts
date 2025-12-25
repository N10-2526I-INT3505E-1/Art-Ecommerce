import { api } from '$lib/server/http';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

interface User {
	id: string;
	email: string;
	username: string;
	first_name: string;
	last_name: string;
	role: 'manager' | 'operator' | 'user';
	created_at: string;
	updated_at: string;
}

interface UsersResponse {
	users: User[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export const load: PageServerLoad = async ({ fetch, request, url, locals }) => {
	// Only managers can access this page
	if (locals.user?.role !== 'manager') {
		throw redirect(302, '/manage');
	}

	const client = api({ fetch, request });

	const page = url.searchParams.get('page') || '1';
	const limit = url.searchParams.get('limit') || '10';
	const role = url.searchParams.get('role') || '';
	const search = url.searchParams.get('search') || '';

	try {
		// Build query string for server-side pagination
		const queryParams = new URLSearchParams();
		queryParams.set('page', page);
		queryParams.set('limit', limit);
		if (role) queryParams.set('role', role);
		if (search) queryParams.set('search', search);

		// Fetch users with server-side pagination
		const response = await client.get(`users?${queryParams.toString()}`).json<UsersResponse>();

		return {
			users: response.users || [],
			pagination: response.pagination || {
				page: 1,
				limit: 10,
				total: 0,
				totalPages: 1,
			},
			filters: { role, search },
		};
	} catch (err) {
		console.error('Lỗi khi tải danh sách người dùng:', err);
		return {
			users: [],
			pagination: {
				page: 1,
				limit: 10,
				total: 0,
				totalPages: 1,
			},
			filters: { role: '', search: '' },
		};
	}
};

export const actions: Actions = {
	updateUser: async ({ request, fetch }) => {
		const client = api({ fetch, request });
		const formData = await request.formData();

		const id = formData.get('id') as string;
		const first_name = formData.get('first_name') as string;
		const last_name = formData.get('last_name') as string;
		const username = formData.get('username') as string;
		const email = formData.get('email') as string;
		const role = formData.get('role') as string;

		if (!id) {
			return fail(400, { error: 'ID người dùng là bắt buộc' });
		}

		try {
			const updateData: Record<string, string> = {};
			if (first_name) updateData.first_name = first_name;
			if (last_name) updateData.last_name = last_name;
			if (username) updateData.username = username;
			if (email) updateData.email = email;
			if (role) updateData.role = role;

			await client
				.patch(`users/${id}`, {
					json: updateData,
				})
				.json();

			return { success: true, message: 'Cập nhật người dùng thành công' };
		} catch (err: any) {
			console.error('Lỗi cập nhật người dùng:', err);
			const errorMessage = err?.message || 'Không thể cập nhật người dùng';
			return fail(500, { error: errorMessage });
		}
	},

	deleteUser: async ({ request, fetch }) => {
		const client = api({ fetch, request });
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'ID người dùng là bắt buộc' });
		}

		try {
			await client.delete(`users/${id}`).json();
			return { success: true, message: 'Xóa người dùng thành công' };
		} catch (err: any) {
			console.error('Lỗi xóa người dùng:', err);
			return fail(500, { error: 'Không thể xóa người dùng' });
		}
	},
};
