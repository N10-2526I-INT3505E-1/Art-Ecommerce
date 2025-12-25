import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { BadRequestError, InternalServerError, NotFoundError } from '@common/errors/httpErrors';
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

	// ========================================================================
	// SECTION 1: CREATE PRODUCT
	// ========================================================================
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
			await expect(service.createProduct({ name: 'Error', price: 100 })).rejects.toThrow(
				InternalServerError,
			);
		});
	});

	// ========================================================================
	// SECTION 2: UPDATE PRODUCT
	// ========================================================================
	describe('Cập nhật sản phẩm', () => {
		test('TC-PD-03: Cập nhật với ID sản phẩm có tồn tại', async () => {
			const id = 'prod-1';
			mockDb.query.products.findFirst.mockResolvedValue({ id, name: 'Old Name' });

			const returningMock = mock().mockResolvedValue([{ id, name: 'Updated Name' }]);
			mockDb.update.mockImplementation(() => ({
				set: () => ({ where: () => ({ returning: returningMock }) }),
			}));

			const result = await service.update(id, { name: 'Updated Name' });
			// Service returns message object, not the updated product
			expect(result).toEqual({ message: `Product ${id} updated successfully` });
		});

		test('TC-PD-04: Cập nhật với ID sản phẩm không tồn tại', async () => {
			mockDb.query.products.findFirst.mockResolvedValue(null);
			await expect(service.update('non-existent', {})).rejects.toThrow(NotFoundError);
		});

		test('TC-PD-14: Cập nhật với category mới', async () => {
			const id = 'prod-1';
			mockDb.query.products.findFirst.mockResolvedValue({ id, name: 'Product' });
			mockDb.query.categories.findFirst.mockResolvedValue(null);

			const insertReturningMock = mock().mockResolvedValueOnce([{ id: 'cat-new' }]);
			const updateReturningMock = mock().mockResolvedValue([{ id }]);

			mockDb.insert.mockImplementation(() => ({
				values: () => ({ returning: insertReturningMock }),
			}));
			mockDb.update.mockImplementation(() => ({
				set: () => ({ where: () => ({ returning: updateReturningMock }) }),
			}));

			const result = await service.update(id, { categoryName: 'New Category' });
			expect(result).toEqual({ message: `Product ${id} updated successfully` });
		});

		test('TC-PD-15: Cập nhật với tags mới', async () => {
			const id = 'prod-1';
			mockDb.query.products.findFirst.mockResolvedValue({ id, name: 'Product' });
			mockDb.query.tags.findFirst.mockResolvedValue(null);

			const insertReturningMock = mock().mockResolvedValueOnce([{ id: 'tag-new' }]);
			const updateReturningMock = mock().mockResolvedValue([{ id }]);
			const deleteMock = mock().mockReturnThis();

			mockDb.insert.mockImplementation(() => ({
				values: () => ({
					returning: insertReturningMock,
					onConflictDoNothing: mock(),
				}),
			}));
			mockDb.update.mockImplementation(() => ({
				set: () => ({ where: () => ({ returning: updateReturningMock }) }),
			}));
			mockDb.delete.mockImplementation(() => ({ where: deleteMock }));

			const result = await service.update(id, { tags: ['NewTag'] });
			expect(result).toEqual({ message: `Product ${id} updated successfully` });
		});
	});

	// ========================================================================
	// SECTION 3: DELETE PRODUCT
	// ========================================================================
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

	// ========================================================================
	// SECTION 4: GET PRODUCT BY ID
	// ========================================================================
	describe('Lấy thông tin sản phẩm', () => {
		test('TC-PD-07: Lấy với ID có tồn tại', async () => {
			const id = 'prod-1';
			const mockProduct = { id, name: 'P1', productTags: [{ tag: { name: 'A' } }] };
			mockDb.query.products.findFirst.mockResolvedValue(mockProduct);

			const result = await service.getById(id);
			expect(result.id).toBe(id);
			// Tags are flattened to string array, not objects
			expect(result.tags).toEqual(['A']);
		});

		test('TC-PD-08: Lấy với ID không tồn tại', async () => {
			mockDb.query.products.findFirst.mockResolvedValue(null);
			await expect(service.getById('unknown')).rejects.toThrow(NotFoundError);
		});

		test('TC-PD-09: Lấy với ID sản phẩm đã bị xoá mềm (mong đợi 404)', async () => {
			// The service uses WHERE isNull(deletedAt), so DB returns null for deleted products
			const id = 'deleted-prod';
			mockDb.query.products.findFirst.mockResolvedValue(null);

			await expect(service.getById(id)).rejects.toThrow(NotFoundError);
		});
	});

	// ========================================================================
	// SECTION 5: GET ALL PRODUCTS (FILTER + PAGINATION)
	// ========================================================================
	describe('Tìm và lọc sản phẩm', () => {
		test('TC-PD-10: Lấy danh sách sản phẩm có phân trang', async () => {
			const mockProducts = Array(5)
				.fill(null)
				.map((_, i) => ({
					id: `prod-${i}`,
					name: `Product ${i}`,
					productTags: [],
				}));
			mockDb.query.products.findMany.mockResolvedValue(mockProducts);
			const mockSelectChain = { from: () => ({ where: () => Promise.resolve([{ count: 20 }]) }) };
			mockDb.select.mockImplementation(() => mockSelectChain);

			const result = await service.getAll({ page: '2', limit: '5' });
			expect(result.data).toHaveLength(5);
			expect(result.pagination.page).toBe(2);
			expect(result.pagination.total).toBe(20);
		});

		test('TC-PD-11: Lọc sản phẩm theo category và khoảng giá', async () => {
			mockDb.query.products.findMany.mockResolvedValue([{ id: '1', productTags: [] }]);
			const mockSelectChain = { from: () => ({ where: () => Promise.resolve([{ count: 1 }]) }) };
			mockDb.select.mockImplementation(() => mockSelectChain);

			const result = await service.getAll({
				categoryId: 'cat-1',
				minPrice: '100',
				maxPrice: '500',
			});
			expect(result.data).toHaveLength(1);
		});

		test('TC-PD-13: Lọc/tìm nhưng không tìm thấy kết quả nào', async () => {
			mockDb.query.products.findMany.mockResolvedValue([]);
			const mockSelectChain = { from: () => ({ where: () => Promise.resolve([{ count: 0 }]) }) };
			mockDb.select.mockImplementation(() => mockSelectChain);

			const result = await service.getAll({ search: 'nomatch' });
			expect(result.data).toEqual([]);
			expect(result.pagination.total).toBe(0);
		});

		test('TC-PD-16: Tìm kiếm với search term', async () => {
			const mockProducts = [{ id: 'prod-1', name: 'Kỳ Lân Art', productTags: [] }];
			mockDb.query.products.findMany.mockResolvedValue(mockProducts);
			const mockSelectChain = { from: () => ({ where: () => Promise.resolve([{ count: 1 }]) }) };
			mockDb.select.mockImplementation(() => mockSelectChain);

			const result = await service.getAll({ search: 'Kỳ Lân' });
			expect(result.data).toHaveLength(1);
		});

		test('TC-PD-17: Lấy danh sách với giá trị mặc định', async () => {
			mockDb.query.products.findMany.mockResolvedValue([]);
			const mockSelectChain = { from: () => ({ where: () => Promise.resolve([{ count: 0 }]) }) };
			mockDb.select.mockImplementation(() => mockSelectChain);

			const result = await service.getAll({});
			expect(result.pagination.page).toBe(1);
			expect(result.pagination.limit).toBe(12);
		});

		test('TC-PD-18: Lấy danh sách khi DB lỗi', async () => {
			mockDb.query.products.findMany.mockRejectedValue(new Error('DB Error'));

			await expect(service.getAll({})).rejects.toThrow(InternalServerError);
		});
	});

	// ========================================================================
	// SECTION 6: GET RECOMMENDATIONS
	// ========================================================================
	describe('Gợi ý sản phẩm (Recommendations)', () => {
		test('TC-PD-19: Lấy gợi ý với tags hợp lệ', async () => {
			const inputTags = ['art', 'vintage'];
			const mockTagRecords = [
				{ id: 'tag-1', name: 'art' },
				{ id: 'tag-2', name: 'vintage' },
			];
			const mockProductTags = [
				{ tagId: 'tag-1', product: { id: 'prod-1', name: 'Art 1', deletedAt: null } },
				{ tagId: 'tag-2', product: { id: 'prod-2', name: 'Art 2', deletedAt: null } },
			];

			mockDb.query.tags.findMany.mockResolvedValue(mockTagRecords);
			mockDb.query.product_tags.findMany.mockResolvedValue(mockProductTags);

			const result = await service.getRecommendations(inputTags);
			expect(result).toHaveLength(2);
		});

		test('TC-PD-20: Lấy gợi ý với tags rỗng', async () => {
			const result = await service.getRecommendations([]);
			expect(result).toEqual([]);
		});

		test('TC-PD-21: Lấy gợi ý khi không tìm thấy tags trong DB', async () => {
			mockDb.query.tags.findMany.mockResolvedValue([]);

			const result = await service.getRecommendations(['nonexistent']);
			expect(result).toEqual([]);
		});

		test('TC-PD-22: Lấy gợi ý loại bỏ sản phẩm đã xóa', async () => {
			const inputTags = ['art'];
			const mockTagRecords = [{ id: 'tag-1', name: 'art' }];
			const mockProductTags = [
				{ tagId: 'tag-1', product: { id: 'prod-1', name: 'Active', deletedAt: null } },
				{ tagId: 'tag-1', product: { id: 'prod-2', name: 'Deleted', deletedAt: new Date() } },
			];

			mockDb.query.tags.findMany.mockResolvedValue(mockTagRecords);
			mockDb.query.product_tags.findMany.mockResolvedValue(mockProductTags);

			const result = await service.getRecommendations(inputTags);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('prod-1');
		});

		test('TC-PD-23: Lấy gợi ý khi DB lỗi', async () => {
			mockDb.query.tags.findMany.mockRejectedValue(new Error('DB Error'));

			await expect(service.getRecommendations(['art'])).rejects.toThrow(InternalServerError);
		});
	});

	// ========================================================================
	// SECTION 7: GET RELATED PRODUCTS
	// ========================================================================
	describe('Sản phẩm liên quan', () => {
		test('TC-PD-24: Lấy sản phẩm liên quan với ID hợp lệ', async () => {
			const currentProduct = { id: 'prod-1', categoryId: 'cat-1' };
			const relatedProducts = [
				{ id: 'prod-2', categoryId: 'cat-1' },
				{ id: 'prod-3', categoryId: 'cat-1' },
			];

			mockDb.query.products.findFirst.mockResolvedValue(currentProduct);
			mockDb.query.products.findMany.mockResolvedValue(relatedProducts);

			const result = await service.getRelated('prod-1');
			expect(result).toHaveLength(2);
		});

		test('TC-PD-25: Lấy sản phẩm liên quan với ID không tồn tại', async () => {
			mockDb.query.products.findFirst.mockResolvedValue(null);

			await expect(service.getRelated('non-existent')).rejects.toThrow(NotFoundError);
		});

		test('TC-PD-26: Lấy sản phẩm liên quan khi sản phẩm không có category', async () => {
			const currentProduct = { id: 'prod-1', categoryId: null };
			mockDb.query.products.findFirst.mockResolvedValue(currentProduct);

			const result = await service.getRelated('prod-1');
			expect(result).toEqual([]);
		});

		test('TC-PD-27: Lấy sản phẩm liên quan khi DB lỗi', async () => {
			mockDb.query.products.findFirst.mockRejectedValue(new Error('DB Error'));

			await expect(service.getRelated('prod-1')).rejects.toThrow(InternalServerError);
		});
	});

	// ========================================================================
	// SECTION 8: GET ALL CATEGORIES
	// ========================================================================
	describe('Danh mục sản phẩm', () => {
		test('TC-PD-28: Lấy tất cả categories', async () => {
			const mockCategories = [
				{ id: 'cat-1', name: 'Art', slug: 'art' },
				{ id: 'cat-2', name: 'Sculpture', slug: 'sculpture' },
			];
			const mockSelectChain = { from: () => Promise.resolve(mockCategories) };
			mockDb.select.mockImplementation(() => mockSelectChain);

			const result = await service.getAllCategories();
			expect(result).toHaveLength(2);
		});

		test('TC-PD-29: Lấy categories khi DB lỗi', async () => {
			const mockSelectChain = { from: () => Promise.reject(new Error('DB Error')) };
			mockDb.select.mockImplementation(() => mockSelectChain);

			await expect(service.getAllCategories()).rejects.toThrow(InternalServerError);
		});
	});

	// ========================================================================
	// SECTION 9: GET ALL TAGS
	// ========================================================================
	describe('Tags sản phẩm', () => {
		test('TC-PD-30: Lấy tất cả tags', async () => {
			const mockTags = [
				{ id: 'tag-1', name: 'vintage', type: 'auto' },
				{ id: 'tag-2', name: 'modern', type: 'auto' },
			];
			const mockSelectChain = { from: () => Promise.resolve(mockTags) };
			mockDb.select.mockImplementation(() => mockSelectChain);

			const result = await service.getAllTags();
			expect(result).toHaveLength(2);
		});

		test('TC-PD-31: Lấy tags khi DB lỗi', async () => {
			const mockSelectChain = { from: () => Promise.reject(new Error('DB Error')) };
			mockDb.select.mockImplementation(() => mockSelectChain);

			await expect(service.getAllTags()).rejects.toThrow(InternalServerError);
		});
	});

	// ========================================================================
	// SECTION 10: REDUCE STOCK
	// ========================================================================
	describe('Giảm tồn kho (Reduce Stock)', () => {
		test('TC-PD-32: Giảm tồn kho thành công với items hợp lệ', async () => {
			const items = [{ productId: 'prod-1', quantity: 2 }];
			const returningMock = mock().mockResolvedValue([
				{ id: 'prod-1', name: 'Product 1', stock: 8 },
			]);
			mockDb.update.mockImplementation(() => ({
				set: () => ({ where: () => ({ returning: returningMock }) }),
			}));

			const result = await service.reduceStock(items);
			expect(result).toEqual({ message: 'Stock reduced successfully' });
		});

		test('TC-PD-33: Giảm tồn kho thất bại với items rỗng', async () => {
			await expect(service.reduceStock([])).rejects.toThrow(BadRequestError);
		});

		test('TC-PD-34: Giảm tồn kho thất bại với quantity <= 0', async () => {
			const items = [{ productId: 'prod-1', quantity: 0 }];

			await expect(service.reduceStock(items)).rejects.toThrow(BadRequestError);
		});

		test('TC-PD-35: Giảm tồn kho thất bại khi sản phẩm không tồn tại', async () => {
			const items = [{ productId: 'non-existent', quantity: 2 }];
			const returningMock = mock().mockResolvedValue([]);
			mockDb.update.mockImplementation(() => ({
				set: () => ({ where: () => ({ returning: returningMock }) }),
			}));
			mockDb.query.products.findFirst.mockResolvedValue(null);

			await expect(service.reduceStock(items)).rejects.toThrow(NotFoundError);
		});

		test('TC-PD-36: Giảm tồn kho thất bại khi không đủ stock', async () => {
			const items = [{ productId: 'prod-1', quantity: 100 }];
			const returningMock = mock().mockResolvedValue([]);
			mockDb.update.mockImplementation(() => ({
				set: () => ({ where: () => ({ returning: returningMock }) }),
			}));
			mockDb.query.products.findFirst.mockResolvedValue({
				id: 'prod-1',
				name: 'Product 1',
				stock: 5,
				deletedAt: null,
			});

			await expect(service.reduceStock(items)).rejects.toThrow(BadRequestError);
		});

		test('TC-PD-37: Giảm tồn kho thất bại khi sản phẩm đã bị xóa', async () => {
			const items = [{ productId: 'prod-1', quantity: 2 }];
			const returningMock = mock().mockResolvedValue([]);
			mockDb.update.mockImplementation(() => ({
				set: () => ({ where: () => ({ returning: returningMock }) }),
			}));
			mockDb.query.products.findFirst.mockResolvedValue({
				id: 'prod-1',
				name: 'Product 1',
				stock: 10,
				deletedAt: new Date(),
			});

			await expect(service.reduceStock(items)).rejects.toThrow(NotFoundError);
		});
	});

	// ========================================================================
	// SECTION 11: RESTORE STOCK
	// ========================================================================
	describe('Khôi phục tồn kho (Restore Stock)', () => {
		test('TC-PD-38: Khôi phục tồn kho thành công với items hợp lệ', async () => {
			const items = [{ productId: 'prod-1', quantity: 2 }];
			const returningMock = mock().mockResolvedValue([{ id: 'prod-1', name: 'Product 1' }]);
			mockDb.update.mockImplementation(() => ({
				set: () => ({ where: () => ({ returning: returningMock }) }),
			}));

			const result = await service.restoreStock(items);
			expect(result).toEqual({ message: 'Stock restored successfully' });
		});

		test('TC-PD-39: Khôi phục tồn kho thất bại với items rỗng', async () => {
			await expect(service.restoreStock([])).rejects.toThrow(BadRequestError);
		});

		test('TC-PD-40: Khôi phục tồn kho khi sản phẩm không tồn tại (warning only)', async () => {
			const items = [{ productId: 'non-existent', quantity: 2 }];
			const returningMock = mock().mockResolvedValue([]);
			mockDb.update.mockImplementation(() => ({
				set: () => ({ where: () => ({ returning: returningMock }) }),
			}));

			// restoreStock logs warning but doesn't throw for non-existent products
			const result = await service.restoreStock(items);
			expect(result).toEqual({ message: 'Stock restored successfully' });
		});
	});
});
