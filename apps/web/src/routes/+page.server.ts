import { api } from '$lib/server/http';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, request }) => {
	const client = api({ fetch, request });

	// We use Promise.all to fetch all 3 sections concurrently for better performance
	const [collectionRes, newArrivalsRes, bestSellersRes] = await Promise.all([
		// Section 1: Collection (Page 1)
		client.get('products/?limit=10&page=1').json(),
		// Section 2: New Arrivals (Page 2 - simulating different data)
		client.get('products/?limit=10&page=2').json(),
		// Section 3: Best Sellers (Page 3 - simulating different data)
		client.get('products/?limit=10&page=3').json(),
	]);

	return {
		collection: collectionRes?.data || [],
		newArrivals: newArrivalsRes?.data || [],
		bestSellers: bestSellersRes?.data || [],
	};
};
