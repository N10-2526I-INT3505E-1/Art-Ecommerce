import { desc, eq } from 'drizzle-orm';
import { BadRequestError, InternalServerError, NotFoundError } from '../common/errors/httpErrors';
import type { db } from './db';
import { ordersTable } from './order.model';
import { orderItemsTable } from './order_item.model';
import { randomUUIDv7 } from 'bun';
import { UserAddressSchema } from './order.model';

// URL của Payment Service (Lấy từ .env hoặc mặc định)
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:4002';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:4003';
export type NewOrder = typeof ordersTable.$inferInsert;
export type NewOrderItem = typeof orderItemsTable.$inferInsert;

// Interface cho kết quả trả về từ Payment Service
export interface PaymentLinkResponse {
	id: string;
	order_id: string;
	amount: string | number;
	payment_gateway: string;
	status: string;
	paymentUrl: string;
}

type DrizzleDB = typeof db;

export class OrderService {
	constructor(private readonly database: DrizzleDB) {}

	// Helper: Parse shipping address from storage (string) to object if valid JSON
	private parseShippingAddress(addressData: string | any): string | any {
		if (typeof addressData === 'string') {
			try {
				// Try to parse as JSON
				return JSON.parse(addressData);
			} catch {
				// If not JSON, return as plain string
				return addressData;
			}
		}
		return addressData;
	}

	// Helper: Convert shipping address to storage format (always string)
	private serializeShippingAddress(address: string | any): string {
		if (typeof address === 'string') {
			return address;
		}
		return JSON.stringify(address);
	}

	// 1. Create Order
	async createOrder(data: NewOrder) {
		try {
			const orderData = { ...data };
			const shipping_address = data.shipping_address;

			// Validate address (works for both string and object)
			const addressErrors = validateAddress(shipping_address);
			if (Object.keys(addressErrors).length > 0) {
				throw new BadRequestError(String(JSON.stringify(addressErrors)));
			}

			// Convert to storage format (string)
			orderData.shipping_address = this.serializeShippingAddress(shipping_address);

			orderData.id = randomUUIDv7();
			const [newOrder] = await this.database.insert(ordersTable).values(orderData).returning();
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
	async getOrderById(id: string) {
		const [order] = await this.database.select().from(ordersTable).where(eq(ordersTable.id, id));

		if (!order) {
			throw new NotFoundError(`Không tìm thấy đơn hàng với ID: ${id}`);
		}
		return order;
	}

	// 4. Update Order
	async updateOrder(id: string, data: Partial<NewOrder>) {
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
	async deleteOrder(id: string) {
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
		orderId: string,
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
	async getOrderItems(orderId: string) {
		const items = await this.database
			.select()
			.from(orderItemsTable)
			.where(eq(orderItemsTable.order_id, orderId));

		return items;
	}

	// 8. Create Payment Link (Gọi sang Payment Service)
	async createPaymentLink(
		orderId: string,
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
					'Content-Type': 'application/json',
					'x-internal-secret': process.env.INTERNAL_HEADER_SECRET || '',
				},
				body: JSON.stringify({
					order_id: order.id,
					amount: Number(order.total_amount),
					payment_gateway: gateway,
				}),
			});

			if (!response.ok) {
				const errorData = response.json().catch(() => ({}));
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
	async getProductDetails(
		productId: string,
	): Promise<{ price: number; name: string; id: string; imageUrl: string }> {
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
				// Map đúng trường ảnh từ Product Service (thường là imageUrl hoặc image)
				imageUrl: product.imageUrl || product.image || '',
			};
		} catch (error) {
			console.error(`Failed to fetch product ${productId}:`, error);
			if (error instanceof Error && (error as any).status) throw error;
			throw new InternalServerError(`Không thể lấy thông tin sản phẩm ${productId}.`);
		}
	}

	// 11. Calculate Total Amount from Order Items
	async calculateTotalAmount(items: Array<{ product_id: string; quantity: number }>): Promise<{
		total: number;
		// Trả về map để dễ lookup: { "productId": { name, price, imageUrl } }
		productMap: Record<string, { name: string; price: number; imageUrl: string }>;
	}> {
		let total = 0;
		const productMap: Record<string, { name: string; price: number; imageUrl: string }> = {};

		try {
			// Dùng Promise.all để fetch song song cho nhanh
			await Promise.all(
				items.map(async (item) => {
					const product = await this.getProductDetails(item.product_id);
					const itemTotal = product.price * item.quantity;

					// Cộng dồn tổng tiền (Mutex không cần thiết vì Node là single thread event loop ở đây)
					total += itemTotal;

					// Lưu info sản phẩm để tí nữa dùng tạo snapshot
					productMap[item.product_id] = {
						name: product.name,
						price: product.price,
						imageUrl: product.imageUrl,
					};
				}),
			);

			return { total, productMap };
		} catch (error) {
			console.error('Calculate Total Amount Error:', error);
			if (error instanceof Error && (error as any).status) throw error;
			throw new InternalServerError('Lỗi khi tính tổng tiền đơn hàng.');
		}
	}

	// 12. Create Payment and Get Payment URL
	async createPaymentAndGetUrl(orderId: string, gateway: string = 'vnpay'): Promise<string> {
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
// Validate User Address Object
const validateAddress = (shipping_address: any) => {
	const errors: Record<string, string> = {};

	// If it's a string, just check length
	if (typeof shipping_address === 'string') {
		if (shipping_address.length < 5) {
			errors.shipping_address = 'Address string must be at least 5 characters';
		}
		return errors;
	}

	// If it's an object, validate all fields
	if (typeof shipping_address !== 'object' || shipping_address === null) {
		errors.shipping_address = 'Address must be a string or object';
		return errors;
	}

	// 1. Validate Address (String, min 5, max 255)
	if (typeof shipping_address.address !== 'string') {
		errors.address = 'Address must be a string';
	} else if (shipping_address.address.length < 5 || shipping_address.address.length > 255) {
		errors.address = 'Address must be between 5 and 255 characters';
	}

	// 2. Validate Phone (String, pattern: 9-11 digits)
	const phoneRegex = /^[0-9]{9,11}$/;
	if (typeof shipping_address.phone !== 'string') {
		errors.phone = 'Phone must be a string';
	} else if (!phoneRegex.test(shipping_address.phone)) {
		errors.phone = 'Phone must be 9-11 digits';
	}

	// 3. Validate Ward (String, max 100)
	if (typeof shipping_address.ward !== 'string') {
		errors.ward = 'Ward must be a string';
	} else if (shipping_address.ward.length > 100) {
		errors.ward = 'Ward cannot exceed 100 characters';
	}

	// 4. Validate State (String, max 100)
	if (typeof shipping_address.state !== 'string') {
		errors.state = 'State must be a string';
	} else if (shipping_address.state.length > 100) {
		errors.state = 'State cannot exceed 100 characters';
	}

	// 5. Validate Postal Code (Optional, String max 20 OR Null)
	if (shipping_address.postal_code !== undefined && shipping_address.postal_code !== null) {
		if (typeof shipping_address.postal_code !== 'string') {
			errors.postal_code = 'Postal code must be a string';
		} else if (shipping_address.postal_code.length > 20) {
			errors.postal_code = 'Postal code cannot exceed 20 characters';
		}
	}

	// 6. Validate Country (String, max 100)
	if (typeof shipping_address.country !== 'string') {
		errors.country = 'Country must be a string';
	} else if (shipping_address.country.length > 100) {
		errors.country = 'Country cannot exceed 100 characters';
	}

	// 7. Validate is_default (Optional, Integer: 0 or 1)
	if (shipping_address.is_default !== undefined) {
		if (!Number.isInteger(shipping_address.is_default)) {
			errors.is_default = 'is_default must be an integer';
		} else if (shipping_address.is_default !== 0 && shipping_address.is_default !== 1) {
			errors.is_default = 'is_default must be 0 or 1';
		}
	}

	return errors;
};
