import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { BadRequestError, InternalServerError, NotFoundError } from '@common/errors/httpErrors';
import { ordersTable } from '@order/order.model';
import { orderItemsTable } from '@order/order_item.model';
import { OrderService } from '@order/order.service';

// ========================================================================
// 1. MOCK DATA FIXTURES
// ========================================================================

const MOCK_ORDER = {
	id: '018d96c4-72b3-7000-9000-000000000001',
	user_id: '018d96c4-72b3-7000-9000-000000000000',
	total_amount: 500000,
	status: 'pending' as const,
	shipping_address: JSON.stringify({
		address: '123 Main Street',
		phone: '0987654321',
		ward: 'Ward 1',
		state: 'Ho Chi Minh',
		country: 'Vietnam',
		postal_code: '70000',
	}),
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

const MOCK_ORDER_PAID = {
	...MOCK_ORDER,
	id: '018d96c4-72b3-7000-9000-000000000002',
	status: 'paid' as const,
};

const MOCK_ORDER_CANCELLED = {
	...MOCK_ORDER,
	id: '018d96c4-72b3-7000-9000-000000000003',
	status: 'cancelled' as const,
};

const MOCK_VALID_ADDRESS = {
	address: '123 Main Street',
	phone: '0987654321',
	ward: 'Ward 1',
	state: 'Ho Chi Minh',
	country: 'Vietnam',
	postal_code: '70000',
};

const MOCK_VALID_STRING_ADDRESS = '123 Main Street, Ward 1, Ho Chi Minh, Vietnam';

const MOCK_ITEM_INPUT = {
	product_id: '50',
	quantity: 2,
	price_per_item: 100000,
	product_snapshot: { name: 'Art Painting', artist: 'Van Gogh' },
};

const MOCK_ITEM_DB = {
	id: 1,
	order_id: MOCK_ORDER.id,
	product_id: '50',
	quantity: 2,
	price_per_item: 100000,
	product_snapshot: '{"name":"Art Painting","artist":"Van Gogh"}',
};

const MOCK_PRODUCT = {
	id: '50',
	name: 'Art Painting',
	price: 100000,
	imageUrl: 'https://example.com/image.jpg',
};

const MOCK_PAYMENT_RESPONSE = {
	id: 'payment-001',
	order_id: MOCK_ORDER.id,
	amount: 500000,
	payment_gateway: 'vnpay',
	status: 'pending',
	paymentUrl: 'https://vnpay.vn/pay?id=123',
};

// ========================================================================
// 2. TEST SUITES
// ========================================================================

describe('OrderService', () => {
	let orderService: OrderService;
	let mockDb: any;
	let mockRabbitChannel: any;
	let dbExecutor: any;

	beforeEach(() => {
		dbExecutor = mock().mockResolvedValue([]);
		mockDb = {
			select: mock().mockReturnThis(),
			from: mock().mockReturnThis(),
			where: mock().mockReturnThis(),
			insert: mock().mockReturnThis(),
			values: mock().mockReturnThis(),
			update: mock().mockReturnThis(),
			set: mock().mockReturnThis(),
			delete: mock().mockReturnThis(),
			orderBy: mock().mockReturnThis(),
			returning: dbExecutor,
			// For queries that await directly (like getOrders, getAllOrders)
			then: (resolve: any, reject?: any) => dbExecutor().then(resolve, reject),
			// $dynamic returns self to allow chaining
			$dynamic: mock().mockReturnThis(),
		};

		mockRabbitChannel = {
			sendToQueue: mock().mockReturnValue(true),
		};

		orderService = new OrderService(mockDb, mockRabbitChannel);
	});

	// ========================================================================
	// SECTION 1: CREATE ORDER
	// ========================================================================
	describe('createOrder()', () => {
		it('TC-ORD-CREATE-01: Should create order successfully with valid string address', async () => {
			const orderInput = {
				user_id: MOCK_ORDER.user_id,
				total_amount: 500000,
				status: 'pending' as const,
				shipping_address: '123 Main Street, Ward 1, Ho Chi Minh, Vietnam',
			};

			dbExecutor.mockResolvedValueOnce([
				{ ...MOCK_ORDER, shipping_address: orderInput.shipping_address },
			]);

			const result = await orderService.createOrder(orderInput);

			expect(result).toBeDefined();
			expect(result.user_id).toBe(orderInput.user_id);
			expect(mockDb.insert).toHaveBeenCalledWith(ordersTable);
		});

		it('TC-ORD-CREATE-02: Should create order successfully with valid object address', async () => {
			const orderInput = {
				user_id: MOCK_ORDER.user_id,
				total_amount: 500000,
				status: 'pending' as const,
				shipping_address: MOCK_VALID_ADDRESS,
			};

			dbExecutor.mockResolvedValueOnce([MOCK_ORDER]);

			const result = await orderService.createOrder(orderInput as any);

			expect(result).toBeDefined();
			expect(mockDb.insert).toHaveBeenCalledWith(ordersTable);
		});

		it('TC-ORD-CREATE-03: Should throw BadRequestError for invalid address (too short string)', async () => {
			const orderInput = {
				user_id: MOCK_ORDER.user_id,
				total_amount: 500000,
				status: 'pending' as const,
				shipping_address: 'abc', // Too short
			};

			await expect(orderService.createOrder(orderInput)).rejects.toThrow(BadRequestError);
		});

		it('TC-ORD-CREATE-04: Should throw BadRequestError for invalid address object (missing fields)', async () => {
			const orderInput = {
				user_id: MOCK_ORDER.user_id,
				total_amount: 500000,
				status: 'pending' as const,
				shipping_address: { address: '123 Street' }, // Missing required fields
			};

			await expect(orderService.createOrder(orderInput as any)).rejects.toThrow(BadRequestError);
		});

		it('TC-ORD-CREATE-05: Should throw BadRequestError for invalid phone number', async () => {
			const orderInput = {
				user_id: MOCK_ORDER.user_id,
				total_amount: 500000,
				status: 'pending' as const,
				shipping_address: {
					...MOCK_VALID_ADDRESS,
					phone: 'invalid-phone',
				},
			};

			await expect(orderService.createOrder(orderInput as any)).rejects.toThrow(BadRequestError);
		});

		it('TC-ORD-CREATE-06: Should throw InternalServerError when DB returns empty', async () => {
			const orderInput = {
				user_id: MOCK_ORDER.user_id,
				total_amount: 500000,
				status: 'pending' as const,
				shipping_address: '123 Main Street, Ward 1, Ho Chi Minh, Vietnam',
			};

			dbExecutor.mockResolvedValueOnce([]);

			await expect(orderService.createOrder(orderInput)).rejects.toThrow(InternalServerError);
		});

		it('TC-ORD-CREATE-07: Should throw InternalServerError on DB error', async () => {
			const orderInput = {
				user_id: MOCK_ORDER.user_id,
				total_amount: 500000,
				status: 'pending' as const,
				shipping_address: '123 Main Street, Ward 1, Ho Chi Minh, Vietnam',
			};

			dbExecutor.mockRejectedValueOnce(new Error('Connection timeout'));

			await expect(orderService.createOrder(orderInput)).rejects.toThrow(InternalServerError);
		});

		it('TC-ORD-CREATE-08: Should send expiry message for pending orders', async () => {
			const orderInput = {
				user_id: MOCK_ORDER.user_id,
				total_amount: 500000,
				status: 'pending' as const,
				shipping_address: '123 Main Street, Ward 1, Ho Chi Minh, Vietnam',
			};

			dbExecutor.mockResolvedValueOnce([MOCK_ORDER]);

			await orderService.createOrder(orderInput);

			expect(mockRabbitChannel.sendToQueue).toHaveBeenCalled();
		});

		it('TC-ORD-CREATE-09: Should not send expiry message when RabbitMQ unavailable', async () => {
			const serviceWithoutRabbit = new OrderService(mockDb);
			const orderInput = {
				user_id: MOCK_ORDER.user_id,
				total_amount: 500000,
				status: 'pending' as const,
				shipping_address: '123 Main Street, Ward 1, Ho Chi Minh, Vietnam',
			};

			dbExecutor.mockResolvedValueOnce([MOCK_ORDER]);

			const result = await serviceWithoutRabbit.createOrder(orderInput);

			expect(result).toBeDefined();
		});
	});

	// ========================================================================
	// SECTION 2: GET ORDERS
	// ========================================================================
	describe('getOrders()', () => {
		it('TC-ORD-GET-01: Should return all orders without userId filter', async () => {
			const mockOrders = [MOCK_ORDER, MOCK_ORDER_PAID];
			dbExecutor.mockResolvedValueOnce(mockOrders);

			const result = await orderService.getOrders();

			expect(result).toHaveLength(2);
			expect(mockDb.select).toHaveBeenCalled();
		});

		it('TC-ORD-GET-02: Should return filtered orders with userId', async () => {
			dbExecutor.mockResolvedValueOnce([MOCK_ORDER]);

			const result = await orderService.getOrders(MOCK_ORDER.user_id);

			expect(result).toHaveLength(1);
			expect(mockDb.where).toHaveBeenCalled();
		});

		it('TC-ORD-GET-03: Should return empty array when no orders found', async () => {
			dbExecutor.mockResolvedValueOnce([]);

			const result = await orderService.getOrders('non-existent-user');

			expect(result).toEqual([]);
		});

		it('TC-ORD-GET-04: Should throw InternalServerError on DB error', async () => {
			dbExecutor.mockRejectedValueOnce(new Error('DB Error'));

			await expect(orderService.getOrders()).rejects.toThrow(InternalServerError);
		});
	});

	// ========================================================================
	// SECTION 3: GET ORDER BY ID
	// ========================================================================
	describe('getOrderById()', () => {
		it('TC-ORD-GETID-01: Should return order when found', async () => {
			dbExecutor.mockResolvedValueOnce([MOCK_ORDER]);

			const result = await orderService.getOrderById(MOCK_ORDER.id);

			expect(result).toEqual(MOCK_ORDER);
			expect(mockDb.where).toHaveBeenCalled();
		});

		it('TC-ORD-GETID-02: Should throw NotFoundError when order not found', async () => {
			dbExecutor.mockResolvedValueOnce([]);

			await expect(orderService.getOrderById('non-existent-id')).rejects.toThrow(NotFoundError);
		});
	});

	// ========================================================================
	// SECTION 4: GET ALL ORDERS
	// ========================================================================
	describe('getAllOrders()', () => {
		it('TC-ORD-GETALL-01: Should return all orders', async () => {
			const mockOrders = [MOCK_ORDER, MOCK_ORDER_PAID, MOCK_ORDER_CANCELLED];
			dbExecutor.mockResolvedValueOnce(mockOrders);

			const result = await orderService.getAllOrders();

			expect(result).toHaveLength(3);
			expect(mockDb.orderBy).toHaveBeenCalled();
		});

		it('TC-ORD-GETALL-02: Should return empty array when no orders', async () => {
			dbExecutor.mockResolvedValueOnce([]);

			const result = await orderService.getAllOrders();

			expect(result).toEqual([]);
		});

		it('TC-ORD-GETALL-03: Should throw InternalServerError on DB error', async () => {
			dbExecutor.mockRejectedValueOnce(new Error('DB Error'));

			await expect(orderService.getAllOrders()).rejects.toThrow(InternalServerError);
		});
	});

	// ========================================================================
	// SECTION 5: UPDATE ORDER
	// ========================================================================
	describe('updateOrder()', () => {
		it('TC-ORD-UPDATE-01: Should update order status successfully', async () => {
			const updatedOrder = { ...MOCK_ORDER, status: 'shipped' as const };
			dbExecutor.mockResolvedValueOnce([updatedOrder]);

			const result = await orderService.updateOrder(MOCK_ORDER.id, { status: 'shipped' } as any);

			expect(result.status).toBe('shipped');
			expect(mockDb.update).toHaveBeenCalledWith(ordersTable);
		});

		it('TC-ORD-UPDATE-02: Should update multiple fields', async () => {
			const updatedOrder = { ...MOCK_ORDER, status: 'paid' as const, total_amount: 600000 };
			dbExecutor.mockResolvedValueOnce([updatedOrder]);

			const result = await orderService.updateOrder(MOCK_ORDER.id, {
				status: 'paid',
				total_amount: 600000,
			} as any);

			expect(result.status).toBe('paid');
			expect(result.total_amount).toBe(600000);
		});

		it('TC-ORD-UPDATE-03: Should throw NotFoundError when order not found', async () => {
			dbExecutor.mockResolvedValueOnce([]);

			await expect(
				orderService.updateOrder('non-existent-id', { status: 'shipped' } as any),
			).rejects.toThrow(NotFoundError);
		});
	});

	// ========================================================================
	// SECTION 6: DELETE ORDER
	// ========================================================================
	describe('deleteOrder()', () => {
		it('TC-ORD-DELETE-01: Should delete order successfully', async () => {
			dbExecutor.mockResolvedValueOnce([MOCK_ORDER]);

			const result = await orderService.deleteOrder(MOCK_ORDER.id);

			expect(result).toEqual(MOCK_ORDER);
			expect(mockDb.delete).toHaveBeenCalledWith(ordersTable);
		});

		it('TC-ORD-DELETE-02: Should throw NotFoundError when order not found', async () => {
			dbExecutor.mockResolvedValueOnce([]);

			await expect(orderService.deleteOrder('non-existent-id')).rejects.toThrow(NotFoundError);
		});
	});

	// ========================================================================
	// SECTION 7: ORDER ITEMS
	// ========================================================================
	describe('Order Items Management', () => {
		describe('addItemToOrder()', () => {
			it('TC-ORD-ITEM-01: Should add item to order successfully', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_ITEM_DB]);

				const result = await orderService.addItemToOrder(MOCK_ORDER.id, MOCK_ITEM_INPUT);

				expect(result).toEqual(MOCK_ITEM_DB);
				expect(mockDb.insert).toHaveBeenCalledWith(orderItemsTable);
			});

			it('TC-ORD-ITEM-02: Should stringify product_snapshot', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_ITEM_DB]);

				await orderService.addItemToOrder(MOCK_ORDER.id, MOCK_ITEM_INPUT);

				expect(mockDb.values).toHaveBeenCalledWith(
					expect.objectContaining({
						product_snapshot: JSON.stringify(MOCK_ITEM_INPUT.product_snapshot),
					}),
				);
			});

			it('TC-ORD-ITEM-03: Should handle empty product_snapshot', async () => {
				const itemWithoutSnapshot = { ...MOCK_ITEM_INPUT, product_snapshot: undefined };
				dbExecutor.mockResolvedValueOnce([{ ...MOCK_ITEM_DB, product_snapshot: '{}' }]);

				const result = await orderService.addItemToOrder(MOCK_ORDER.id, itemWithoutSnapshot);

				expect(result).toBeDefined();
			});

			it('TC-ORD-ITEM-04: Should throw InternalServerError on failure', async () => {
				dbExecutor.mockResolvedValueOnce([]);

				await expect(orderService.addItemToOrder(MOCK_ORDER.id, MOCK_ITEM_INPUT)).rejects.toThrow(
					InternalServerError,
				);
			});
		});

		describe('getOrderItems()', () => {
			it('TC-ORD-ITEM-05: Should return order items', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_ITEM_DB]);

				const result = await orderService.getOrderItems(MOCK_ORDER.id);

				expect(result).toHaveLength(1);
				expect(result[0].product_id).toBe(MOCK_ITEM_INPUT.product_id);
			});

			it('TC-ORD-ITEM-06: Should return empty array when no items', async () => {
				dbExecutor.mockResolvedValueOnce([]);

				const result = await orderService.getOrderItems(MOCK_ORDER.id);

				expect(result).toEqual([]);
			});
		});
	});

	// ========================================================================
	// SECTION 8: PAYMENT OPERATIONS
	// ========================================================================
	describe('Payment Operations', () => {
		describe('createPaymentLink()', () => {
			let fetchMock: any;

			beforeEach(() => {
				fetchMock = spyOn(global, 'fetch');
			});

			it('TC-ORD-PAY-01: Should create payment link successfully', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_ORDER]);
				fetchMock.mockResolvedValueOnce({
					ok: true,
					json: async () => MOCK_PAYMENT_RESPONSE,
				});

				const result = await orderService.createPaymentLink(MOCK_ORDER.id, 'vnpay');

				expect(result.paymentUrl).toBe(MOCK_PAYMENT_RESPONSE.paymentUrl);
				expect(fetch).toHaveBeenCalled();
			});

			it('TC-ORD-PAY-02: Should throw BadRequestError for already paid order', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_ORDER_PAID]);

				await expect(orderService.createPaymentLink(MOCK_ORDER_PAID.id, 'vnpay')).rejects.toThrow(
					BadRequestError,
				);
			});

			it('TC-ORD-PAY-03: Should throw BadRequestError for cancelled order', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_ORDER_CANCELLED]);

				await expect(
					orderService.createPaymentLink(MOCK_ORDER_CANCELLED.id, 'vnpay'),
				).rejects.toThrow(BadRequestError);
			});

			it('TC-ORD-PAY-04: Should throw InternalServerError when payment service fails', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_ORDER]);
				fetchMock.mockResolvedValueOnce({
					ok: false,
					json: async () => ({ error: 'Payment service error' }),
				});

				await expect(orderService.createPaymentLink(MOCK_ORDER.id, 'vnpay')).rejects.toThrow(
					InternalServerError,
				);
			});

			it('TC-ORD-PAY-05: Should throw InternalServerError on network error', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_ORDER]);
				fetchMock.mockRejectedValueOnce(new Error('Network error'));

				await expect(orderService.createPaymentLink(MOCK_ORDER.id, 'vnpay')).rejects.toThrow(
					InternalServerError,
				);
			});
		});

		describe('createPaymentAndGetUrl()', () => {
			let fetchMock: any;

			beforeEach(() => {
				fetchMock = spyOn(global, 'fetch');
			});

			it('TC-ORD-PAY-06: Should return payment URL string', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_ORDER]);
				fetchMock.mockResolvedValueOnce({
					ok: true,
					json: async () => MOCK_PAYMENT_RESPONSE,
				});

				const result = await orderService.createPaymentAndGetUrl(MOCK_ORDER.id, 'vnpay');

				expect(result).toBe(MOCK_PAYMENT_RESPONSE.paymentUrl);
			});

			it('TC-ORD-PAY-07: Should throw InternalServerError on failure', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_ORDER]);
				fetchMock.mockRejectedValueOnce(new Error('Payment error'));

				await expect(orderService.createPaymentAndGetUrl(MOCK_ORDER.id, 'vnpay')).rejects.toThrow(
					InternalServerError,
				);
			});
		});
	});

	// ========================================================================
	// SECTION 9: PRODUCT OPERATIONS
	// ========================================================================
	describe('Product Operations', () => {
		let fetchMock: any;

		beforeEach(() => {
			fetchMock = spyOn(global, 'fetch');
		});

		describe('getProductDetails()', () => {
			it('TC-ORD-PROD-01: Should fetch product details successfully', async () => {
				fetchMock.mockResolvedValueOnce({
					ok: true,
					json: async () => MOCK_PRODUCT,
				});

				const result = await orderService.getProductDetails('50');

				expect(result.id).toBe(MOCK_PRODUCT.id);
				expect(result.name).toBe(MOCK_PRODUCT.name);
				expect(result.price).toBe(MOCK_PRODUCT.price);
			});

			it('TC-ORD-PROD-02: Should throw InternalServerError when product service fails', async () => {
				fetchMock.mockResolvedValueOnce({
					ok: false,
					json: async () => ({ error: 'Product not found' }),
				});

				await expect(orderService.getProductDetails('999')).rejects.toThrow(InternalServerError);
			});

			it('TC-ORD-PROD-03: Should throw InternalServerError on network error', async () => {
				fetchMock.mockRejectedValueOnce(new Error('Network error'));

				await expect(orderService.getProductDetails('50')).rejects.toThrow(InternalServerError);
			});
		});

		describe('calculateTotalAmount()', () => {
			it('TC-ORD-CALC-01: Should calculate total correctly', async () => {
				fetchMock
					.mockResolvedValueOnce({
						ok: true,
						json: async () => ({ ...MOCK_PRODUCT, price: 100000 }),
					})
					.mockResolvedValueOnce({
						ok: true,
						json: async () => ({ ...MOCK_PRODUCT, id: '51', price: 200000 }),
					});

				const items = [
					{ product_id: '50', quantity: 2 },
					{ product_id: '51', quantity: 1 },
				];

				const result = await orderService.calculateTotalAmount(items);

				expect(result.total).toBe(400000); // (100000 * 2) + (200000 * 1)
				expect(Object.keys(result.productMap)).toHaveLength(2);
			});

			it('TC-ORD-CALC-02: Should return productMap with correct data', async () => {
				fetchMock.mockResolvedValueOnce({
					ok: true,
					json: async () => MOCK_PRODUCT,
				});

				const items = [{ product_id: '50', quantity: 1 }];

				const result = await orderService.calculateTotalAmount(items);

				expect(result.productMap['50']).toEqual({
					name: MOCK_PRODUCT.name,
					price: MOCK_PRODUCT.price,
					imageUrl: MOCK_PRODUCT.imageUrl,
				});
			});

			it('TC-ORD-CALC-03: Should throw InternalServerError when product fetch fails', async () => {
				fetchMock.mockRejectedValueOnce(new Error('Fetch error'));

				const items = [{ product_id: '50', quantity: 1 }];

				await expect(orderService.calculateTotalAmount(items)).rejects.toThrow(InternalServerError);
			});
		});
	});

	// ========================================================================
	// SECTION 10: EDGE CASES
	// ========================================================================
	describe('Edge Cases', () => {
		it('TC-ORD-EDGE-01: Should handle order with zero total amount', async () => {
			const orderInput = {
				user_id: MOCK_ORDER.user_id,
				total_amount: 0,
				status: 'pending' as const,
				shipping_address: '123 Main Street, Ward 1, Ho Chi Minh, Vietnam',
			};

			dbExecutor.mockResolvedValueOnce([{ ...MOCK_ORDER, total_amount: 0 }]);

			const result = await orderService.createOrder(orderInput);

			expect(result.total_amount).toBe(0);
		});

		it('TC-ORD-EDGE-02: Should serialize object address to string', async () => {
			const orderInput = {
				user_id: MOCK_ORDER.user_id,
				total_amount: 500000,
				status: 'pending' as const,
				shipping_address: MOCK_VALID_ADDRESS,
			};

			dbExecutor.mockResolvedValueOnce([MOCK_ORDER]);

			await orderService.createOrder(orderInput as any);

			expect(mockDb.values).toHaveBeenCalledWith(
				expect.objectContaining({
					shipping_address: expect.any(String),
				}),
			);
		});

		it('TC-ORD-EDGE-03: Should handle address validation with optional postal_code null', async () => {
			const orderInput = {
				user_id: MOCK_ORDER.user_id,
				total_amount: 500000,
				status: 'pending' as const,
				shipping_address: {
					...MOCK_VALID_ADDRESS,
					postal_code: null,
				},
			};

			dbExecutor.mockResolvedValueOnce([MOCK_ORDER]);

			const result = await orderService.createOrder(orderInput as any);

			expect(result).toBeDefined();
		});

		it('TC-ORD-EDGE-04: Should reject invalid is_default value', async () => {
			const orderInput = {
				user_id: MOCK_ORDER.user_id,
				total_amount: 500000,
				status: 'pending' as const,
				shipping_address: {
					...MOCK_VALID_ADDRESS,
					is_default: 5, // Invalid, should be 0 or 1
				},
			};

			await expect(orderService.createOrder(orderInput as any)).rejects.toThrow(BadRequestError);
		});
	});
});
