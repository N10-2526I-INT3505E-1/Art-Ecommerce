import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Elysia } from 'elysia';
import { NotFoundError, ForbiddenError, BadRequestError } from '@common/errors/httpErrors';
import { errorHandler } from '@common/errors/errorHandler';
import { OrderService } from '../order.service';

// ========================================================================
// 1. MOCK DATA FIXTURES
// ========================================================================

const MOCK_ORDER = {
	id: 'order-001',
	user_id: 'user-123',
	total_amount: 500000,
	status: 'pending',
	shipping_address: '123 Main Street, Ward 1, Ho Chi Minh, Vietnam',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

const MOCK_ORDER_PAID = {
	...MOCK_ORDER,
	id: 'order-002',
	status: 'paid',
};

const MOCK_OTHER_USER_ORDER = {
	...MOCK_ORDER,
	id: 'order-003',
	user_id: 'other-user-456',
};

const MOCK_ORDER_ITEM = {
	id: 1,
	order_id: 'order-001',
	product_id: 'prod-001',
	quantity: 2,
	price_per_item: 100000,
	product_snapshot: '{"name":"Art Painting","price":100000}',
};

// ========================================================================
// 2. MOCK ORDER SERVICE
// ========================================================================

const mockOrderService = {
	createOrder: mock(),
	getOrders: mock(),
	getOrderById: mock(),
	getAllOrders: mock(),
	updateOrder: mock(),
	deleteOrder: mock(),
	addItemToOrder: mock(),
	getOrderItems: mock(),
	calculateTotalAmount: mock(),
	createPaymentAndGetUrl: mock(),
	getProductDetails: mock(),
};

// Reset all mocks
const resetMocks = () => {
	Object.values(mockOrderService).forEach((m) => m.mockReset());
};

// ========================================================================
// 3. SIMPLE PLUGIN FOR TESTING (without RabbitMQ)
// ========================================================================

import { t } from 'elysia';
import { CreateOrderWithItemsSchema, OrderResponseSchema } from '../order.model';
import { CreateOrderItemSchema, OrderItemResponseSchema } from '../order_item.model';
import { UnauthorizedError } from '@common/errors/httpErrors';

// ========================================================================
// CONFIGURATION - Change API_VERSION to update all tests at once
// ========================================================================
const BASE_URL = 'http://localhost';
const API_VERSION = '/v1';
const ORDERS_PATH = '/orders';

// Helper to build URLs - centralizes path construction
const buildUrl = (path: string = '', query: string = '') =>
	`${BASE_URL}${API_VERSION}${ORDERS_PATH}${path}${query}`;

const testOrdersPlugin = (dependencies: { orderService: typeof mockOrderService }) =>
	new Elysia({ name: 'test-orders-plugin' })
		.decorate('orderService', dependencies.orderService)
		.group(`${API_VERSION}${ORDERS_PATH}`, (app) =>
			app
				// 1. Create Order with Items (Public)
				.post(
					'/',
					async ({ body, set, orderService }) => {
						const { items, ...orderData } = body as any;

						let calculatedTotal = 0;
						let paymentUrl = null;
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

						const newOrder = await orderService.createOrder({
							...orderData,
							total_amount: calculatedTotal,
						});

						let orderItems: any[] = [];
						if (items && Array.isArray(items) && items.length > 0) {
							for (const item of items) {
								const productInfo = fetchedProducts[item.product_id];
								const finalSnapshot = {
									...(item.product_snapshot || {}),
									name: productInfo?.name || 'Product',
									price: productInfo?.price || 0,
									image: productInfo?.imageUrl || '',
								};

								const addedItem = await orderService.addItemToOrder(newOrder.id, {
									...item,
									price_per_item: productInfo?.price || item.price_per_item,
									product_snapshot: finalSnapshot,
								});
								orderItems.push(addedItem);
							}
						}

						if (calculatedTotal > 0) {
							try {
								paymentUrl = await orderService.createPaymentAndGetUrl(newOrder.id, 'vnpay');
							} catch (err) {
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
						detail: { tags: ['Orders'], summary: 'Create a new order with items' },
					},
				)

				// Protected routes
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
									role: (userRole as string) || 'user',
								},
							};
						})

						// GET /orders/me - User's orders
						.get(
							'/me',
							async ({ user, orderService }) => {
								const orders = await orderService.getOrders(user.id);
								return { orders };
							},
							{
								detail: { tags: ['Orders'], summary: 'Get current user orders' },
							},
						)

						// GET /orders - All orders (admin only)
						.get(
							'/',
							async ({ user, query, orderService }) => {
								if (user.role !== 'manager' && user.role !== 'operator') {
									throw new ForbiddenError('Access denied');
								}
								const queryParams = query as { user_id?: string };
								if (queryParams.user_id) {
									const orders = await orderService.getOrders(queryParams.user_id);
									return { orders };
								}
								const orders = await orderService.getOrders();
								return { orders };
							},
							{
								detail: { tags: ['Orders'], summary: 'Get all orders (admin)' },
							},
						)

						// GET /orders/:id
						.get(
							'/:id',
							async ({ params, user, orderService }) => {
								const order = await orderService.getOrderById(params.id);
								if (
									order.user_id !== user.id &&
									user.role !== 'manager' &&
									user.role !== 'operator'
								) {
									throw new ForbiddenError('Access denied');
								}
								return { order };
							},
							{
								params: t.Object({ id: t.String() }),
								detail: { tags: ['Orders'], summary: 'Get order by ID' },
							},
						)

						// PATCH /orders/:id
						.patch(
							'/:id',
							async ({ params, body, user, orderService }) => {
								const order = await orderService.getOrderById(params.id);
								if (
									order.user_id !== user.id &&
									user.role !== 'manager' &&
									user.role !== 'operator'
								) {
									throw new ForbiddenError('Access denied');
								}
								const updated = await orderService.updateOrder(params.id, body as any);
								return { order: updated };
							},
							{
								params: t.Object({ id: t.String() }),
								body: t.Partial(
									t.Object({
										status: t.Optional(t.String()),
										shipping_address: t.Optional(t.String()),
										total_amount: t.Optional(t.Number()),
									}),
								),
								detail: { tags: ['Orders'], summary: 'Update order' },
							},
						)

						// DELETE /orders/:id
						.delete(
							'/:id',
							async ({ params, user, orderService }) => {
								const order = await orderService.getOrderById(params.id);
								if (user.role !== 'manager' && user.role !== 'operator') {
									throw new ForbiddenError('Access denied');
								}
								await orderService.deleteOrder(params.id);
								return { message: `Đã xóa đơn hàng ID ${params.id}.` };
							},
							{
								params: t.Object({ id: t.String() }),
								detail: { tags: ['Orders'], summary: 'Delete order' },
							},
						)

						// Order Items
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
											throw new ForbiddenError('Access denied');
										}
										const newItem = await orderService.addItemToOrder(params.id, body);
										set.status = 201;
										return { item: newItem };
									},
									{
										params: t.Object({ id: t.String() }),
										body: t.Object({
											product_id: t.String(),
											quantity: t.Integer({ minimum: 1 }),
											price_per_item: t.Number({ minimum: 0 }),
											product_snapshot: t.Optional(t.Any()),
										}),
										detail: { tags: ['Order Items'], summary: 'Add item to order' },
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
											throw new ForbiddenError('Access denied');
										}
										const items = await orderService.getOrderItems(params.id);
										return { items };
									},
									{
										params: t.Object({ id: t.String() }),
										detail: { tags: ['Order Items'], summary: 'Get order items' },
									},
								),
						),
				),
		);

// Helper to create auth headers
const createAuthHeaders = (userId: string, role: string = 'user') => ({
	'x-user-id': userId,
	'x-user-role': role,
	'Content-Type': 'application/json',
});

// ========================================================================
// 4. TEST SUITES
// ========================================================================

describe('Orders Plugin - Integration Tests', () => {
	let app: Elysia<any, any, any, any, any, any>;

	beforeEach(() => {
		resetMocks();
		app = new Elysia()
			.use(errorHandler)
			.use(testOrdersPlugin({ orderService: mockOrderService as any }));
	});

	// ========================================================================
	// SECTION 1: CREATE ORDER (POST /orders)
	// ========================================================================
	describe('Create Order (POST /orders)', () => {
		const validOrderInput = {
			user_id: 'user-123',
			shipping_address: '123 Main Street, Ward 1, Ho Chi Minh, Vietnam',
		};

		const validOrderWithItems = {
			user_id: 'user-123',
			shipping_address: '123 Main Street, Ward 1, Ho Chi Minh, Vietnam',
			items: [
				{
					product_id: 'prod-001',
					quantity: 2,
					price_per_item: 100000,
				},
			],
		};

		it('TC-INT-ORD-01: Should create order successfully with items', async () => {
			mockOrderService.calculateTotalAmount.mockResolvedValue({
				total: 200000,
				productMap: { 'prod-001': { name: 'Art', price: 100000, imageUrl: '' } },
			});
			mockOrderService.createOrder.mockResolvedValue(MOCK_ORDER);
			mockOrderService.addItemToOrder.mockResolvedValue(MOCK_ORDER_ITEM);
			mockOrderService.createPaymentAndGetUrl.mockResolvedValue('https://payment.url');

			const response = await app.handle(
				new Request(buildUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(validOrderWithItems),
				}),
			);

			const body = await response.json();
			expect(response.status).toBe(201);
			expect(body.order).toBeDefined();
			expect(body.paymentUrl).toBe('https://payment.url');
		});

		it('TC-INT-ORD-02: Should create order without items', async () => {
			mockOrderService.createOrder.mockResolvedValue(MOCK_ORDER);

			const response = await app.handle(
				new Request(buildUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(validOrderInput),
				}),
			);

			const body = await response.json();
			expect(response.status).toBe(201);
			expect(body.order).toBeDefined();
			expect(body.items).toEqual([]);
		});

		it('TC-INT-ORD-03: Should return 422 for missing user_id', async () => {
			const response = await app.handle(
				new Request(buildUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ shipping_address: '123 Main Street' }),
				}),
			);

			expect(response.status).toBe(422);
		});

		it('TC-INT-ORD-04: Should handle payment URL creation failure', async () => {
			mockOrderService.calculateTotalAmount.mockResolvedValue({
				total: 200000,
				productMap: { 'prod-001': { name: 'Art', price: 100000, imageUrl: '' } },
			});
			mockOrderService.createOrder.mockResolvedValue(MOCK_ORDER);
			mockOrderService.addItemToOrder.mockResolvedValue(MOCK_ORDER_ITEM);
			mockOrderService.createPaymentAndGetUrl.mockRejectedValue(new Error('Service down'));

			const response = await app.handle(
				new Request(buildUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(validOrderWithItems),
				}),
			);

			const body = await response.json();
			expect(response.status).toBe(201);
			expect(body.paymentUrl).toBeNull();
		});
	});

	// ========================================================================
	// SECTION 2: GET USER'S ORDERS (GET /orders/me)
	// ========================================================================
	describe('Get User Orders (GET /orders/me)', () => {
		it('TC-INT-ORD-05: Should return user orders', async () => {
			mockOrderService.getOrders.mockResolvedValue([MOCK_ORDER]);

			const response = await app.handle(
				new Request(buildUrl('/me'), {
					headers: createAuthHeaders('user-123'),
				}),
			);

			const body = await response.json();
			expect(response.status).toBe(200);
			expect(body.orders).toHaveLength(1);
			expect(mockOrderService.getOrders).toHaveBeenCalledWith('user-123');
		});

		it('TC-INT-ORD-06: Should return 401 without auth', async () => {
			const response = await app.handle(new Request(buildUrl('/me')));
			expect(response.status).toBe(401);
		});

		it('TC-INT-ORD-07: Should return empty array when no orders', async () => {
			mockOrderService.getOrders.mockResolvedValue([]);

			const response = await app.handle(
				new Request(buildUrl('/me'), {
					headers: createAuthHeaders('user-123'),
				}),
			);

			const body = await response.json();
			expect(response.status).toBe(200);
			expect(body.orders).toEqual([]);
		});
	});

	// ========================================================================
	// SECTION 3: GET ALL ORDERS (GET /orders) - Admin Only
	// ========================================================================
	describe('Get All Orders (GET /orders)', () => {
		it('TC-INT-ORD-08: Should return all orders for manager', async () => {
			mockOrderService.getOrders.mockResolvedValue([MOCK_ORDER, MOCK_ORDER_PAID]);

			const response = await app.handle(
				new Request(buildUrl('/'), {
					headers: createAuthHeaders('admin-001', 'manager'),
				}),
			);

			const body = await response.json();
			expect(response.status).toBe(200);
			expect(body.orders).toHaveLength(2);
		});

		it('TC-INT-ORD-09: Should return orders for operator', async () => {
			mockOrderService.getOrders.mockResolvedValue([MOCK_ORDER]);

			const response = await app.handle(
				new Request(buildUrl('/'), {
					headers: createAuthHeaders('operator-001', 'operator'),
				}),
			);

			const body = await response.json();
			expect(response.status).toBe(200);
			expect(body.orders).toBeDefined();
		});

		it('TC-INT-ORD-10: Should filter by user_id for admin', async () => {
			mockOrderService.getOrders.mockResolvedValue([MOCK_ORDER]);

			const response = await app.handle(
				new Request(buildUrl('/', '?user_id=user-123'), {
					headers: createAuthHeaders('admin-001', 'manager'),
				}),
			);

			expect(response.status).toBe(200);
			expect(mockOrderService.getOrders).toHaveBeenCalledWith('user-123');
		});

		it('TC-INT-ORD-11: Should return 403 for regular user', async () => {
			const response = await app.handle(
				new Request(buildUrl('/'), {
					headers: createAuthHeaders('user-123', 'user'),
				}),
			);
			expect(response.status).toBe(403);
		});

		it('TC-INT-ORD-12: Should return 401 without auth', async () => {
			const response = await app.handle(new Request(buildUrl('/')));
			expect(response.status).toBe(401);
		});
	});

	// ========================================================================
	// SECTION 4: GET ORDER BY ID (GET /orders/:id)
	// ========================================================================
	describe('Get Order By ID (GET /orders/:id)', () => {
		it('TC-INT-ORD-13: Should return order for owner', async () => {
			mockOrderService.getOrderById.mockResolvedValue(MOCK_ORDER);

			const response = await app.handle(
				new Request(buildUrl('/order-001'), {
					headers: createAuthHeaders('user-123'),
				}),
			);

			const body = await response.json();
			expect(response.status).toBe(200);
			expect(body.order.id).toBe('order-001');
		});

		it('TC-INT-ORD-14: Should return order for manager', async () => {
			mockOrderService.getOrderById.mockResolvedValue(MOCK_OTHER_USER_ORDER);

			const response = await app.handle(
				new Request(buildUrl('/order-003'), {
					headers: createAuthHeaders('admin-001', 'manager'),
				}),
			);

			const body = await response.json();
			expect(response.status).toBe(200);
			expect(body.order.id).toBe('order-003');
		});

		it('TC-INT-ORD-15: Should return 403 for other user order', async () => {
			mockOrderService.getOrderById.mockResolvedValue(MOCK_OTHER_USER_ORDER);

			const response = await app.handle(
				new Request(buildUrl('/order-003'), {
					headers: createAuthHeaders('user-123', 'user'),
				}),
			);

			expect(response.status).toBe(403);
		});

		it('TC-INT-ORD-16: Should return 404 for non-existent order', async () => {
			mockOrderService.getOrderById.mockRejectedValue(new NotFoundError('Order not found'));

			const response = await app.handle(
				new Request(buildUrl('/non-existent'), {
					headers: createAuthHeaders('user-123'),
				}),
			);

			expect(response.status).toBe(404);
		});

		it('TC-INT-ORD-17: Should return 401 without auth', async () => {
			const response = await app.handle(new Request(buildUrl('/order-001')));
			expect(response.status).toBe(401);
		});
	});

	// ========================================================================
	// SECTION 5: UPDATE ORDER (PATCH /orders/:id)
	// ========================================================================
	describe('Update Order (PATCH /orders/:id)', () => {
		it('TC-INT-ORD-18: Should update order for owner', async () => {
			mockOrderService.getOrderById.mockResolvedValue(MOCK_ORDER);
			mockOrderService.updateOrder.mockResolvedValue({ ...MOCK_ORDER, status: 'cancelled' });

			const response = await app.handle(
				new Request(buildUrl('/order-001'), {
					method: 'PATCH',
					headers: createAuthHeaders('user-123'),
					body: JSON.stringify({ status: 'cancelled' }),
				}),
			);

			const body = await response.json();
			expect(response.status).toBe(200);
			expect(body.order.status).toBe('cancelled');
		});

		it('TC-INT-ORD-19: Should update order for manager', async () => {
			mockOrderService.getOrderById.mockResolvedValue(MOCK_OTHER_USER_ORDER);
			mockOrderService.updateOrder.mockResolvedValue({
				...MOCK_OTHER_USER_ORDER,
				status: 'shipped',
			});

			const response = await app.handle(
				new Request(buildUrl('/order-003'), {
					method: 'PATCH',
					headers: createAuthHeaders('admin-001', 'manager'),
					body: JSON.stringify({ status: 'shipped' }),
				}),
			);

			const body = await response.json();
			expect(response.status).toBe(200);
			expect(body.order.status).toBe('shipped');
		});

		it('TC-INT-ORD-20: Should return 403 for other user order', async () => {
			mockOrderService.getOrderById.mockResolvedValue(MOCK_OTHER_USER_ORDER);

			const response = await app.handle(
				new Request(buildUrl('/order-003'), {
					method: 'PATCH',
					headers: createAuthHeaders('user-123', 'user'),
					body: JSON.stringify({ status: 'cancelled' }),
				}),
			);

			expect(response.status).toBe(403);
		});

		it('TC-INT-ORD-21: Should return 404 for non-existent order', async () => {
			mockOrderService.getOrderById.mockRejectedValue(new NotFoundError('Order not found'));

			const response = await app.handle(
				new Request(buildUrl('/non-existent'), {
					method: 'PATCH',
					headers: createAuthHeaders('user-123'),
					body: JSON.stringify({ status: 'cancelled' }),
				}),
			);

			expect(response.status).toBe(404);
		});
	});

	// ========================================================================
	// SECTION 6: DELETE ORDER (DELETE /orders/:id)
	// ========================================================================
	describe('Delete Order (DELETE /orders/:id)', () => {
		it('TC-INT-ORD-22: Should delete order for manager', async () => {
			mockOrderService.getOrderById.mockResolvedValue(MOCK_ORDER);
			mockOrderService.deleteOrder.mockResolvedValue(MOCK_ORDER);

			const response = await app.handle(
				new Request(buildUrl('/order-001'), {
					method: 'DELETE',
					headers: createAuthHeaders('admin-001', 'manager'),
				}),
			);

			const body = await response.json();
			expect(response.status).toBe(200);
			expect(body.message).toContain('order-001');
		});

		it('TC-INT-ORD-23: Should delete order for operator', async () => {
			mockOrderService.getOrderById.mockResolvedValue(MOCK_ORDER);
			mockOrderService.deleteOrder.mockResolvedValue(MOCK_ORDER);

			const response = await app.handle(
				new Request(buildUrl('/order-001'), {
					method: 'DELETE',
					headers: createAuthHeaders('operator-001', 'operator'),
				}),
			);

			const body = await response.json();
			expect(response.status).toBe(200);
		});

		it('TC-INT-ORD-24: Should return 403 for regular user', async () => {
			mockOrderService.getOrderById.mockResolvedValue(MOCK_ORDER);

			const response = await app.handle(
				new Request(buildUrl('/order-001'), {
					method: 'DELETE',
					headers: createAuthHeaders('user-123', 'user'),
				}),
			);

			expect(response.status).toBe(403);
		});

		it('TC-INT-ORD-25: Should return 404 for non-existent order', async () => {
			mockOrderService.getOrderById.mockRejectedValue(new NotFoundError('Order not found'));

			const response = await app.handle(
				new Request(buildUrl('/non-existent'), {
					method: 'DELETE',
					headers: createAuthHeaders('admin-001', 'manager'),
				}),
			);

			expect(response.status).toBe(404);
		});
	});

	// ========================================================================
	// SECTION 7: ORDER ITEMS
	// ========================================================================
	describe('Order Items Management', () => {
		const itemInput = {
			product_id: 'prod-001',
			quantity: 2,
			price_per_item: 100000,
			product_snapshot: { name: 'Art Painting' },
		};

		describe('Add Item (POST /orders/:id/items)', () => {
			it('TC-INT-ORD-26: Should add item for owner', async () => {
				mockOrderService.getOrderById.mockResolvedValue(MOCK_ORDER);
				mockOrderService.addItemToOrder.mockResolvedValue(MOCK_ORDER_ITEM);

				const response = await app.handle(
					new Request(buildUrl('/order-001/items/'), {
						method: 'POST',
						headers: createAuthHeaders('user-123'),
						body: JSON.stringify(itemInput),
					}),
				);

				const body = await response.json();
				expect(response.status).toBe(201);
				expect(body.item).toBeDefined();
			});

			it('TC-INT-ORD-27: Should add item for manager', async () => {
				mockOrderService.getOrderById.mockResolvedValue(MOCK_OTHER_USER_ORDER);
				mockOrderService.addItemToOrder.mockResolvedValue(MOCK_ORDER_ITEM);

				const response = await app.handle(
					new Request(buildUrl('/order-003/items/'), {
						method: 'POST',
						headers: createAuthHeaders('admin-001', 'manager'),
						body: JSON.stringify(itemInput),
					}),
				);

				expect(response.status).toBe(201);
			});

			it('TC-INT-ORD-28: Should return 403 for other user order', async () => {
				mockOrderService.getOrderById.mockResolvedValue(MOCK_OTHER_USER_ORDER);

				const response = await app.handle(
					new Request(buildUrl('/order-003/items/'), {
						method: 'POST',
						headers: createAuthHeaders('user-123', 'user'),
						body: JSON.stringify(itemInput),
					}),
				);

				expect(response.status).toBe(403);
			});

			it('TC-INT-ORD-29: Should return 422 for invalid item', async () => {
				mockOrderService.getOrderById.mockResolvedValue(MOCK_ORDER);

				const response = await app.handle(
					new Request(buildUrl('/order-001/items/'), {
						method: 'POST',
						headers: createAuthHeaders('user-123'),
						body: JSON.stringify({ product_id: 'prod-001' }), // Missing required fields
					}),
				);

				expect(response.status).toBe(422);
			});
		});

		describe('Get Items (GET /orders/:id/items)', () => {
			it('TC-INT-ORD-30: Should return items for owner', async () => {
				mockOrderService.getOrderById.mockResolvedValue(MOCK_ORDER);
				mockOrderService.getOrderItems.mockResolvedValue([MOCK_ORDER_ITEM]);

				const response = await app.handle(
					new Request(buildUrl('/order-001/items/'), {
						headers: createAuthHeaders('user-123'),
					}),
				);

				const body = await response.json();
				expect(response.status).toBe(200);
				expect(body.items).toHaveLength(1);
			});

			it('TC-INT-ORD-31: Should return items for manager', async () => {
				mockOrderService.getOrderById.mockResolvedValue(MOCK_OTHER_USER_ORDER);
				mockOrderService.getOrderItems.mockResolvedValue([MOCK_ORDER_ITEM]);

				const response = await app.handle(
					new Request(buildUrl('/order-003/items/'), {
						headers: createAuthHeaders('admin-001', 'manager'),
					}),
				);

				const body = await response.json();
				expect(response.status).toBe(200);
			});

			it('TC-INT-ORD-32: Should return 403 for other user order', async () => {
				mockOrderService.getOrderById.mockResolvedValue(MOCK_OTHER_USER_ORDER);

				const response = await app.handle(
					new Request(buildUrl('/order-003/items/'), {
						headers: createAuthHeaders('user-123', 'user'),
					}),
				);

				expect(response.status).toBe(403);
			});

			it('TC-INT-ORD-33: Should return empty array when no items', async () => {
				mockOrderService.getOrderById.mockResolvedValue(MOCK_ORDER);
				mockOrderService.getOrderItems.mockResolvedValue([]);

				const response = await app.handle(
					new Request(buildUrl('/order-001/items/'), {
						headers: createAuthHeaders('user-123'),
					}),
				);

				const body = await response.json();
				expect(response.status).toBe(200);
				expect(body.items).toEqual([]);
			});
		});
	});

	// ========================================================================
	// SECTION 8: EDGE CASES
	// ========================================================================
	describe('Edge Cases', () => {
		it('TC-INT-ORD-34: Should handle malformed JSON', async () => {
			const response = await app.handle(
				new Request(buildUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: 'not-valid-json',
				}),
			);

			expect(response.status).toBeGreaterThanOrEqual(400);
		});

		it('TC-INT-ORD-35: Should handle empty request body', async () => {
			const response = await app.handle(
				new Request(buildUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				}),
			);

			expect(response.status).toBe(422);
		});

		it('TC-INT-ORD-36: Should allow operator to update orders', async () => {
			mockOrderService.getOrderById.mockResolvedValue(MOCK_ORDER);
			mockOrderService.updateOrder.mockResolvedValue({ ...MOCK_ORDER, status: 'processing' });

			const response = await app.handle(
				new Request(buildUrl('/order-001'), {
					method: 'PATCH',
					headers: createAuthHeaders('operator-001', 'operator'),
					body: JSON.stringify({ status: 'processing' }),
				}),
			);

			const body = await response.json();
			expect(response.status).toBe(200);
			expect(body.order.status).toBe('processing');
		});
	});
});
