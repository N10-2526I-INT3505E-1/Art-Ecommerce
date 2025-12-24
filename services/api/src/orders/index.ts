import { Elysia, t } from 'elysia';
import { db } from './db';
import { CreateOrderSchema, OrderResponseSchema, CreateOrderWithItemsSchema } from './order.model';
import { OrderService } from './order.service';
import { CreateOrderItemSchema, OrderItemResponseSchema } from './order_item.model';
import { rabbitPlugin, QUEUES } from './rabbitmq';
import type { Channel } from 'amqplib';
import { ForbiddenError, UnauthorizedError } from '@common/errors/httpErrors';

let orderService = new OrderService(db);

export const ordersPlugin = async (dependencies: { orderService: OrderService }) =>
	new Elysia({ name: 'orders-plugin' })
		.decorate('orderService', dependencies.orderService)
		.use(await rabbitPlugin())
		.onStart(async (app) => {
			const rabbitChannel: Channel = app.decorator.rabbitChannel;
			const sendToQueue = app.decorator.sendToQueue;

			// Re-initialize orderService with rabbit channel for expiry messaging
			orderService = new OrderService(db, rabbitChannel);
			app.decorator.orderService = orderService;

			console.log('Order Service listening...');

			// Consumer 1: Handle Payment Results
			rabbitChannel.consume(QUEUES.PAYMENT_PROCESS, async (msg) => {
				if (!msg) return;

				try {
					const data = JSON.parse(msg.content.toString());

					// Update the Order Status in Database
					if (data.type === 'PAYMENT_RESULT' && data.status === 'PAID') {
						console.log(
							`Received PAYMENT_RESULT for Order ID ${data.orderId}, updating order status to 'paid'`,
						);
						const updateState = await orderService.updateOrder(data.orderId, {
							status: 'paid', // Update order status to 'paid'
						});
						// If order status updated successfully, send product stock update to Product Service
						if (updateState) {
							const order_item = await orderService.getOrderItems(data.orderId);
							const sent = sendToQueue(QUEUES.PRODUCT_UPDATES, {
								type: 'PRODUCT_STOCK_UPDATE',
								// Send order items to Product Service to update stock
								orderItems: order_item.map((item) => ({
									product_id: item.product_id,
									quantity: item.quantity,
								})),
							});
							if (!sent) {
								console.error(
									'Failed to send product stock update to RabbitMQ, Product Service might not be notified',
								);
							}
						}
					}

					// Acknowledge the message (tell RabbitMQ we are done)
					rabbitChannel.ack(msg);
				} catch (err) {
					console.error('Error processing RabbitMQ message:', err);
					// Ack to prevent infinite loops if data is bad
					rabbitChannel.ack(msg);
				}
			});

			// Consumer 2: Handle Order Expiry (Auto-cancel pending orders after 15 minutes)
			rabbitChannel.consume(QUEUES.ORDER_EXPIRY, async (msg) => {
				if (!msg) return;

				try {
					const data = JSON.parse(msg.content.toString());

					// Only process ORDER_EXPIRY_CHECK messages
					if (data.type === 'ORDER_EXPIRY_CHECK') {
						const orderId = data.orderId;
						console.log(`Processing order expiry check for Order ID: ${orderId}`);

						try {
							const order = await orderService.getOrderById(orderId);

							// If order is still PENDING, cancel it automatically
							if (order.status === 'pending') {
								console.log(
									`Order ${orderId} is still PENDING after 15 minutes. Auto-cancelling...`,
								);
								await orderService.updateOrder(orderId, {
									status: 'cancelled',
								});
								console.log(`Order ${orderId} has been cancelled due to inactivity.`);
							} else if (order.status === 'paid') {
								// Order was paid, no action needed
								console.log(`Order ${orderId} is already PAID. Ignoring expiry message.`);
							} else {
								// Order has other status (cancelled, shipped, etc.)
								console.log(
									`Order ${orderId} has status '${order.status}'. No expiry action needed.`,
								);
							}
						} catch (err) {
							console.error(`Error processing order expiry for ${orderId}:`, err);
						}
					}

					// Acknowledge the message
					rabbitChannel.ack(msg);
				} catch (err) {
					console.error('Error processing order expiry message:', err);
					// Ack to prevent infinite loops
					rabbitChannel.ack(msg);
				}
			});
		})
		.group('/v1/orders', (app) =>
			app
				// 1. Create Order with Items
				.post(
					'/',
					async ({ body, set, orderService }) => {
						const { items, ...orderData } = body as any;

						let calculatedTotal = 0;
						let paymentUrl = null;
						// Biến lưu thông tin sản phẩm đã fetch từ Product Service
						let fetchedProducts: Record<string, any> = {};

						if (items && Array.isArray(items) && items.length > 0) {
							const result = await orderService.calculateTotalAmount(
								items.map((item: any) => ({
									product_id: item.product_id.toString(),
									quantity: item.quantity,
								})),
							);
							calculatedTotal = result.total;
							fetchedProducts = result.productMap;
						}

						// Create order
						const newOrder = await orderService.createOrder({
							...orderData,
							total_amount: calculatedTotal,
						});

						// Add items to order
						let orderItems: any[] = [];
						if (items && Array.isArray(items) && items.length > 0) {
							for (const item of items) {
								// Lấy thông tin sản phẩm chuẩn từ Service (đã fetch ở bước tính tiền)
								const productInfo = fetchedProducts[item.product_id];

								// Merge snapshot từ Frontend gửi lên với thông tin chuẩn từ Backend
								// Ưu tiên thông tin từ Backend (Product Service) để đảm bảo chính xác
								const finalSnapshot = {
									...(item.product_snapshot || {}), // Giữ các trường phụ frontend gửi (như size, color)
									name: productInfo?.name || 'Sản phẩm',
									price: productInfo?.price || 0,
									image: productInfo?.imageUrl || '', // Đảm bảo có Image URL
								};

								const addedItem = await orderService.addItemToOrder(newOrder.id, {
									...item,
									price_per_item: productInfo?.price || item.price_per_item, // Dùng giá chuẩn từ DB
									product_snapshot: finalSnapshot,
								});
								orderItems.push(addedItem);
							}
						}

						// Get payment URL
						if (calculatedTotal > 0) {
							try {
								paymentUrl = await orderService.createPaymentAndGetUrl(newOrder.id, 'vnpay');
							} catch (err) {
								console.error('Failed to create payment URL:', err);
								paymentUrl = null;
							}
						}

						set.status = 201;
						return {
							order: newOrder,
							items: orderItems,
							paymentUrl: paymentUrl,
						};
					},
					{
						body: CreateOrderWithItemsSchema,
						response: {
							201: t.Object({
								order: OrderResponseSchema,
								items: t.Array(OrderItemResponseSchema),
								paymentUrl: t.Union([t.String(), t.Null()]),
							}),
						},
						detail: { tags: ['Orders'], summary: 'Create a new order with items' },
					},
				)

				// Guard to extract user from headers
				.guard({}, (app) =>
					app
						.derive(({ headers }) => {
							const userId = headers['x-user-id'];
							const userRole = headers['x-user-role'];

							if (!userId) {
								throw new UnauthorizedError('Missing Gateway Headers (x-user-id)');
							}

							return {
								user: {
									id: userId as string,
									email: '',
									role: (userRole as string) || 'user',
								},
							};
						})
						// 2. Get Orders by User ID
						.get(
							'/me',
							async ({ user }) => {
								const orders = await orderService.getOrders(user.id);
								return { orders };
							},
							{
								response: { 200: t.Object({ orders: t.Array(OrderResponseSchema) }) },
								detail: {
									tags: ['Orders'],
									summary: 'Get all orders for a specific user by user ID',
								},
							},
						)
						// 3. Get All Orders
						.get(
							'/',
							async ({ user, query }) => {
								// Check if user is manager or operator
								if (user && (user.role === 'manager' || user.role === 'operator')) {
									const queryParams = query as { user_id?: string };

									// If user_id is provided in query, fetch orders for that user
									if (queryParams.user_id) {
										const orders = await orderService.getOrders(queryParams.user_id);
										return { orders };
									} else {
										// Otherwise, fetch all orders
										const orders = await orderService.getOrders();
										return { orders };
									}
								} else if (!user) {
									throw new UnauthorizedError('Authentication required to access this resource.');
								} else {
									throw new ForbiddenError(
										'Access denied. You do not have permission to view all orders.',
									);
								}
							},
							{
								response: { 200: t.Object({ orders: t.Array(OrderResponseSchema) }) },
								detail: { tags: ['Orders'], summary: 'Get orders list (filter by user_id)' },
							},
						)

						// 3. Get Order By ID
						.get(
							'/:id',
							async ({ params, user }) => {
								const order = await orderService.getOrderById(params.id);
								if (
									order.user_id !== user.id &&
									user.role !== 'manager' &&
									user.role !== 'operator'
								) {
									throw new ForbiddenError('You do not have permission to access this order.');
								}
								return { order };
							},
							{
								params: t.Object({ id: t.String() }),
								response: {
									200: t.Object({ order: OrderResponseSchema }),
								},
								detail: { tags: ['Orders'], summary: 'Get order by ID' },
							},
						)

						// 4. Update Order
						.patch(
							'/:id',
							async ({ params, body, user, orderService }) => {
								const order = await orderService.getOrderById(params.id);
								if (
									order.user_id !== user.id &&
									user.role !== 'manager' &&
									user.role !== 'operator'
								) {
									throw new ForbiddenError('You do not have permission to update this order.');
								}
								const updated = await orderService.updateOrder(params.id, body as any);
								return { order: updated };
							},
							{
								params: t.Object({ id: t.String() }),
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
							async ({ params, user }) => {
								const order = await orderService.getOrderById(params.id);
								if (user.role !== 'manager' && user.role !== 'operator') {
									throw new ForbiddenError('You do not have permission to delete this order.');
								}
								await orderService.deleteOrder(params.id);
								return { message: `Đã xóa đơn hàng ID ${params.id}.` };
							},
							{
								params: t.Object({ id: t.String() }),
								response: { 200: t.Object({ message: t.String() }) },
								detail: { tags: ['Orders'], summary: 'Delete an order' },
							},
						)

						// 7. Nested Items Route
						.group('/:id/items', (items) =>
							items
								.post(
									'/',
									async ({ params, body, set, user, orderService }) => {
										const order = await orderService.getOrderById(params.id);
										if (
											order.user_id !== user.id &&
											user.role !== 'manager' &&
											user.role !== 'operator'
										) {
											throw new ForbiddenError(
												'You do not have permission to modify items in this order.',
											);
										}
										const newItem = await orderService.addItemToOrder(params.id, body);
										set.status = 201;
										return { item: newItem };
									},
									{
										params: t.Object({ id: t.String() }),
										body: t.Omit(CreateOrderItemSchema, ['id', 'order_id']),
										response: {
											201: t.Object({ item: OrderItemResponseSchema }),
										},
										detail: { tags: ['Order Items'], summary: 'Add an item to order' },
									},
								)

								.get(
									'/',
									async ({ params, user, orderService }) => {
										const order = await orderService.getOrderById(params.id);
										if (
											order.user_id !== user.id &&
											user.role !== 'manager' &&
											user.role !== 'operator'
										) {
											throw new ForbiddenError(
												'You do not have permission to access items in this order.',
											);
										}
										const items = await orderService.getOrderItems(params.id);
										return { items };
									},
									{
										params: t.Object({ id: t.String() }),
										response: {
											200: t.Object({ items: t.Array(OrderItemResponseSchema) }),
										},
										detail: { tags: ['Order Items'], summary: 'Get all items of an order' },
									},
								),
						),
				),
		);
