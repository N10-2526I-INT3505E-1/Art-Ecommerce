import { api } from '$lib/server/http';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ fetch, request, url }) => {
	const client = api({ fetch, request });

	const page = url.searchParams.get('page') || '1';
	const limit = url.searchParams.get('limit') || '10';
	const search = url.searchParams.get('search') || '';
	const categoryId = url.searchParams.get('categoryId') || '';

	// Build query params
	const params = new URLSearchParams({ page, limit });
	if (search) params.set('search', search);
	if (categoryId) params.set('categoryId', categoryId);

	let products: any[] = [];
	let pagination = { page: 1, limit: 10, total: 0, totalPages: 1 };
	let categories: any[] = [];

	// Fetch products
	try {
		const productsResponse = await client
			.get(`products?${params.toString()}`)
			.json<{ data: any[]; pagination: any }>();

		products = productsResponse.data || [];
		pagination = productsResponse.pagination || pagination;
	} catch (err) {
		console.error('Lỗi khi tải sản phẩm:', err);
	}

	// Fetch categories separately to avoid blocking
	try {
		const categoriesResponse = await client.get('products/categories').json<any[]>();
		categories = Array.isArray(categoriesResponse) ? categoriesResponse : [];
	} catch (err) {
		console.error('Lỗi khi tải danh mục:', err);
		categories = [];
	}

	return {
		products,
		pagination,
		categories,
		filters: { search, categoryId },
	};
};

export const actions: Actions = {
	create: async ({ request, fetch }) => {
		const client = api({ fetch, request });
		const formData = await request.formData();

		const name = formData.get('name') as string;
		const price = Number(formData.get('price'));
		const stock = Number(formData.get('stock') || 10);
		const description = formData.get('description') as string;
		const categoryName = formData.get('categoryName') as string;
		const imageUrl = formData.get('imageUrl') as string;
		const tagsRaw = formData.get('tags') as string;
		const tags = tagsRaw
			? tagsRaw
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean)
			: [];

		if (!name || !price) {
			return fail(400, { error: 'Tên và giá sản phẩm là bắt buộc' });
		}

		try {
			await client
				.post('products', {
					json: { name, price, stock, description, categoryName, imageUrl, tags },
				})
				.json();

			return { success: true, message: 'Tạo sản phẩm thành công' };
		} catch (err: any) {
			console.error('Lỗi tạo sản phẩm:', err);
			return fail(500, { error: 'Không thể tạo sản phẩm' });
		}
	},

	update: async ({ request, fetch }) => {
		const client = api({ fetch, request });
		const formData = await request.formData();

		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const price = Number(formData.get('price'));
		const stock = Number(formData.get('stock') || 0);
		const description = formData.get('description') as string;
		const categoryName = formData.get('categoryName') as string;
		const imageUrl = formData.get('imageUrl') as string;
		const tagsRaw = formData.get('tags') as string;
		const tags = tagsRaw
			? tagsRaw
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean)
			: undefined;

		if (!id) {
			return fail(400, { error: 'ID sản phẩm là bắt buộc' });
		}

		try {
			const updateData: any = {};
			if (name) updateData.name = name;
			if (price) updateData.price = price;
			if (stock !== undefined) updateData.stock = stock;
			if (description) updateData.description = description;
			if (categoryName) updateData.categoryName = categoryName;
			if (imageUrl) updateData.imageUrl = imageUrl;
			if (tags) updateData.tags = tags;

			await client.patch(`products/${id}`, { json: updateData }).json();

			return { success: true, message: 'Cập nhật sản phẩm thành công' };
		} catch (err: any) {
			console.error('Lỗi cập nhật sản phẩm:', err);
			return fail(500, { error: 'Không thể cập nhật sản phẩm' });
		}
	},

	delete: async ({ request, fetch }) => {
		const client = api({ fetch, request });
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'ID sản phẩm là bắt buộc' });
		}

		try {
			await client.delete(`products/${id}`).json();
			return { success: true, message: 'Xóa sản phẩm thành công' };
		} catch (err: any) {
			console.error('Lỗi xóa sản phẩm:', err);
			return fail(500, { error: 'Không thể xóa sản phẩm' });
		}
	},
};
