import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from './db';
import {
  ordersTable,
  CreateOrderSchema,
  OrderResponseSchema,
} from './order.model';
import {
  orderItemsTable,
  CreateOrderItemSchema,
  OrderItemResponseSchema,
} from './order_item.model';

const ErrorSchema = t.Object({ message: t.String() });

export const ordersPlugin = new Elysia({ prefix: '/api' })
  .decorate('db', db)
  .group('/orders', (app) =>
    app
      // create order
      .post(
        '/',
        async ({ body, set, db }) => {
          const [newOrder] = await db.insert(ordersTable).values(body).returning();
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
        async ({ db }) => {
          const orders = await db.select().from(ordersTable);
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
        async ({ params, db, set }) => {
          const [order] = await db
            .select()
            .from(ordersTable)
            .where(eq(ordersTable.id, Number(params.id)));
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
        async ({ params, body, set, db }) => {
          const [updated] = await db
            .update(ordersTable)
            .set(body as any) 
            .where(eq(ordersTable.id, Number(params.id)))
            .returning();
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
        async ({ params, db, set }) => {
          const [deleted] = await db
            .delete(ordersTable)
            .where(eq(ordersTable.id, Number(params.id)))
            .returning();
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
            async ({ params, body, set, db }) => {
              const snapshot = body.product_snapshot
                ? JSON.stringify(body.product_snapshot)
                : JSON.stringify({}); 
              const toInsert = {
                order_id: Number(params.orderId),
                product_id: body.product_id,
                quantity: body.quantity,
                price_per_item: body.price_per_item, 
                product_snapshot: snapshot,
              };
              const [newItem] = await db.insert(orderItemsTable).values(toInsert).returning();
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
            async ({ params, db }) => {
              const items = await db
                .select()
                .from(orderItemsTable)
                .where(eq(orderItemsTable.order_id, Number(params.orderId)));
              const parsed = items.map((it) => ({
                ...it,
                product_snapshot: it.product_snapshot ? JSON.parse(it.product_snapshot) : null,
              }));
              return { items: parsed };
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
