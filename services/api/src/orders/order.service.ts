import { eq } from 'drizzle-orm';
import { InternalServerError, NotFoundError } from '../common/errors/httpErrors';
import type { db } from './db'; 
import { ordersTable } from './order.model';
import { orderItemsTable } from './order_item.model';

export type NewOrder = typeof ordersTable.$inferInsert;
export type NewOrderItem = typeof orderItemsTable.$inferInsert;

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

  // 2. Get All Orders
  async getAllOrders() {
    return await this.database.select().from(ordersTable);
  }

  // 3. Get Order By ID
  async getOrderById(id: number) {
    const [order] = await this.database
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id));
    
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

  // 6. Add Item
  async addItemToOrder(orderId: number, data: Omit<NewOrderItem, 'id' | 'order_id' | 'product_snapshot'> & { product_snapshot?: any }) {
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

  // 7. Get Items
  async getOrderItems(orderId: number) {
    const items = await this.database
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, orderId));
    
    return items.map((it) => ({
      ...it,
      product_snapshot: (it.product_snapshot && it.product_snapshot !== '{}') 
        ? JSON.parse(it.product_snapshot) 
        : null,
    }));
  }
}
