import { api } from '$lib/server/http';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

interface UserInfo {
	id: string;
	username: string;
	first_name: string;
	last_name: string;
	email: string;
}

export const load: PageServerLoad = async ({ fetch, request, url }) => {
	const client = api({ fetch, request });

	const page = Number(url.searchParams.get('page') || '1');
	const limit = Number(url.searchParams.get('limit') || '10');
	const status = url.searchParams.get('status') || '';
	const search = url.searchParams.get('search') || '';

	let orders: any[] = [];
	let totalOrders = 0;

	try {
		// Fetch all orders (for operators and managers)
		const ordersResponse = await client.get('orders').json<{ orders: any[] }>();
		let allOrders = ordersResponse.orders || [];

		// Apply filters
		if (status) {
			allOrders = allOrders.filter((o: any) => o.status === status);
		}
		if (search) {
			const searchLower = search.toLowerCase();
			allOrders = allOrders.filter(
				(o: any) =>
					o.id.toLowerCase().includes(searchLower) ||
					o.user_id?.toLowerCase().includes(searchLower),
			);
		}

		// Calculate pagination
		totalOrders = allOrders.length;
		const totalPages = Math.ceil(totalOrders / limit);
		const offset = (page - 1) * limit;

		// Paginate
		const paginatedOrders = allOrders.slice(offset, offset + limit);

		// Get unique user IDs from paginated orders
		const uniqueUserIds = [...new Set(paginatedOrders.map((o: any) => o.user_id).filter(Boolean))];

		// Fetch user information for all unique users
		const userMap: Record<string, UserInfo> = {};
		await Promise.all(
			uniqueUserIds.map(async (userId: string) => {
				try {
					const userResponse = await client.get(`users/${userId}`).json<{ user: UserInfo }>();
					userMap[userId] = userResponse.user;
				} catch (e) {
					console.error(`Không thể lấy thông tin user ${userId}`, e);
					// Set default user info if fetch fails
					userMap[userId] = {
						id: userId,
						username: 'N/A',
						first_name: '',
						last_name: '',
						email: '',
					};
				}
			}),
		);

		// Fetch order items for paginated orders only
		const ordersWithDetails = await Promise.all(
			paginatedOrders.map(async (order: any) => {
				let items: any[] = [];
				try {
					const itemsResponse = await client
						.get(`orders/${order.id}/items`)
						.json<{ items: any[] }>();
					items = itemsResponse.items || [];
				} catch (e) {
					console.error(`Không thể lấy items cho đơn ${order.id}`, e);
				}

				// Parse items
				const mappedItems = items.map((item: any) => {
					let snapshot: any = {};
					if (typeof item.product_snapshot === 'string') {
						try {
							snapshot = JSON.parse(item.product_snapshot);
						} catch {
							/* ignore */
						}
					} else if (typeof item.product_snapshot === 'object') {
						snapshot = item.product_snapshot;
					}

					return {
						id: item.id,
						product_id: item.product_id,
						name: snapshot?.name || 'Sản phẩm',
						image: snapshot?.image || snapshot?.imageUrl || '/images/placeholder.webp',
						quantity: Number(item.quantity),
						price: Number(item.price_per_item),
					};
				});

				// Parse shipping address
				let formattedAddress = order.shipping_address;
				if (typeof order.shipping_address === 'string' && order.shipping_address.startsWith('{')) {
					try {
						const addrObj = JSON.parse(order.shipping_address);
						formattedAddress = `${addrObj.address}, ${addrObj.ward}, ${addrObj.state}`;
					} catch {
						/* keep original */
					}
				}

				// Get user info from map
				const userInfo = userMap[order.user_id] || {
					id: order.user_id,
					username: 'N/A',
					first_name: '',
					last_name: '',
					email: '',
				};

				return {
					...order,
					total_amount: Number(order.total_amount),
					shipping_address: formattedAddress,
					items: mappedItems,
					itemCount: mappedItems.length,
					// Add user information
					user_name: `${userInfo.first_name} ${userInfo.last_name}`.trim() || 'N/A',
					user_username: userInfo.username || 'N/A',
					user_email: userInfo.email || '',
				};
			}),
		);

		return {
			orders: ordersWithDetails,
			pagination: {
				page,
				limit,
				total: totalOrders,
				totalPages,
			},
			filters: { status, search },
		};
	} catch (err) {
		console.error('Lỗi khi tải đơn hàng:', err);
		return {
			orders: [],
			pagination: {
				page: 1,
				limit: 10,
				total: 0,
				totalPages: 1,
			},
			filters: { status: '', search: '' },
		};
	}
};

export const actions: Actions = {
	updateStatus: async ({ request, fetch }) => {
		const client = api({ fetch, request });
		const formData = await request.formData();

		const id = formData.get('id') as string;
		const status = formData.get('status') as string;

		if (!id || !status) {
			return fail(400, { error: 'ID và trạng thái là bắt buộc' });
		}

		try {
			await client
				.patch(`orders/${id}`, {
					json: { status },
				})
				.json();

			return { success: true, message: 'Cập nhật trạng thái thành công' };
		} catch (err: any) {
			console.error('Lỗi cập nhật trạng thái:', err);
			return fail(500, { error: 'Không thể cập nhật trạng thái đơn hàng' });
		}
	},

	delete: async ({ request, fetch }) => {
		const client = api({ fetch, request });
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'ID đơn hàng là bắt buộc' });
		}

		try {
			await client.delete(`orders/${id}`).json();
			return { success: true, message: 'Xóa đơn hàng thành công' };
		} catch (err: any) {
			console.error('Lỗi xóa đơn hàng:', err);
			return fail(500, { error: 'Không thể xóa đơn hàng' });
		}
	},
};
