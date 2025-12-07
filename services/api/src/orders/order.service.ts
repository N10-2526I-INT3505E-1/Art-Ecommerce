import { desc, eq } from 'drizzle-orm';
import { BadRequestError, InternalServerError, NotFoundError } from '../common/errors/httpErrors';
import type { db } from './db';
import { ordersTable } from './order.model';
import { orderItemsTable } from './order_item.model';

// URL của Payment Service (Lấy từ .env hoặc mặc định)
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:4003/api';

export type NewOrder = typeof ordersTable.$inferInsert;
export type NewOrderItem = typeof orderItemsTable.$inferInsert;

// Interface cho kết quả trả về từ Payment Service
export interface PaymentLinkResponse {
	id: number;
	order_id: number;
	amount: string | number;
	payment_gateway: string;
	status: string;
	transaction_id: string | null;
	paymentUrl: string;
}

type DrizzleDB = typeof db;

export class OrderService {
	constructor(private readonly database: DrizzleDB) {}

	// 1. Create Order
	async createOrder(data: NewOrder) {
		try {
			const [newOrder] = await this.database.insert(ordersTable).values(data).returning();

			if (!newOrder) {
				throw new InternalServerError('Không thể tạo đơn hàng (Database Error).');
			}
			return newOrder;
		} catch (error) {
			if (error instanceof Error && error.name === 'HttpError') throw error;
			console.error('Create Order Error:', error);
			throw new InternalServerError('Lỗi hệ thống khi tạo đơn hàng.');
		}
	}

	// 2. Get Orders (Hỗ trợ lọc theo User ID và sắp xếp)
	async getOrders(userId?: string) {
		try {
			// Khởi tạo query select
			let query = this.database.select().from(ordersTable).$dynamic();

			// Nếu có userId, thêm điều kiện WHERE
			if (userId) {
				// --- SỬA LỖI TẠI ĐÂY ---
				// Ép kiểu userId từ string sang Number vì trong DB user_id là số
				query = query.where(eq(ordersTable.user_id, Number(userId)));
			}

			// Luôn sắp xếp đơn mới nhất lên đầu (DESC)
			query = query.orderBy(desc(ordersTable.created_at));

			return await query;
		} catch (error) {
			console.error('Get Orders Error:', error);
			throw new InternalServerError('Không thể lấy danh sách đơn hàng.');
		}
	}

	// 3. Get Order By ID
	async getOrderById(id: number) {
		const [order] = await this.database.select().from(ordersTable).where(eq(ordersTable.id, id));

		if (!order) {
			throw new NotFoundError(`Không tìm thấy đơn hàng với ID: ${id}`);
		}
		return order;
	}

	// 4. Update Order
	async updateOrder(id: number, data: Partial<NewOrder>) {
		const [updated] = await this.database
			.update(ordersTable)
			.set(data)
			.where(eq(ordersTable.id, id))
			.returning();

		if (!updated) {
			throw new NotFoundError(`Không thể cập nhật. Đơn hàng ID ${id} không tồn tại.`);
		}
		return updated;
	}

	// 5. Delete Order
	async deleteOrder(id: number) {
		const [deleted] = await this.database
			.delete(ordersTable)
			.where(eq(ordersTable.id, id))
			.returning();

		if (!deleted) {
			throw new NotFoundError(`Không thể xóa. Đơn hàng ID ${id} không tồn tại.`);
		}
		return deleted;
	}

	// 6. Add Item to Order
	async addItemToOrder(
		orderId: number,
		data: Omit<NewOrderItem, 'id' | 'order_id' | 'product_snapshot'> & { product_snapshot?: any },
	) {
		const snapshot = data.product_snapshot
			? JSON.stringify(data.product_snapshot)
			: JSON.stringify({});

		const toInsert: NewOrderItem = {
			order_id: orderId,
			product_id: data.product_id,
			quantity: data.quantity,
			price_per_item: data.price_per_item,
			product_snapshot: snapshot,
		};

		const [newItem] = await this.database.insert(orderItemsTable).values(toInsert).returning();

		if (!newItem) {
			throw new InternalServerError('Không thể thêm sản phẩm vào đơn hàng.');
		}
		return newItem;
	}

	// 7. Get Order Items
	async getOrderItems(orderId: number) {
		const items = await this.database
			.select()
			.from(orderItemsTable)
			.where(eq(orderItemsTable.order_id, orderId));

		return items.map((it) => ({
			...it,
			product_snapshot:
				it.product_snapshot && it.product_snapshot !== '{}'
					? JSON.parse(it.product_snapshot)
					: null,
		}));
	}

	// 8. Create Payment Link (Gọi sang Payment Service)
	async createPaymentLink(
		orderId: number,
		gateway: string = 'vnpay',
	): Promise<PaymentLinkResponse> {
		const order = await this.getOrderById(orderId);

		if (order.status === 'paid') {
			throw new BadRequestError('Đơn hàng này đã được thanh toán.');
		}
		if (order.status === 'cancelled') {
			throw new BadRequestError('Đơn hàng đã bị hủy, không thể thanh toán.');
		}

		try {
			console.log(`Calling Payment Service at: ${PAYMENT_SERVICE_URL}/payments`);

			const response = await fetch(`${PAYMENT_SERVICE_URL}/payments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					order_id: order.id,
					amount: Number(order.total_amount),
					payment_gateway: gateway,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.error('Payment Service Error:', errorData);
				throw new InternalServerError(`Lỗi từ Payment Service: ${JSON.stringify(errorData)}`);
			}

			const paymentData = (await response.json()) as PaymentLinkResponse;
			return paymentData;
		} catch (error) {
			console.error('Call Payment Service Failed:', error);
			if (error instanceof Error && (error as any).status) throw error;
			throw new InternalServerError('Lỗi kết nối đến dịch vụ thanh toán.');
		}
	}

	// 9. Get all Orders (without filtering)
	async getAllOrders() {
		try {
			const orders = await this.database
				.select()
				.from(ordersTable)
				.orderBy(desc(ordersTable.created_at));
			return orders;
		} catch (error) {
			console.error('Get All Orders Error:', error);
			throw new InternalServerError('Không thể lấy danh sách đơn hàng.');
		}
	}
}
