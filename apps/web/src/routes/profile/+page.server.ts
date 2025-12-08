// src/routes/profile/+server.ts

import { fail, redirect } from '@sveltejs/kit';
import { api } from '$lib/server/http';
import type { UserAddress } from '$lib/types'; // Giả sử bạn có file types.ts

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, fetch, request }) {
	if (!locals.user) {
		redirect(302, '/login');
	}

	try {
		const client = api({ fetch, request });

		// Gọi API để lấy danh sách địa chỉ
		const addressesResponse = await client
			.get(`api/users/${locals.user.id}/addresses`)
			.json<{ addresses: UserAddress[] }>();

		// Trả về cả thông tin user và danh sách địa chỉ
		return {
			user: locals.user,
			addresses: addressesResponse.addresses,
		};
	} catch (error) {
		console.error('Failed to load user addresses:', error);
		// Nếu không tải được địa chỉ, vẫn trả về user để trang không bị lỗi hoàn toàn
		return {
			user: locals.user,
			addresses: [],
		};
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

		try {
			const client = api({ fetch, request });
			const response = await client
				.patch(`api/users/${locals.user.id}`, {
					json: { first_name, last_name, username },
				})
				.json<{ user: App.User }>();

			return { success: true, user: response.user, type: 'profile' };
		} catch (error) {
			console.error('Profile update error:', error);
			return fail(500, { message: 'Failed to update profile' });
		}
	},

	addAddress: async ({ request, locals, fetch }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const data = await request.formData();
		const addressData = {
			address: data.get('address')?.toString(),
			phone: data.get('phone')?.toString(),
			state: data.get('state')?.toString(),
			country: data.get('country')?.toString(),
			postal_code: data.get('postal_code')?.toString(),
			// Chuyển đổi giá trị checkbox ('on' hoặc null) thành 1 hoặc 0
			is_default: data.get('is_default') === 'on' ? 1 : 0,
		};

		try {
			const client = api({ fetch, request });
			await client.post(`api/users/profile/addresses`, {
				json: addressData,
			});
			return { success: true, type: 'address', message: 'Thêm địa chỉ thành công!' };
		} catch (error) {
			console.error('Add address error:', error);
			return fail(500, { message: 'Không thể thêm địa chỉ.' });
		}
	},

	updateAddress: async ({ request, locals, fetch }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const data = await request.formData();
		const addressId = data.get('id')?.toString();
		if (!addressId) return fail(400, { message: 'Address ID is missing' });

		const addressData = {
			address: data.get('address')?.toString(),
			phone: data.get('phone')?.toString(),
			state: data.get('state')?.toString(),
			country: data.get('country')?.toString(),
			postal_code: data.get('postal_code')?.toString(),
			is_default: data.get('is_default') === 'on' ? 1 : 0,
		};

		try {
			const client = api({ fetch, request });
			await client.patch(`api/users/profile/addresses/${addressId}`, {
				json: addressData,
			});
			return { success: true, type: 'address', message: 'Cập nhật địa chỉ thành công!' };
		} catch (error) {
			console.error('Update address error:', error);
			return fail(500, { message: 'Không thể cập nhật địa chỉ.' });
		}
	},

	deleteAddress: async ({ request, locals, fetch }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const data = await request.formData();
		const addressId = data.get('id')?.toString();
		if (!addressId) return fail(400, { message: 'Address ID is missing' });

		try {
			const client = api({ fetch, request });
			await client.delete(`api/users/profile/addresses/${addressId}`);
			return { success: true, type: 'address', message: 'Xóa địa chỉ thành công!' };
		} catch (error) {
			console.error('Delete address error:', error);
			return fail(500, { message: 'Không thể xóa địa chỉ.' });
		}
	},
};
