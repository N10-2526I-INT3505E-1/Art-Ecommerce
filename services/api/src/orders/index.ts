import { Elysia, t } from 'elysia';
import { OrderService } from './order.service'; // Import service vừa tạo
import {
  CreateOrderSchema,
  OrderResponseSchema,
} from './order.model';
import {
  CreateOrderItemSchema,
  OrderItemResponseSchema,
} from './order_item.model';

const ErrorSchema = t.Object({ message: t.String() });

export const ordersPlugin = new Elysia({ prefix: '/api' })
  // Không cần decorate 'db' nữa vì Service đã tự lo rồi
  .group('/orders', (app) =>
    app
      // create order
      .post(
        '/',
        async ({ body, set }) => {
          const newOrder = await OrderService.createOrder(body as any);
          if (!newOrder) {
            set.status = 500;
            return { message: 'Failed to create order.' };
          }
          set.status = 201;
          return { order: newOrder };
        },
        {
          body: t.Omit(CreateOrderSchema, ['id', 'created_at', 'updated_at']),
          response: {
            201: t.Object({ order: OrderResponseSchema }),
            500: ErrorSchema,
          },
          detail: { tags: ['Orders'], summary: 'Create a new order' },
        },
      )

      // get all orders
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

      // get order by id
      .get(
        '/:id',
        async ({ params, set }) => {
          const order = await OrderService.getOrderById(Number(params.id));
          if (!order) {
            set.status = 404;
            return { message: 'Order not found.' };
          }
          return { order };
        },
        {
          params: t.Object({ id: t.Numeric() }),
          response: {
            200: t.Object({ order: OrderResponseSchema }),
            404: ErrorSchema,
          },
          detail: { tags: ['Orders'], summary: 'Get order by ID' },
        },
      )

      // update order (partial)
      .patch(
        '/:id',
        async ({ params, body, set }) => {
          const updated = await OrderService.updateOrder(Number(params.id), body as any);
          if (!updated) {
            set.status = 404;
            return { message: 'Order not found.' };
          }
          return { order: updated };
        },
        {
          params: t.Object({ id: t.Numeric() }),
          body: t.Partial(t.Omit(CreateOrderSchema, ['id', 'created_at', 'updated_at'])),
          response: {
            200: t.Object({ order: OrderResponseSchema }),
            404: ErrorSchema,
          },
          detail: { tags: ['Orders'], summary: 'Update an order' },
        },
      )

      // delete order
      .delete(
        '/:id',
        async ({ params, set }) => {
          const deleted = await OrderService.deleteOrder(Number(params.id));
          if (!deleted) {
            set.status = 404;
            return { message: 'Order not found.' };
          }
          return { message: `Order with ID ${params.id} deleted.` };
        },
        {
          params: t.Object({ id: t.Numeric() }),
          response: { 200: t.Object({ message: t.String() }), 404: ErrorSchema },
          detail: { tags: ['Orders'], summary: 'Delete an order' },
        },
      )

      // nested items group
      .group('/:orderId/items', (items) =>
        items
          // add item to order
          .post(
            '/',
            async ({ params, body, set }) => {
              const newItem = await OrderService.addItemToOrder(Number(params.orderId), body);
              
              if (!newItem) {
                set.status = 500;
                return { message: 'Failed to add item.' };
              }
              set.status = 201;
              return { item: newItem };
            },
            {
              params: t.Object({ orderId: t.Numeric() }),
              body: t.Omit(CreateOrderItemSchema, ['id', 'order_id']),
              response: {
                201: t.Object({ item: OrderItemResponseSchema }),
                500: ErrorSchema,
              },
              detail: { tags: ['Order Items'], summary: 'Add an item to order' },
            },
          )

          // get items of an order
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