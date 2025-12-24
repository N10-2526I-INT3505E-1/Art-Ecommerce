import { BadRequestError, InternalServerError, NotFoundError } from '@common/errors/httpErrors';
import slugify from '@sindresorhus/slugify';
import { and, desc, eq, gte, inArray, isNull, like, lte, ne, sql } from 'drizzle-orm';
import type { db as defaultDb } from './db';
import { categories, product_tags, products, tags } from './product.model';
import { meilisearchService } from '../search/meilisearch.service';

type DbClient = typeof defaultDb;

// Type definitions for better type safety
interface CreateProductData {
	name: string;
	price: number;
	imageUrl?: string;
	description?: string;
	categoryName?: string;
	sourceUrl?: string;
	stock?: number;
	tags?: string[];
}

interface UpdateProductData {
	name?: string;
	price?: number;
	imageUrl?: string;
	description?: string;
	categoryName?: string;
	stock?: number;
	tags?: string[];
}

interface QueryParams {
	page?: string;
	limit?: string;
	search?: string;
	categoryId?: string;
	minPrice?: string;
	maxPrice?: string;
}

interface StockItem {
	productId: string;
	quantity: number;
}

export class ProductService {
	private db: DbClient;

	constructor(db: DbClient) {
		this.db = db;
	}

	/**
	 * 1. CREATE PRODUCT (UPSERT - FOR CRAWLER)
	 */
	async createProduct(data: CreateProductData) {
		try {
			return await this.db.transaction(async (tx) => {
				// A. Handle Category
				let categoryId: string | null = null;
				if (data.categoryName) {
					const existingCat = await tx.query.categories.findFirst({
						where: (c, { eq }) => eq(c.name, data.categoryName!),
					});

					if (existingCat) {
						categoryId = existingCat.id;
					} else {
						const [newCat] = await tx
							.insert(categories)
							.values({
								name: data.categoryName,
								slug: slugify(data.categoryName, { lowercase: true, locale: 'vi' }),
							})
							.returning();
						categoryId = newCat.id;
					}
				}

				// B. Upsert Product
				const uniqueSlug = `${slugify(data.name, { lowercase: true, locale: 'vi' })}-${Date.now()}`;

				const [newProduct] = await tx
					.insert(products)
					.values({
						name: data.name,
						price: data.price,
						imageUrl: data.imageUrl,
						description: data.description,
						categoryId: categoryId,
						sourceUrl: data.sourceUrl,
						slug: uniqueSlug,
						stock: data.stock ?? 10,
					})
					.onConflictDoUpdate({
						target: products.sourceUrl,
						set: {
							price: data.price,
							imageUrl: data.imageUrl,
						},
					})
					.returning();

				if (!newProduct) {
					throw new InternalServerError('Failed to create or update product.');
				}

				// C. Handle Tags
				if (data.tags && data.tags.length > 0) {
					for (const tagName of data.tags) {
						let tagId: string;
						const existingTag = await tx.query.tags.findFirst({
							where: (t, { eq }) => eq(t.name, tagName),
						});

						if (existingTag) {
							tagId = existingTag.id;
						} else {
							const [newTag] = await tx
								.insert(tags)
								.values({ name: tagName, type: 'auto' })
								.returning();
							tagId = newTag.id;
						}

						await tx
							.insert(product_tags)
							.values({ productId: newProduct.id, tagId: tagId })
							.onConflictDoNothing();
					}
				}

				try {
                    // Fetch full product with relations for indexing
                    const fullProduct = await tx.query.products.findFirst({
                        where: (p, { eq }) => eq(p.id, newProduct.id),
                        with: {
                            category: true,
                            productTags: {
                                with: { tag: true }
                            }
                        }
                    });

                    if (fullProduct) {
                        await meilisearchService.indexProduct(fullProduct);
                    }
                } catch (error) {
                    console.error('⚠️ Meilisearch indexing failed:', error);
                    // Don't throw - product already created
                }

				return newProduct;
			});
		} catch (error) {
			console.error('Create Product Failed:', error);
			if (error instanceof InternalServerError) throw error;
			throw new InternalServerError('Failed to create product due to server error.');
		}
	}

	/**
	 * 2. AI RECOMMENDATIONS
	 */
	async getRecommendations(inputTags: string[]) {
		try {
			if (!inputTags || inputTags.length === 0) return [];

			const tagRecords = await this.db.query.tags.findMany({
				where: (t, { inArray }) => inArray(t.name, inputTags),
			});

			const tagIds = tagRecords.map((t) => t.id);
			if (tagIds.length === 0) return [];

			const matchedProducts = await this.db.query.product_tags.findMany({
				where: (pt, { inArray }) => inArray(pt.tagId, tagIds),
				with: { product: true },
				limit: 20,
			});

			const uniqueProductsMap = new Map();
			matchedProducts.forEach((mp) => {
				if (mp.product && mp.product.deletedAt === null) {
					uniqueProductsMap.set(mp.product.id, mp.product);
				}
			});

			return Array.from(uniqueProductsMap.values());
		} catch (error) {
			console.error('Get Recommendations Failed:', error);
			throw new InternalServerError('Failed to get recommendations.');
		}
	}

	/**
	 * 3. LIST PRODUCTS (FILTER + PAGINATION)
	 */
	async getAll(query: QueryParams) {
		try {
			const page = Number(query.page) || 1;
			const limit = Number(query.limit) || 12;
			const offset = (page - 1) * limit;

			const conditions: any[] = [isNull(products.deletedAt)];

			if (query.search) {
				const searchTerms = query.search.trim().split(/\s+/);
				const searchConditions = searchTerms.map((term) => like(products.name, `%${term}%`));
				conditions.push(and(...searchConditions));
			}

			if (query.categoryId) conditions.push(eq(products.categoryId, query.categoryId));
			if (query.minPrice) conditions.push(gte(products.price, Number(query.minPrice)));
			if (query.maxPrice) conditions.push(lte(products.price, Number(query.maxPrice)));

			const rawData = await this.db.query.products.findMany({
				where: and(...conditions),
				limit: limit,
				offset: offset,
				orderBy: [desc(products.createdAt)],
				with: {
					category: true,
					productTags: {
						with: {
							tag: true,
						},
					},
				},
			});

			// Flatten tags to string array for response schema compatibility
			const data = rawData.map((product) => {
				const flatTags = product.productTags.map((pt) => pt.tag.name);
				const { productTags, ...rest } = product;
				return { ...rest, tags: flatTags };
			});

			const allItems = await this.db
				.select({ count: sql<number>`count(*)` })
				.from(products)
				.where(and(...conditions));
			
			const dataWithFlatTags = data.map(product => {
                const flatTags = product.productTags.map(pt => pt.tag);
                return { ...product, tags: flatTags, productTags: undefined };
            });

			return {
				data: dataWithFlatTags,
				pagination: {
					page,
					limit,
					total: Number(allItems[0]?.count ?? 0),
					totalPages: Math.ceil((Number(allItems[0]?.count) ?? 0) / limit),
				},
			};
		} catch (error) {
			console.error('Get All Products Failed:', error);
			throw new InternalServerError('Failed to fetch products.');
		}
	}

	/**
	 * 4. PRODUCT DETAIL
	 */
	async getById(id: string) {
		try {
			const product = await this.db.query.products.findFirst({
				where: and(eq(products.id, id), isNull(products.deletedAt)),
				with: {
					category: true,
					productTags: {
						with: {
							tag: true,
						},
					},
				},
			});

			if (!product) {
				throw new NotFoundError('Product not found.');
			}

			const flatTags = product.productTags.map((pt) => pt.tag.name);
			const { productTags, ...rest } = product;
			return { ...rest, tags: flatTags };
		} catch (error) {
			if (error instanceof NotFoundError) throw error;
			console.error('Get Product By ID Failed:', error);
			throw new InternalServerError('Failed to fetch product details.');
		}
	}

	/**
	 * 5. RELATED PRODUCTS
	 */
	async getRelated(id: string) {
		try {
			const currentProduct = await this.db.query.products.findFirst({
				where: eq(products.id, id),
			});

			if (!currentProduct) {
				throw new NotFoundError('Product not found.');
			}

			if (!currentProduct.categoryId) return [];

			return await this.db.query.products.findMany({
				where: and(
					eq(products.categoryId, currentProduct.categoryId),
					ne(products.id, id),
					isNull(products.deletedAt),
				),
				limit: 4,
				orderBy: [desc(products.createdAt)],
			});
		} catch (error) {
			if (error instanceof NotFoundError) throw error;
			console.error('Get Related Products Failed:', error);
			throw new InternalServerError('Failed to fetch related products.');
		}
	}

	/**
	 * 6. UPDATE PRODUCT
	 */
	async update(id: string, body: UpdateProductData) {
		const existingProduct = await this.db.query.products.findFirst({
			where: and(eq(products.id, id), isNull(products.deletedAt)),
		});

		if (!existingProduct) {
			throw new NotFoundError('Product not found.');
		}

		try {
			return await this.db.transaction(async (tx) => {
				// A. Update Category
				let categoryId: string | undefined;
				if (body.categoryName) {
					const existingCat = await tx.query.categories.findFirst({
						where: (c, { eq }) => eq(c.name, body.categoryName!),
					});
					if (existingCat) {
						categoryId = existingCat.id;
					} else {
						const [newCat] = await tx
							.insert(categories)
							.values({
								name: body.categoryName,
								slug: slugify(body.categoryName, { lowercase: true, locale: 'vi' }),
							})
							.returning();
						categoryId = newCat.id;
					}
				}

				// B. Update Product
				const { categoryName, tags: tagNames, ...updateFields } = body;
				const updateData: any = { ...updateFields };
				if (categoryId) updateData.categoryId = categoryId;

				const [updatedProduct] = await tx
					.update(products)
					.set(updateData)
					.where(eq(products.id, id))
					.returning();

				// C. Update Tags
				if (tagNames) {
					await tx.delete(product_tags).where(eq(product_tags.productId, id));

					for (const tagName of tagNames) {
						let tagId: string;
						const existingTag = await tx.query.tags.findFirst({
							where: (t, { eq }) => eq(t.name, tagName),
						});
						if (existingTag) {
							tagId = existingTag.id;
						} else {
							const [newTag] = await tx
								.insert(tags)
								.values({ name: tagName, type: 'auto' })
								.returning();
							tagId = newTag.id;
						}

						await tx
							.insert(product_tags)
							.values({ productId: id, tagId: tagId })
							.onConflictDoNothing();
					}
				}

				try {
                    const fullProduct = await tx.query.products.findFirst({
                        where: (p, { eq }) => eq(p.id, id),
                        with: {
                            category: true,
                            productTags: {
                                with: { tag: true }
                            }
                        }
                    });

                    if (fullProduct) {
                        await meilisearchService.updateProduct(fullProduct);
                    }
                } catch (error) {
                    console.error('⚠️ Meilisearch update failed:', error);
                }

				return { message: `Product ${id} updated successfully` };
			});
		} catch (error) {
			if (error instanceof NotFoundError) throw error;
			console.error('Update Product Failed:', error);
			throw new InternalServerError('Failed to update product.');
		}
	}

	/**
	 * 7. SOFT DELETE
	 */
	async delete(id: string) {
		try {
			const [deletedProduct] = await this.db
				.update(products)
				.set({ deletedAt: new Date() })
				.where(and(eq(products.id, id), isNull(products.deletedAt)))
				.returning();

			if (!deletedProduct) {
				throw new NotFoundError('Product not found.');
			}

			try {
                await meilisearchService.deleteProduct(id);
            } catch (error) {
                console.error('⚠️ Meilisearch delete failed:', error);
            }

			return { message: `Soft deleted product ${id}` };
		} catch (error) {
			if (error instanceof NotFoundError) throw error;
			console.error('Delete Product Failed:', error);
			throw new InternalServerError('Failed to delete product.');
		}
	}

	/**
	 * GET ALL CATEGORIES
	 */
	async getAllCategories() {
		try {
			return await this.db.select().from(categories);
		} catch (error) {
			console.error('Get Categories Failed:', error);
			throw new InternalServerError('Failed to fetch categories.');
		}
	}

	/**
	 * GET ALL TAGS
	 */
	async getAllTags() {
		try {
			return await this.db.select().from(tags);
		} catch (error) {
			console.error('Get Tags Failed:', error);
			throw new InternalServerError('Failed to fetch tags.');
		}
	}

	/**
	 * 8. BATCH REDUCE STOCK (Called by Order Service or RabbitMQ)
	 */
	async reduceStock(items: StockItem[]) {
		if (!items || items.length === 0) {
			throw new BadRequestError('No items provided for stock reduction.');
		}

		return await this.db.transaction(async (tx) => {
			for (const item of items) {
				if (item.quantity <= 0) {
					throw new BadRequestError(`Invalid quantity for product ${item.productId}`);
				}

				const [updatedProduct] = await tx
					.update(products)
					.set({
						stock: sql`${products.stock} - ${item.quantity}`,
					})
					.where(
						and(
							eq(products.id, item.productId),
							gte(products.stock, item.quantity),
							isNull(products.deletedAt),
						),
					)
					.returning({ id: products.id, name: products.name, stock: products.stock });

				if (!updatedProduct) {
					const productExist = await tx.query.products.findFirst({
						where: eq(products.id, item.productId),
						columns: { id: true, name: true, stock: true, deletedAt: true },
					});

					if (!productExist || productExist.deletedAt !== null) {
						throw new NotFoundError(`Product ID ${item.productId} not found.`);
					} else {
						throw new BadRequestError(
							`Product '${productExist.name}' has insufficient stock (Available: ${productExist.stock}, Requested: ${item.quantity})`,
						);
					}
				}
			}
			return { message: 'Stock reduced successfully' };
		});
	}

	/**
	 * 9. BATCH RESTORE STOCK (For order cancellation via RabbitMQ)
	 */
	async restoreStock(items: StockItem[]) {
		if (!items || items.length === 0) {
			throw new BadRequestError('No items provided for stock restoration.');
		}

		return await this.db.transaction(async (tx) => {
			for (const item of items) {
				const [updatedProduct] = await tx
					.update(products)
					.set({
						stock: sql`${products.stock} + ${item.quantity}`,
					})
					.where(and(eq(products.id, item.productId), isNull(products.deletedAt)))
					.returning({ id: products.id, name: products.name });

				if (!updatedProduct) {
					console.warn(`Product ${item.productId} not found for stock restoration`);
				}
			}
			return { message: 'Stock restored successfully' };
		});
	}
}
