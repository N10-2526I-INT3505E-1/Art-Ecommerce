import { Elysia, t } from 'elysia';
import { CreateOrderSchema, OrderResponseSchema } from './order.model';
import type { OrderService } from './order.service';
import { CreateOrderItemSchema, OrderItemResponseSchema } from './order_item.model';

export const ordersPlugin = (dependencies: { orderService: OrderService }) =>
	new Elysia({ name: 'orders-plugin' })
		.decorate('orderService', dependencies.orderService)
		// 1. Create Order
		.post(
			'/',
			async ({ body, set, orderService }) => {
				const newOrder = await orderService.createOrder(body);
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

		// 2. Get Orders (All or Filter by User ID)
		.get(
			'/',
			async ({ query, orderService }) => {
				// Truyền user_id vào hàm getOrders (nếu có)
				const orders = await orderService.getOrders(query.user_id);
				return { orders };
			},
			{
				// Khai báo Query param user_id là optional string
				query: t.Object({
					user_id: t.Optional(t.String()),
				}),
				response: { 200: t.Object({ orders: t.Array(OrderResponseSchema) }) },
				detail: { tags: ['Orders'], summary: 'Get orders list (filter by user_id)' },
			},
		)

		// 3. Get Order By ID
		.get(
			'/:id',
			async ({ params, orderService }) => {
				const order = await orderService.getOrderById(Number(params.id));
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
			async ({ params, body, orderService }) => {
				const updated = await orderService.updateOrder(Number(params.id), body as any);
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
			async ({ params, set, orderService }) => {
				await orderService.deleteOrder(Number(params.id));
				set.status = 204;
				return;
			},
			{
				params: t.Object({ id: t.Numeric() }),
				response: {
					204: t.Void(),
					404: t.Object({ message: t.String() }),
				},
				detail: { tags: ['Orders'], summary: 'Delete an order' },
			},
		)

		// 6. Create Payment Link
		.post(
			'/payment-url',
			async ({ body, set, orderService }) => {
				const result = await orderService.createPaymentLink(body.order_id, body.payment_gateway);
				set.status = 200;
				return result;
			},
			{
				body: t.Object({
					order_id: t.Numeric(),
					payment_gateway: t.Optional(t.String({ default: 'vnpay' })),
				}),
				// Schema response dựa trên data trả về từ Payment Service
				response: {
					200: t.Object({
						id: t.Integer(),
						order_id: t.Integer(),
						amount: t.Any(),
						payment_gateway: t.String(),
						status: t.String(),
						transaction_id: t.Union([t.String(), t.Null()]),
						paymentUrl: t.String(),
					}),
				},
				detail: {
					tags: ['Orders', 'Payment'],
					summary: 'Initiate payment for an order via Payment Service',
				},
			},
		)

		// 7. Nested Items Route
		.group('/:id/items', (items) =>
			items
				.post(
					'/',
					async ({ params, body, set, orderService }) => {
						const newItem = await orderService.addItemToOrder(Number(params.id), body);
						set.status = 201;
						return { item: newItem };
					},
					{
						params: t.Object({ id: t.Numeric() }),
						body: t.Omit(CreateOrderItemSchema, ['id', 'order_id']),
						response: {
							201: t.Object({ item: OrderItemResponseSchema }),
						},
						detail: { tags: ['Order Items'], summary: 'Add an item to order' },
					},
				)

				.get(
					'/',
					async ({ params, orderService }) => {
						const items = await orderService.getOrderItems(Number(params.id));
						return { items };
					},
					{
						params: t.Object({ id: t.Numeric() }), // Sửa params.orderId thành params.id cho khớp group
						response: {
							200: t.Object({ items: t.Array(OrderItemResponseSchema) }),
						},
						detail: { tags: ['Order Items'], summary: 'Get all items of an order' },
					},
				),
		);
