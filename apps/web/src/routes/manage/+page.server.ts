import { api } from '$lib/server/http';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch, request }) => {
	const client = api({ fetch, request });

	try {
		// Fetch orders for dashboard stats
		const ordersResponse = await client.get('orders').json<{ orders: any[] }>();
		const orders = ordersResponse.orders || [];

		// Fetch products for dashboard stats
		const productsResponse = await client.get('products').json<{ data: any[]; pagination: any }>();
		const products = productsResponse.data || [];

		// Calculate dashboard statistics
		const totalOrders = orders.length;
		const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;
		const paidOrders = orders.filter((o: any) => o.status === 'paid').length;
		const cancelledOrders = orders.filter((o: any) => o.status === 'cancelled').length;

		const totalRevenue = orders
			.filter((o: any) => o.status === 'paid')
			.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);

		const totalProducts = productsResponse.pagination?.total || products.length;
		const lowStockProducts = products.filter((p: any) => (p.stock || 0) < 10).length;

		// Recent orders (last 5)
		const recentOrders = orders.slice(0, 5).map((order: any) => ({
			id: order.id,
			status: order.status,
			total_amount: Number(order.total_amount),
			created_at: order.created_at,
			user_id: order.user_id,
		}));

		return {
			stats: {
				totalOrders,
				pendingOrders,
				paidOrders,
				cancelledOrders,
				totalRevenue,
				totalProducts,
				lowStockProducts,
			},
			recentOrders,
		};
	} catch (err) {
		console.error('Error loading dashboard data:', err);
		return {
			stats: {
				totalOrders: 0,
				pendingOrders: 0,
				paidOrders: 0,
				cancelledOrders: 0,
				totalRevenue: 0,
				totalProducts: 0,
				lowStockProducts: 0,
			},
			recentOrders: [],
		};
	}
};
