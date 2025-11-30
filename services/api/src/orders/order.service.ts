import { eq } from 'drizzle-orm';
import { db } from './db';
import { ordersTable } from './order.model';
import { orderItemsTable } from './order_item.model';

export type NewOrder = typeof ordersTable.$inferInsert;
export type NewOrderItem = typeof orderItemsTable.$inferInsert;

export const OrderService = {
  // Tạo đơn hàng
  createOrder: async (data: NewOrder) => {
    const [newOrder] = await db.insert(ordersTable).values(data).returning();
    return newOrder;
  },

  // Lấy tất cả đơn hàng
  getAllOrders: async () => {
    return await db.select().from(ordersTable);
  },

  // Lấy đơn hàng theo ID
  getOrderById: async (id: number) => {
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id));
    return order;
  },

  // Cập nhật đơn hàng
  updateOrder: async (id: number, data: Partial<NewOrder>) => {
    const [updated] = await db
      .update(ordersTable)
      .set(data)
      .where(eq(ordersTable.id, id))
      .returning();
    return updated;
  },

  // Xóa đơn hàng
  deleteOrder: async (id: number) => {
    const [deleted] = await db
      .delete(ordersTable)
      .where(eq(ordersTable.id, id))
      .returning();
    return deleted;
  },

  // Thêm sản phẩm vào đơn hàng
  // 'Omit' giúp loại bỏ các trường tự động sinh ra như id
  addItemToOrder: async (orderId: number, data: Omit<NewOrderItem, 'id' | 'order_id' | 'product_snapshot'> & { product_snapshot?: any }) => {
    const snapshot = data.product_snapshot
      ? JSON.stringify(data.product_snapshot)
      : JSON.stringify({});

    const toInsert: NewOrderItem = {
      order_id: orderId,
      product_id: data.product_id,
      quantity: data.quantity,
      price_per_item: data.price_per_item,
      product_snapshot: snapshot,
      // Nếu có các trường optional khác thì thêm vào đây
    };

    const [newItem] = await db.insert(orderItemsTable).values(toInsert).returning();
    return newItem;
  },

  // Lấy danh sách sản phẩm trong đơn
  getOrderItems: async (orderId: number) => {
    const items = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, orderId));
    
    return items.map((it) => ({
      ...it,
      // Kiểm tra kỹ null/undefined trước khi parse để tránh crash server
      product_snapshot: (it.product_snapshot && it.product_snapshot !== '{}') 
        ? JSON.parse(it.product_snapshot) 
        : null,
    }));
  },
};