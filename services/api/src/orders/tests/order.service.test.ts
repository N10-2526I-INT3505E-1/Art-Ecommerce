import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { InternalServerError } from '@common/errors/httpErrors';
import { ordersTable } from '@order/order.model';
import { OrderService } from '@order/order.service';

type Order = typeof ordersTable.$inferSelect;

const mockFullOrder: Order = {
    id: 1,
    user_id: 1,
    total_amount: 100.50,
    status: 'pending',
    shipping_address: '123 Test St, Test City, TC 12345',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

describe('OrderService', () => {
    let orderService: OrderService;
    let mockDb: any;

    beforeEach(() => {
        // Mock Drizzle Chain
        mockDb = {
            select: mock().mockReturnThis(),
            from: mock().mockReturnThis(),
            where: mock().mockResolvedValue([]),
            insert: mock().mockReturnThis(),
            values: mock().mockReturnThis(),
            returning: mock().mockResolvedValue([]),
            delete: mock().mockReturnThis(),
            update: mock().mockReturnThis(),
            set: mock().mockReturnThis(),
        };
        
        // Inject mock DB
        orderService = new OrderService(mockDb);
    });

    describe('createOrder', () => {
        it('should create and return a new order', async () => {
            // Arrange
            mockDb.returning.mockResolvedValue([mockFullOrder]);
            const newOrderData = {
                user_id: 1,
                total_amount: 100.50,
                status: 'pending' as const,
                shipping_address: '123 Test St, Test City, TC 12345'
            };

            // Act
            const result = await orderService.createOrder(newOrderData);

            // Assert
            expect(result).toEqual(mockFullOrder);
            expect(mockDb.insert).toHaveBeenCalled();
            expect(mockDb.values).toHaveBeenCalled();
            expect(mockDb.returning).toHaveBeenCalled();
        });

        it('throws InternalServerError when DB does not return the created row', async () => {
            // Arrange
            mockDb.returning.mockResolvedValue([]);
            const newOrderData = {
                user_id: 1,
                total_amount: 100.50,
                status: 'pending' as const,
                shipping_address: '123 Test St, Test City, TC 12345'
            };

            // Act & Assert
            await expect(orderService.createOrder(newOrderData))
                .rejects
                .toBeInstanceOf(InternalServerError);
        });
    });
});