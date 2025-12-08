import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { InternalServerError, NotFoundError } from '@common/errors/httpErrors';
import { ProductService } from '@product/product.service';

// --- Mock Database Setup ---
const mockDb = {
	transaction: mock(async (callback) => await callback(mockDb)),
	query: {
		categories: { findFirst: mock() },
		tags: { findFirst: mock(), findMany: mock() },
		products: { findFirst: mock(), findMany: mock() },
		product_tags: { findMany: mock() },
	},
	insert: mock(() => ({
		values: mock(() => ({
			returning: mock(() => []),
			onConflictDoUpdate: mock(() => ({ returning: mock(() => []) })),
			onConflictDoNothing: mock(),
		})),
	})),
	update: mock(() => ({
		set: mock(() => ({
			where: mock(() => ({ returning: mock(() => []) })),
		})),
	})),
	delete: mock(() => ({ where: mock() })),
	select: mock(() => ({
		from: mock(() => ({ where: mock(() => []) })),
	})),
};

describe('ProductService', () => {
	let service: ProductService;

	beforeEach(() => {
		// Reset tất cả mock trước mỗi test
		Object.values(mockDb.query.categories).forEach((m) => m.mockReset());
		Object.values(mockDb.query.tags).forEach((m) => m.mockReset());
		Object.values(mockDb.query.products).forEach((m) => m.mockReset());
		Object.values(mockDb.query.product_tags).forEach((m) => m.mockReset());
		mockDb.insert.mockClear();
		mockDb.update.mockClear();
		mockDb.delete.mockClear();
		mockDb.select.mockClear();
		mockDb.transaction.mockClear();

		service = new ProductService(mockDb as any);
	});

	describe('Tạo sản phẩm', () => {
		test('TC-PD-01: Tạo sản phẩm mới với thông tin hợp lệ, DB hoạt động bình thường', async () => {
			const inputData = {
				name: 'Test Product',
				price: 100,
				categoryName: 'Test Category',
				tags: ['Tag1'],
			};
			const mockCreatedProduct = { id: 'prod-1', ...inputData };

			mockDb.query.categories.findFirst.mockResolvedValue(null);
			mockDb.query.tags.findFirst.mockResolvedValue(null);

			const insertReturningMock = mock()
				.mockResolvedValueOnce([{ id: 'cat-1' }]) // New Category
				.mockResolvedValueOnce([mockCreatedProduct]) // New Product
				.mockResolvedValueOnce([{ id: 'tag-1' }]); // New Tag

			mockDb.insert.mockImplementation(() => ({
				values: () => ({
					returning: insertReturningMock,
					onConflictDoUpdate: () => ({ returning: insertReturningMock }),
					onConflictDoNothing: mock(),
				}),
			}));

			const result = await service.createProduct(inputData);
			expect(result).toEqual(mockCreatedProduct);
		});

		test('TC-PD-02: Tạo sản phẩm mới với thông tin hợp lệ, DB lỗi', async () => {
			mockDb.transaction.mockImplementationOnce(() => {
				throw new Error('DB Connection Error');
			});
			await expect(service.createProduct({ name: 'Error' })).rejects.toThrow(InternalServerError);
		});
	});

	describe('Cập nhật sản phẩm', () => {
		test('TC-PD-03: Cập nhật với ID sản phẩm có tồn tại', async () => {
			const id = 'prod-1';
			const updatedProduct = { id, name: 'Updated Name' };
			mockDb.query.products.findFirst.mockResolvedValue({ id, name: 'Old Name' });
			const returningMock = mock().mockResolvedValue([updatedProduct]);
			mockDb.update.mockImplementation(() => ({
				set: () => ({ where: () => ({ returning: returningMock }) }),
			}));

			const result = await service.update(id, { name: 'Updated Name' });
			expect(result).toEqual(updatedProduct);
		});

		test('TC-PD-04: Cập nhật với ID sản phẩm không tồn tại', async () => {
			mockDb.query.products.findFirst.mockResolvedValue(null);
			await expect(service.update('non-existent', {})).rejects.toThrow(NotFoundError);
		});
	});

	describe('Xóa sản phẩm', () => {
		test('TC-PD-05: Xóa mềm (set deletedAt) với ID tồn tại', async () => {
			const id = 'prod-1';
			const returningMock = mock().mockResolvedValue([{ id, deletedAt: new Date() }]);
			mockDb.update.mockImplementation(() => ({
				set: () => ({ where: () => ({ returning: returningMock }) }),
			}));

			const result = await service.delete(id);
			expect(result).toEqual({ message: `Soft deleted product ${id}` });
		});

		test('TC-PD-06: Xóa với ID không tồn tại', async () => {
			const returningMock = mock().mockResolvedValue([]); // Không có bản ghi nào được update
			mockDb.update.mockImplementation(() => ({
				set: () => ({ where: () => ({ returning: returningMock }) }),
			}));

			await expect(service.delete('non-existent')).rejects.toThrow(NotFoundError);
		});
	});

	describe('Lấy thông tin sản phẩm', () => {
		test('TC-PD-07: Lấy với ID có tồn tại', async () => {
			const id = 'prod-1';
			const mockProduct = { id, name: 'P1', productTags: [{ tag: { name: 'A' } }] };
			mockDb.query.products.findFirst.mockResolvedValue(mockProduct);

			const result = await service.getById(id);
			expect(result.id).toBe(id);
			expect(result.tags).toEqual([{ name: 'A' }]);
		});

		test('TC-PD-08: Lấy với ID không tồn tại', async () => {
			mockDb.query.products.findFirst.mockResolvedValue(null);
			expect(service.getById('unknown')).rejects.toThrow(NotFoundError);
		});

		test('TC-PD-09: Lấy với ID sản phẩm đã bị xoá mềm (mong đợi 404)', async () => {
			// Arrange: Service trả về một sản phẩm có trường `deletedAt`
			const id = 'deleted-prod';
			const mockDeletedProduct = { id, name: 'Deleted', deletedAt: new Date(), productTags: [] };
			mockDb.query.products.findFirst.mockResolvedValue(mockDeletedProduct);

			// Act & Assert
			expect(service.getById(id)).rejects.toThrow(new NotFoundError('Product not found.'));
		});
	});

	describe('Tìm và lọc sản phẩm', () => {
		test('TC-PD-10: Lấy danh sách sản phẩm có phân trang', async () => {
			mockDb.query.products.findMany.mockResolvedValue(Array(5).fill({}));
			const mockSelectChain = { from: () => ({ where: () => Promise.resolve([{ count: 20 }]) }) };
			mockDb.select.mockImplementation(() => mockSelectChain);

			const result = await service.getAll({ page: '2', limit: '5' });
			expect(result.data).toHaveLength(5);
			expect(result.pagination.page).toBe(2);
			expect(result.pagination.total).toBe(20);
		});

		test('TC-PD-11: Lọc sản phẩm theo category và khoảng giá', async () => {
			mockDb.query.products.findMany.mockResolvedValue([{ id: '1' }]);
			const mockSelectChain = { from: () => ({ where: () => Promise.resolve([{ count: 1 }]) }) };
			mockDb.select.mockImplementation(() => mockSelectChain);

			const result = await service.getAll({
				categoryId: 'cat-1',
				minPrice: '100',
				maxPrice: '500',
			});
			expect(result.data).toHaveLength(1);
		});

		// test.fails("TC-PD-12: Tìm kiếm fuzzy cho 'ki ln' trả về các sản phẩm liên quan", () => {
		// 	expect(true).toBe(false); // Tạm thời đặt là false để test này luôn fail
		// });

		test('TC-PD-13: Lọc/tìm nhưng không tìm thấy kết quả nào', async () => {
			mockDb.query.products.findMany.mockResolvedValue([]);
			const mockSelectChain = { from: () => ({ where: () => Promise.resolve([{ count: 0 }]) }) };
			mockDb.select.mockImplementation(() => mockSelectChain);

			const result = await service.getAll({ search: 'nomatch' });
			expect(result.data).toEqual([]);
			expect(result.pagination.total).toBe(0);
		});
	});
});
