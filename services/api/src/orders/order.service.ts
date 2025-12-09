import { desc, eq } from 'drizzle-orm';
import { BadRequestError, InternalServerError, NotFoundError } from '../common/errors/httpErrors';
import type { db } from './db';
import { ordersTable } from './order.model';
import { orderItemsTable } from './order_item.model';

// URL của Payment Service (Lấy từ .env hoặc mặc định)
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:4003';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:4002';
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
				query = query.where(eq(ordersTable.user_id, userId));
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
			const response = await fetch(`${PAYMENT_SERVICE_URL}/payments`, {
				method: 'POST',
				headers: { 
					'Content-Type': 'application/json',	'x-internal-secret': process.env.INTERNAL_HEADER_SECRET || '' },
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

	// 10. Fetch Product Details from Product Service
	async getProductDetails(productId: string): Promise<{ price: number; name: string; id: string }> {
		try {
			const response = await fetch(`${PRODUCT_SERVICE_URL}/products/${productId}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.error('Product Service Error:', errorData);
				throw new InternalServerError(
					`Lỗi từ Product Service khi lấy sản phẩm ${productId}: ${JSON.stringify(errorData)}`,
				);
			}

			const product = (await response.json()) as any;
			return {
				id: product.id,
				name: product.name,
				price: Number(product.price),
			};
		} catch (error) {
			console.log(PRODUCT_SERVICE_URL);
			console.error(`Failed to fetch product ${productId}:`, error);
			if (error instanceof Error && (error as any).status) throw error;
			throw new InternalServerError(`Không thể lấy thông tin sản phẩm ${productId} từ dịch vụ.`);
		}
	}

	// 11. Calculate Total Amount from Order Items
	async calculateTotalAmount(
		items: Array<{ product_id: string; quantity: number }>,
	): Promise<{ total: number; itemDetails: Array<{ product_id: string; quantity: number; price: number }> }> {
		let total = 0;
		const itemDetails: Array<{ product_id: string; quantity: number; price: number }> = [];

		try {
			for (const item of items) {
				const product = await this.getProductDetails(item.product_id);
				const itemTotal = product.price * item.quantity;
				total += itemTotal;
				itemDetails.push({
					product_id: item.product_id,
					quantity: item.quantity,
					price: product.price,
				});
			}

			return { total, itemDetails };
		} catch (error) {
			console.error('Calculate Total Amount Error:', error);
			if (error instanceof Error && (error as any).status) throw error;
			throw new InternalServerError('Lỗi khi tính tổng tiền đơn hàng.');
		}
	}

	// 12. Create Payment and Get Payment URL
	async createPaymentAndGetUrl(orderId: number, gateway: string = 'vnpay'): Promise<string> {
		try {
			const paymentData = await this.createPaymentLink(orderId, gateway);
			return paymentData.paymentUrl;
		} catch (error) {
			console.error('Create Payment and Get URL Error:', error);
			if (error instanceof Error && (error as any).status) throw error;
			throw new InternalServerError('Lỗi khi tạo liên kết thanh toán.');
		}
	}
}
