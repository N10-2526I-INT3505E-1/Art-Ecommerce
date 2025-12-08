// src/routes/bazi/+page.server.ts

import { fail, redirect } from '@sveltejs/kit';
import { api } from '$lib/server/http';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch, request }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	let baziProfile = null;
	try {
		const client = api({ fetch, request });
		const response = await client.get(`api/users/${locals.user.id}/bazi`).json();
		baziProfile = response.profile;
	} catch (error) {
		// Profile doesn't exist yet - this is expected for new users
		console.log('No Bazi profile found (new user)');
	}

	return {
		user: locals.user,
		baziProfile,
	};
};

export const actions: Actions = {
	saveBazi: async ({ request, locals, fetch }) => {
		if (!locals.user) {
			return fail(401, { message: 'Vui lòng đăng nhập để tiếp tục.' });
		}

		const data = await request.formData();

		// --- Extract form data ---
		const profile_name = data.get('profile_name')?.toString()?.trim();
		const gender = data.get('gender')?.toString();
		const birth_date = data.get('birth_date')?.toString(); // Format: YYYY-MM-DD
		const birth_time = data.get('birth_time')?.toString(); // Format: HH:mm

		// Validate required fields
		if (!profile_name || !gender || !birth_date || !birth_time) {
			return fail(400, {
				message: 'Vui lòng điền đầy đủ thông tin bắt buộc (tên, giới tính, ngày sinh, giờ sinh).',
			});
		}

		// Parse date and time
		const [year, month, day] = birth_date.split('-').map(Number);
		const [hour, minute] = birth_time.split(':').map(Number);

		// Additional validation
		if (!year || !month || !day || isNaN(hour)) {
			return fail(400, { message: 'Định dạng ngày hoặc giờ không hợp lệ.' });
		}

		if (month < 1 || month > 12 || day < 1 || day > 31) {
			return fail(400, { message: 'Ngày tháng không hợp lệ.' });
		}

		if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
			return fail(400, { message: 'Giờ phút không hợp lệ.' });
		}

		const currentYear = new Date().getFullYear();
		if (year < 1900 || year > currentYear) {
			return fail(400, { message: `Năm sinh phải từ 1900 đến ${currentYear}.` });
		}

		try {
			const client = api({ fetch, request });
			const response = await client
				.put(`api/users/${locals.user.id}/bazi`, {
					json: {
						profile_name,
						gender,
						birth_day: day,
						birth_month: month,
						birth_year: year,
						birth_hour: hour,
						birth_minute: minute,
					},
				})
				.json();

			return {
				success: true,
				baziProfile: response.profile,
			};
		} catch (error: any) {
			console.error('Bazi update error:', error);

			// Parse error message from API if available
			const errorMessage =
				error?.response?.data?.message ||
				error?.message ||
				'Không thể cập nhật thông tin Bát Tự. Vui lòng thử lại.';

			return fail(500, { message: errorMessage });
		}
	},
};
