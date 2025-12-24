import { api } from '$lib/server/http';
import type { PageServerLoad } from './$types';

interface Order {
	id: string;
	status: string;
	total_amount: number | string;
	created_at: string;
	user_id: string;
}

interface OrderItem {
	id: string;
	product_id: string;
	quantity: number;
	price_per_item: number | string;
	product_snapshot: string | object;
}

interface Product {
	id: string;
	name: string;
	price: number | string;
	stock: number;
	image?: string;
}

export const load: PageServerLoad = async ({ fetch, request, url }) => {
	const client = api({ fetch, request });

	// Get date range from query params (default: last 30 days)
	const endDate = new Date();
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - 30);

	const dateFrom = url.searchParams.get('from') || startDate.toISOString().split('T')[0];
	const dateTo = url.searchParams.get('to') || endDate.toISOString().split('T')[0];

	try {
		// Fetch all orders
		const ordersResponse = await client.get('orders').json<{ orders: Order[] }>();
		const allOrders = ordersResponse.orders || [];

		// Fetch all products
		const productsResponse = await client
			.get('products?limit=100')
			.json<{ data: Product[]; pagination: any }>();
		const allProducts = productsResponse.data || [];

		// Filter orders by date range
		const filteredOrders = allOrders.filter((order) => {
			const orderDate = new Date(order.created_at).toISOString().split('T')[0];
			return orderDate >= dateFrom && orderDate <= dateTo;
		});

		// === Calculate Statistics ===

		// 1. Summary stats
		const totalOrders = filteredOrders.length;
		const paidOrders = filteredOrders.filter((o) => o.status === 'paid');
		const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
		const averageOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

		// 2. Order status distribution
		const statusCounts = filteredOrders.reduce(
			(acc, order) => {
				acc[order.status] = (acc[order.status] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		const statusLabels: Record<string, string> = {
			pending: 'Chờ xử lý',
			paid: 'Đã thanh toán',
			shipped: 'Đang giao',
			delivered: 'Đã giao',
			cancelled: 'Đã hủy',
		};

		const orderStatusData = Object.entries(statusCounts).map(([status, count]) => ({
			status,
			count,
			label: statusLabels[status] || status,
		}));

		// 3. Revenue by date (for line chart)
		const revenueByDate = filteredOrders
			.filter((o) => o.status === 'paid')
			.reduce(
				(acc, order) => {
					const date = new Date(order.created_at).toISOString().split('T')[0];
					acc[date] = (acc[date] || 0) + Number(order.total_amount || 0);
					return acc;
				},
				{} as Record<string, number>,
			);

		const revenueData = Object.entries(revenueByDate)
			.map(([date, revenue]) => ({ date, revenue }))
			.sort((a, b) => a.date.localeCompare(b.date));

		// 4. Orders and revenue trend by date
		const trendByDate = filteredOrders.reduce(
			(acc, order) => {
				const date = new Date(order.created_at).toISOString().split('T')[0];
				if (!acc[date]) {
					acc[date] = { orders: 0, revenue: 0 };
				}
				acc[date].orders += 1;
				if (order.status === 'paid') {
					acc[date].revenue += Number(order.total_amount || 0);
				}
				return acc;
			},
			{} as Record<string, { orders: number; revenue: number }>,
		);

		const trendData = Object.entries(trendByDate)
			.map(([date, data]) => ({ date, ...data }))
			.sort((a, b) => a.date.localeCompare(b.date));

		// 5. Top products by sales (need to fetch order items)
		const productSales: Record<string, { name: string; sold: number; revenue: number }> = {};

		// Fetch items for paid orders to calculate top products
		await Promise.all(
			paidOrders.slice(0, 50).map(async (order) => {
				try {
					const itemsResponse = await client
						.get(`orders/${order.id}/items`)
						.json<{ items: OrderItem[] }>();
					const items = itemsResponse.items || [];

					items.forEach((item) => {
						const productId = item.product_id;
						let productName = 'Sản phẩm';

						// Try to get name from snapshot
						if (typeof item.product_snapshot === 'string') {
							try {
								const snapshot = JSON.parse(item.product_snapshot);
								productName = snapshot.name || productName;
							} catch {
								/* ignore */
							}
						} else if (typeof item.product_snapshot === 'object' && item.product_snapshot) {
							productName = (item.product_snapshot as any).name || productName;
						}

						// Find in products list as fallback
						const product = allProducts.find((p) => p.id === productId);
						if (product) {
							productName = product.name;
						}

						if (!productSales[productId]) {
							productSales[productId] = { name: productName, sold: 0, revenue: 0 };
						}

						productSales[productId].sold += Number(item.quantity);
						productSales[productId].revenue += Number(item.quantity) * Number(item.price_per_item);
					});
				} catch (e) {
					// Ignore errors for individual orders
				}
			}),
		);

		const topProductsData = Object.values(productSales)
			.sort((a, b) => b.sold - a.sold)
			.slice(0, 10);

		// 6. Comparison with previous period
		const previousStartDate = new Date(dateFrom);
		const previousEndDate = new Date(dateTo);
		const periodDays = Math.ceil(
			(new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24),
		);
		previousStartDate.setDate(previousStartDate.getDate() - periodDays);
		previousEndDate.setDate(previousEndDate.getDate() - periodDays);

		const previousOrders = allOrders.filter((order) => {
			const orderDate = new Date(order.created_at).toISOString().split('T')[0];
			return (
				orderDate >= previousStartDate.toISOString().split('T')[0] &&
				orderDate <= previousEndDate.toISOString().split('T')[0]
			);
		});

		const previousRevenue = previousOrders
			.filter((o) => o.status === 'paid')
			.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

		const revenueGrowth =
			previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

		const ordersGrowth =
			previousOrders.length > 0
				? ((filteredOrders.length - previousOrders.length) / previousOrders.length) * 100
				: 0;

		return {
			dateRange: { from: dateFrom, to: dateTo },
			summary: {
				totalOrders,
				totalRevenue,
				averageOrderValue,
				paidOrdersCount: paidOrders.length,
				revenueGrowth,
				ordersGrowth,
			},
			charts: {
				orderStatus: orderStatusData,
				revenue: revenueData,
				trend: trendData,
				topProducts: topProductsData,
			},
		};
	} catch (err) {
		console.error('Error loading statistics:', err);
		return {
			dateRange: { from: dateFrom, to: dateTo },
			summary: {
				totalOrders: 0,
				totalRevenue: 0,
				averageOrderValue: 0,
				paidOrdersCount: 0,
				revenueGrowth: 0,
				ordersGrowth: 0,
			},
			charts: {
				orderStatus: [],
				revenue: [],
				trend: [],
				topProducts: [],
			},
		};
	}
};
