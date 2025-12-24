import { api } from '$lib/server/http';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, request }) => {
	const client = api({ fetch, request });

	const [collectionRes, newArrivalsRes, bestSellersRes] = await Promise.all([
		client.get('products/?limit=10&page=1').json(),
		client.get('products/?limit=10&page=2').json(),
		client.get('products/?limit=10&page=3').json(),
	]);

	return {
		collection: collectionRes?.data || [],
		newArrivals: newArrivalsRes?.data || [],
		bestSellers: bestSellersRes?.data || [],
	};
};
