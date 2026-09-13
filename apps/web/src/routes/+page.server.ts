import { api } from '$lib/server/http';
import type { PageServerLoad } from './$types';

type ProductList = { data?: any[] };

export const load: PageServerLoad = async ({ fetch, request }) => {
	const client = api({ fetch, request });

	// Run the three catalog requests concurrently and tolerate individual failures.
	// A slow or unreachable API (e.g. a free-tier cold start) should degrade to empty
	// sections instead of failing the whole storefront with a 500.
	const [collectionRes, newArrivalsRes, bestSellersRes] = await Promise.allSettled([
		client.get('products/?limit=10&page=1').json<ProductList>(),
		client.get('products/?limit=10&page=2').json<ProductList>(),
		client.get('products/?limit=10&page=3').json<ProductList>(),
	]);

	const items = (result: PromiseSettledResult<ProductList>): any[] =>
		result.status === 'fulfilled' ? (result.value?.data ?? []) : [];

	return {
		collection: items(collectionRes),
		newArrivals: items(newArrivalsRes),
		bestSellers: items(bestSellersRes),
	};
};
