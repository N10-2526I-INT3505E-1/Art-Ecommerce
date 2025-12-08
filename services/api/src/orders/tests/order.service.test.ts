import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { InternalServerError, NotFoundError } from '@common/errors/httpErrors';
import { ordersTable } from '@order/order.model';
import { desc, eq } from 'drizzle-orm';
import { OrderService } from '@order/order.service';
import { orderItemsTable } from '@order/order_item.model';

// 1. Mock Data Fixtures
const MOCK_ORDER = {
	id: 1,
	user_id: '018d96c4-72b3-7000-9000-000000000000',
	total_amount: '500000',
	status: 'pending',
	created_at: new Date(),
	updated_at: new Date(),
};

const MOCK_ITEM_INPUT = {
	product_id: 50,
	quantity: 2,
	price_per_item: '100000',
	product_snapshot: { name: 'Art Painting', artist: 'Van Gogh' },
};

const MOCK_ITEM_DB = {
	id: 1,
	order_id: 1,
	product_id: 50,
	quantity: 2,
	price_per_item: '100000',
	product_snapshot: '{"name":"Art Painting","artist":"Van Gogh"}',
};

describe('OrderService', () => {
	let orderService: OrderService;
	let mockDb: any;
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
			then: (resolve: any, reject: any) => dbExecutor().then(resolve, reject),
			get $dynamic() {
				return this;
			},
		};
		orderService = new OrderService(mockDb);
	});

	/* Nhóm chức năng: Tạo đơn hàng */
	describe('Tạo đơn hàng (Create Order)', () => {
		const newOrderInput: any = {
			user_id: '018d96c4-72b3-7000-9000-000000000000',
			total_amount: '500000',
			status: 'pending',
		};

		it('TC-OD-01: Tạo đơn hàng thành công khi input hợp lệ và DB hoạt động bình thường', async () => {
			dbExecutor.mockResolvedValue([MOCK_ORDER]);
			const result = await orderService.createOrder(newOrderInput);
			expect(result).toEqual(MOCK_ORDER);
			expect(mockDb.insert).toHaveBeenCalledWith(ordersTable);
			expect(mockDb.values).toHaveBeenCalledWith(newOrderInput);
		});

		it('TC-OD-02: Ném lỗi InternalServerError khi DB gặp lỗi (vd: connection timeout)', async () => {
			dbExecutor.mockRejectedValue(new Error('Connection timeout'));
			await expect(orderService.createOrder(newOrderInput)).rejects.toThrow(
				new InternalServerError('Lỗi hệ thống khi tạo đơn hàng.'),
			);
		});

		it('Ném lỗi InternalServerError nếu DB không trả về bản ghi nào sau khi insert', async () => {
			dbExecutor.mockResolvedValue([]); // Trường hợp insert không thành công nhưng không báo lỗi
			await expect(orderService.createOrder(newOrderInput)).rejects.toThrow(
				new InternalServerError('Lỗi hệ thống khi tạo đơn hàng.'),
			);
		});
	});

	/* Nhóm chức năng: Lấy thông tin đơn hàng */
	describe('Lấy thông tin đơn hàng (Get Order Info)', () => {
		it('TC-OD-04: Lấy thông tin đơn hàng theo ID thành công khi ID có tồn tại', async () => {
			dbExecutor.mockResolvedValue([MOCK_ORDER]);
			const result = await orderService.getOrderById(1);
			expect(result).toEqual(MOCK_ORDER);
			expect(mockDb.where).toHaveBeenCalledWith(eq(ordersTable.id, 1));
		});

		it('TC-OD-05: Ném lỗi NotFoundError khi lấy đơn hàng với ID không tồn tại', async () => {
			dbExecutor.mockResolvedValue([]);
			await expect(orderService.getOrderById(999)).rejects.toThrow(
				new NotFoundError('Không tìm thấy đơn hàng với ID: 999'),
			);
		});

		it('TC-OD-06: Lấy tất cả đơn hàng thành công khi DB có dữ liệu', async () => {
			const mockOrderList = [MOCK_ORDER, { ...MOCK_ORDER, id: 2 }];
			dbExecutor.mockResolvedValue(mockOrderList);
			const result = await orderService.getAllOrders();
			expect(result).toHaveLength(2);
			expect(result).toEqual(mockOrderList);
			expect(mockDb.select).toHaveBeenCalled();
		});

		it('TC-OD-07: Trả về mảng rỗng khi lấy tất cả đơn hàng và DB không có dữ liệu', async () => {
			dbExecutor.mockResolvedValue([]); // DB rỗng
			const result = await orderService.getAllOrders();
			expect(result).toEqual([]); // Mong đợi mảng rỗng, không phải lỗi 404
		});
	});

	/* Nhóm chức năng: Cập nhật đơn hàng */
	describe('Cập nhật đơn hàng (Update Order)', () => {
		it('TC-OD-08: Cập nhật đơn hàng thành công khi ID tồn tại', async () => {
			const updatedOrder = { ...MOCK_ORDER, status: 'shipped' };
			dbExecutor.mockResolvedValue([updatedOrder]);
			const result = await orderService.updateOrder(1, { status: 'shipped' } as any);
			expect(result.status).toBe('shipped');
			expect(mockDb.update).toHaveBeenCalledWith(ordersTable);
			expect(mockDb.set).toHaveBeenCalledWith({ status: 'shipped' });
		});

		it('TC-OD-09: Ném lỗi NotFoundError khi cập nhật đơn hàng với ID không tồn tại', async () => {
			dbExecutor.mockResolvedValue([]);
			await expect(orderService.updateOrder(999, { status: 'cancelled' } as any)).rejects.toThrow(
				new NotFoundError('Không thể cập nhật. Đơn hàng ID 999 không tồn tại.'),
			);
		});
	});

	/* Nhóm chức năng: Xoá đơn hàng */
	describe('Xoá đơn hàng (Delete Order)', () => {
		it('TC-OD-10: Xoá đơn hàng thành công khi ID có tồn tại', async () => {
			dbExecutor.mockResolvedValue([MOCK_ORDER]);
			const result = await orderService.deleteOrder(1);
			expect(result).toEqual(MOCK_ORDER);
			expect(mockDb.delete).toHaveBeenCalledWith(ordersTable);
			expect(mockDb.where).toHaveBeenCalledWith(eq(ordersTable.id, 1));
		});

		it('TC-OD-11: Ném lỗi NotFoundError khi xoá đơn hàng với ID không tồn tại', async () => {
			dbExecutor.mockResolvedValue([]);
			await expect(orderService.deleteOrder(999)).rejects.toThrow(
				new NotFoundError('Không thể xóa. Đơn hàng ID 999 không tồn tại.'),
			);
		});
	});

	/* Nhóm chức năng: Quản lý sản phẩm trong đơn hàng */
	describe('Quản lý sản phẩm trong đơn hàng (Order Items)', () => {
		it('Thêm sản phẩm vào đơn hàng thành công', async () => {
			dbExecutor.mockResolvedValue([MOCK_ITEM_DB]);
			const result = await orderService.addItemToOrder(1, MOCK_ITEM_INPUT);
			expect(result).toEqual(MOCK_ITEM_DB);
			// Kiểm tra logic quan trọng: product_snapshot phải được stringify
			expect(mockDb.values).toHaveBeenCalledWith(
				expect.objectContaining({
					product_snapshot: JSON.stringify(MOCK_ITEM_INPUT.product_snapshot),
				}),
			);
		});

		it('TC-OD-03: Ném lỗi InternalServerError khi thêm sản phẩm vào đơn hàng thất bại (lỗi DB)', async () => {
			dbExecutor.mockResolvedValue([]); // Giả lập insert vào order_items thất bại
			await expect(orderService.addItemToOrder(1, MOCK_ITEM_INPUT)).rejects.toThrow(
				new InternalServerError('Không thể thêm sản phẩm vào đơn hàng.'),
			);
		});

		it('Lấy danh sách sản phẩm của đơn hàng thành công và parse product_snapshot', async () => {
			dbExecutor.mockResolvedValue([MOCK_ITEM_DB]);
			const results = await orderService.getOrderItems(1);
			expect(results).toHaveLength(1);
			// Kiểm tra logic quan trọng: String từ DB phải được parse thành Object
			expect(results[0].product_snapshot).toEqual(MOCK_ITEM_INPUT.product_snapshot);
			expect(typeof results[0].product_snapshot).toBe('object');
		});
	});
});
