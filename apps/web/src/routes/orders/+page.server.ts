import { redirect } from '@sveltejs/kit';
import { api } from '$lib/server/http';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch, request }) => {
	// 1. Kiểm tra đăng nhập
	if (!locals.user) {
		throw redirect(302, '/login?redirect=/orders');
	}

	const client = api({ fetch, request });

	try {
		// 2. Lấy danh sách đơn hàng
		const { orders } = await client.get('orders/me').json<{ orders: any[] }>();

		if (!orders || orders.length === 0) {
			return { orders: [] };
		}

		// 3. Xử lý dữ liệu chi tiết (Items & Parsing)
		const ordersWithDetails = await Promise.all(
			orders.map(async (order) => {
				let items = [];

				try {
					// Gọi API lấy items chi tiết
					const resItems = await client.get(`orders/${order.id}/items`).json<{ items: any[] }>();
					items = resItems.items || [];
				} catch (e) {
					console.error(`Không thể lấy items cho đơn ${order.id}`, e);
				}

				// Map và Parse Items
				const mappedItems = items.map((item: any) => {
					let snapshot: any = {};

					// Parse product_snapshot (Lưu ý: DB lưu là string JSON)
					if (typeof item.product_snapshot === 'string') {
						try {
							snapshot = JSON.parse(item.product_snapshot);
						} catch {
							/* Ignore parse error */
						}
					} else if (typeof item.product_snapshot === 'object') {
						snapshot = item.product_snapshot;
					}

					return {
						id: item.id,
						product_id: item.product_id,
						// Ưu tiên lấy tên/ảnh từ snapshot (dữ liệu lịch sử), fallback sang placeholder
						name: snapshot?.name || snapshot?.title || 'Sản phẩm',
						image: snapshot?.image || snapshot?.imageUrl || '/images/placeholder.webp',
						quantity: Number(item.quantity),
						price: Number(item.price_per_item), // API trả về string numeric
						reviewed: false, // Logic này cần mở rộng sau
					};
				});

				// Parse Shipping Address
				let formattedAddress = order.shipping_address;
				if (typeof order.shipping_address === 'string' && order.shipping_address.startsWith('{')) {
					try {
						const addrObj = JSON.parse(order.shipping_address);
						// Format lại thành chuỗi dễ đọc
						formattedAddress = `${addrObj.address}, ${addrObj.ward}, ${addrObj.state}`;
					} catch {
						// Nếu parse lỗi, giữ nguyên string gốc
					}
				}

				return {
					...order,
					id: order.id, // UUID string
					total_amount: Number(order.total_amount),
					subtotal: Number(order.total_amount), // Tạm tính = Tổng (trừ khi có logic phí ship riêng)
					shipping_address: formattedAddress,
					items: mappedItems,
				};
			}),
		);

		// Sắp xếp: Mới nhất lên đầu
		ordersWithDetails.sort(
			(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		);

		return {
			orders: ordersWithDetails,
		};
	} catch (err) {
		console.error('Lỗi tải danh sách đơn hàng:', err);
		return { orders: [] };
	}
};
