import { Elysia, t } from 'elysia';
import {
  CreateOrderSchema,
  OrderResponseSchema,
} from './order.model';
import { OrderService } from './order.service';
import {
  CreateOrderItemSchema,
  OrderItemResponseSchema,
} from './order_item.model';

export const ordersPlugin = new Elysia({ prefix: '/api' })
  .group('/orders', (app) =>
    app
      // 1. Create Order
      .post(
        '/',
        async ({ body, set }) => {
          const newOrder = await OrderService.createOrder(body as any);
          set.status = 201;
          return { order: newOrder };
        },
        {
          body: t.Omit(CreateOrderSchema, ['id', 'created_at', 'updated_at']),
          response: {
            201: t.Object({ order: OrderResponseSchema }),
          },
          detail: { tags: ['Orders'], summary: 'Create a new order' },
        },
      )

      // 2. Get All Orders
      .get(
        '/',
        async () => {
          const orders = await OrderService.getAllOrders();
          return { orders };
        },
        {
          response: { 200: t.Object({ orders: t.Array(OrderResponseSchema) }) },
          detail: { tags: ['Orders'], summary: 'Get all orders' },
        },
      )

      // 3. Get Order By ID
      .get(
        '/:id',
        async ({ params }) => {
          // Nếu không tìm thấy, Service ném NotFoundError -> Global Handler bắt -> trả về 404 JSON
          const order = await OrderService.getOrderById(Number(params.id));
          return { order };
        },
        {
          params: t.Object({ id: t.Numeric() }),
          response: {
            200: t.Object({ order: OrderResponseSchema }),
          },
          detail: { tags: ['Orders'], summary: 'Get order by ID' },
        },
      )

      // 4. Update Order
      .patch(
        '/:id',
        async ({ params, body }) => {
          const updated = await OrderService.updateOrder(Number(params.id), body as any);
          return { order: updated };
        },
        {
          params: t.Object({ id: t.Numeric() }),
          body: t.Partial(t.Omit(CreateOrderSchema, ['id', 'created_at', 'updated_at'])),
          response: {
            200: t.Object({ order: OrderResponseSchema }),
          },
          detail: { tags: ['Orders'], summary: 'Update an order' },
        },
      )

      // 5. Delete Order
      .delete(
        '/:id',
        async ({ params }) => {
          await OrderService.deleteOrder(Number(params.id));
          return { message: `Đã xóa đơn hàng ID ${params.id}.` };
        },
        {
          params: t.Object({ id: t.Numeric() }),
          response: { 200: t.Object({ message: t.String() }) },
          detail: { tags: ['Orders'], summary: 'Delete an order' },
        },
      )

      // 6. Nested Items Route
      .group('/:orderId/items', (items) =>
        items
          .post(
            '/',
            async ({ params, body, set }) => {
              const newItem = await OrderService.addItemToOrder(Number(params.orderId), body);
              set.status = 201;
              return { item: newItem };
            },
            {
              params: t.Object({ orderId: t.Numeric() }),
              body: t.Omit(CreateOrderItemSchema, ['id', 'order_id']),
              response: {
                201: t.Object({ item: OrderItemResponseSchema }),
              },
              detail: { tags: ['Order Items'], summary: 'Add an item to order' },
            },
          )

          .get(
            '/',
            async ({ params }) => {
              const items = await OrderService.getOrderItems(Number(params.orderId));
              return { items };
            },
            {
              params: t.Object({ orderId: t.Numeric() }),
              response: {
                200: t.Object({ items: t.Array(OrderItemResponseSchema) }),
              },
              detail: { tags: ['Order Items'], summary: 'Get all items of an order' },
            },
          ),
      ),
  );