import { eq } from 'drizzle-orm';
import { InternalServerError, NotFoundError } from '../common/errors/httpErrors';
import { db } from './db';
import { ordersTable } from './order.model';
import { orderItemsTable } from './order_item.model';

export type NewOrder = typeof ordersTable.$inferInsert;
export type NewOrderItem = typeof orderItemsTable.$inferInsert;

export const OrderService = {
  // 1. Tạo đơn hàng
  createOrder: async (data: NewOrder) => {
    try {
      const [newOrder] = await db.insert(ordersTable).values(data).returning();
      
      // Nếu insert trả về rỗng (hiếm khi xảy ra nhưng cứ check cho chắc)
      if (!newOrder) {
        throw new InternalServerError('Không thể tạo đơn hàng (Database Error).');
      }
      return newOrder;
    } catch (error) {
      // Nếu lỗi đã là HttpError thì ném tiếp ra ngoài cho errorHandler bắt
      if (error instanceof Error && error.name === 'HttpError') throw error;
      
      console.error('Create Order Error:', error);
      throw new InternalServerError('Lỗi hệ thống khi tạo đơn hàng.');
    }
  },

  // 2. Lấy tất cả
  getAllOrders: async () => {
    return await db.select().from(ordersTable);
  },

  // 3. Lấy theo ID (Có check 404)
  getOrderById: async (id: number) => {
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id));
    
    if (!order) {
      throw new NotFoundError(`Không tìm thấy đơn hàng với ID: ${id}`);
    }
    return order;
  },

  // 4. Update (Có check 404)
  updateOrder: async (id: number, data: Partial<NewOrder>) => {
    const [updated] = await db
      .update(ordersTable)
      .set(data)
      .where(eq(ordersTable.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError(`Không thể cập nhật. Đơn hàng ID ${id} không tồn tại.`);
    }
    return updated;
  },

  // 5. Delete (Có check 404)
  deleteOrder: async (id: number) => {
    const [deleted] = await db
      .delete(ordersTable)
      .where(eq(ordersTable.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundError(`Không thể xóa. Đơn hàng ID ${id} không tồn tại.`);
    }
    return deleted;
  },

  // 6. Thêm Item (Xử lý snapshot JSON)
  addItemToOrder: async (orderId: number, data: Omit<NewOrderItem, 'id' | 'order_id' | 'product_snapshot'> & { product_snapshot?: any }) => {
    // Logic xử lý JSON
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

    const [newItem] = await db.insert(orderItemsTable).values(toInsert).returning();

    if (!newItem) {
        throw new InternalServerError('Không thể thêm sản phẩm vào đơn hàng.');
    }
    return newItem;
  },

  // 7. Lấy Items
  getOrderItems: async (orderId: number) => {
    const items = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, orderId));
    
    return items.map((it) => ({
      ...it,
      product_snapshot: (it.product_snapshot && it.product_snapshot !== '{}') 
        ? JSON.parse(it.product_snapshot) 
        : null,
    }));
  },
};