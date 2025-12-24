import { api } from '$lib/server/http';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, request }) => {
	const { id } = params;
	const client = api({ fetch, request });

	try {
		// Fetch product details
		console.log('Fetching product with ID:', id);
		const productData = await client.get(`products/${id}`).json();

		// Transform API response to match UI requirements
		// Since API gives single imageUrl but UI wants a gallery, we replicate it for the carousel demo
		const images = [
			productData.imageUrl,
			productData.imageUrl,
			productData.imageUrl,
			productData.imageUrl,
		].filter(Boolean);

		// Transform tags from string[] to object array if necessary, or default
		const tags = Array.isArray(productData.tags)
			? productData.tags.map((tag: string, index: number) => ({
					id: index.toString(),
					name: tag,
					type: index % 2 === 0 ? 'auto' : 'manual', // Mocking type for UI variation
				}))
			: [];

		const product = {
			...productData,
			// Ensure price is positive (API example showed negative)
			price: Math.abs(productData.price),
			stock: Math.abs(productData.stock),
			// Create a fallback category object
			category: {
				name: productData.categoryId || 'Sản phẩm',
				slug: productData.categoryId || 'product',
			},
			images: images.length > 0 ? images : ['/placeholder.jpg'],
			tags,
			// Mock rating data as it's missing from API response
			rating: 4.8,
			reviewCount: 127,
		};

		return { product };
	} catch (err) {
		console.error(err);
		error(404, 'Không tìm thấy sản phẩm');
	}
};
