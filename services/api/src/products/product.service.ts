import { 
    BadRequestError, 
    InternalServerError, 
    NotFoundError 
} from '@common/errors/httpErrors'; //
import { and, desc, eq, gte, inArray, isNull, like, lte, ne, sql } from 'drizzle-orm';
import slugify from 'slugify';
import type { db as defaultDb } from './db';
import { categories, product_tags, products, tags } from './product.schema';

type DbClient = typeof defaultDb;

export class ProductService {
    private db: DbClient;

    constructor(db: DbClient) {
        this.db = db;
    }

    /**
     * 1. TẠO SẢN PHẨM (UPSERT - DÙNG CHO CRAWLER)
     */
    async createProduct(data: any) {
        try {
            return await this.db.transaction(async (tx) => {
                // A. Xử lý Category
                let categoryId = null;
                if (data.categoryName) {
                    const existingCat = await tx.query.categories.findFirst({
                        where: (c, { eq }) => eq(c.name, data.categoryName)
                    });

                    if (existingCat) {
                        categoryId = existingCat.id;
                    } else {
                        const [newCat] = await tx.insert(categories)
                            .values({ 
                                name: data.categoryName,
                                slug: slugify(data.categoryName, { lower: true, locale: 'vi' })
                            })
                            .returning();
                        categoryId = newCat.id;
                    }
                }

                // B. Upsert Product
                const uniqueSlug = `${slugify(data.name, { lower: true, locale: 'vi' })}-${Date.now()}`;

                const [newProduct] = await tx.insert(products)
                    .values({
                        name: data.name,
                        price: data.price,
                        imageUrl: data.imageUrl,
                        description: data.description,
                        categoryId: categoryId,
                        sourceUrl: data.sourceUrl,
                        slug: uniqueSlug,
                        stock: data.stock ?? 10
                    })
                    .onConflictDoUpdate({
                        target: products.sourceUrl,
                        set: { 
                            price: data.price,      
                            imageUrl: data.imageUrl,
                        }
                    })
                    .returning();
                
                if (!newProduct) {
                    throw new InternalServerError('Failed to create or update product.');
                }

                // C. Xử lý Tags
                if (data.tags && data.tags.length > 0) {
                    for (const tagName of data.tags) {
                        let tagId;
                        const existingTag = await tx.query.tags.findFirst({
                            where: (t, { eq }) => eq(t.name, tagName)
                        });

                        if (existingTag) {
                            tagId = existingTag.id;
                        } else {
                            const [newTag] = await tx.insert(tags)
                                .values({ name: tagName, type: 'auto' })
                                .returning();
                            tagId = newTag.id;
                        }

                        // Liên kết (Dùng onConflictDoNothing để tránh lỗi trùng lặp trong bảng nối)
                        await tx.insert(product_tags)
                            .values({ productId: newProduct.id, tagId: tagId })
                            .onConflictDoNothing();
                    }
                }

                return newProduct;
            });
        } catch (error) {
            console.error('Create Product Failed:', error);
            throw new InternalServerError('Failed to create product due to server error.');
        }
    }

    /**
     * 2. GỢI Ý SẢN PHẨM (AI RECOMMEND)
     */
    async getRecommendations(inputTags: string[]) {
        try {
            if (!inputTags || inputTags.length === 0) return [];

            const tagRecords = await this.db.query.tags.findMany({
                where: (t, { inArray }) => inArray(t.name, inputTags)
            });
            
            const tagIds = tagRecords.map(t => t.id);
            if (tagIds.length === 0) return [];

            const matchedProducts = await this.db.query.product_tags.findMany({
                where: (pt, { inArray }) => inArray(pt.tagId, tagIds),
                with: { product: true },
                limit: 20 
            });

            const uniqueProductsMap = new Map();
            matchedProducts.forEach(mp => {
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
     * 3. LẤY DANH SÁCH (FILTER + PAGINATION)
     */
    async getAll(query: any) {
        try {
            const page = Number(query.page) || 1;
            const limit = Number(query.limit) || 12;
            const offset = (page - 1) * limit;

            const conditions = [isNull(products.deletedAt)];

            if (query.search) conditions.push(like(products.name, `%${query.search}%`));
            if (query.categoryId) conditions.push(eq(products.categoryId, query.categoryId));
            if (query.minPrice) conditions.push(gte(products.price, Number(query.minPrice)));
            if (query.maxPrice) conditions.push(lte(products.price, Number(query.maxPrice)));

            const data = await this.db.query.products.findMany({
                where: and(...conditions),
                limit: limit,
                offset: offset,
                orderBy: [desc(products.createdAt)],
                with: { category: true }
            });

            const allItems = await this.db
                .select({ count: sql<number>`count(*)` })
                .from(products)
                .where(and(...conditions));

            return {
                data,
                pagination: {
                    page,
                    limit,
                    total: allItems[0]?.count ?? 0,
                    totalPages: Math.ceil((allItems[0]?.count ?? 0) / limit)
                }
            };
        } catch (error) {
            console.error('Get All Products Failed:', error);
            throw new InternalServerError('Failed to fetch products.');
        }
    }

    /**
     * 4. CHI TIẾT SẢN PHẨM
     */
    async getById(id: string) {
        try {
            const product = await this.db.query.products.findFirst({
                where: eq(products.id, id),
                with: {
                    category: true,
                    productTags: { with: { tag: true } }
                }
            });

            if (!product) {
                throw new NotFoundError('Product not found.');
            }

            const flatTags = product.productTags.map(pt => pt.tag);
            return { ...product, tags: flatTags, productTags: undefined };
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            console.error('Get Product By ID Failed:', error);
            throw new InternalServerError('Failed to fetch product details.');
        }
    }

    /**
     * 5. SẢN PHẨM LIÊN QUAN
     */
    async getRelated(id: string) {
        try {
            const currentProduct = await this.db.query.products.findFirst({
                where: eq(products.id, id)
            });
            
            if (!currentProduct || !currentProduct.categoryId) return [];

            return await this.db.query.products.findMany({
                where: and(
                    eq(products.categoryId, currentProduct.categoryId),
                    ne(products.id, id),        
                    isNull(products.deletedAt)  
                ),
                limit: 4,
                orderBy: [desc(products.createdAt)]
            });
        } catch (error) {
            console.error('Get Related Products Failed:', error);
            throw new InternalServerError('Failed to fetch related products.');
        }
    }

    /**
     * 6. CẬP NHẬT (UPDATE)
     */
    async update(id: string, body: any) {
        // Kiểm tra tồn tại trước
        const existingProduct = await this.db.query.products.findFirst({ where: eq(products.id, id) });
        if (!existingProduct) throw new NotFoundError('Product not found.');

        try {
            return await this.db.transaction(async (tx) => {
                // A. Update Category
                let categoryId;
                if (body.categoryName) {
                    const existingCat = await tx.query.categories.findFirst({
                        where: (c, { eq }) => eq(c.name, body.categoryName)
                    });
                    if (existingCat) {
                        categoryId = existingCat.id;
                    } else {
                        const [newCat] = await tx.insert(categories)
                            .values({ 
                                name: body.categoryName,
                                slug: slugify(body.categoryName, { lower: true, locale: 'vi' })
                            }).returning();
                        categoryId = newCat.id;
                    }
                }

                // B. Update Product
                const updateData: any = { ...body };
                if (categoryId) updateData.categoryId = categoryId;
                delete updateData.categoryName;
                delete updateData.tags;

                const [updatedProduct] = await tx.update(products)
                    .set(updateData)
                    .where(eq(products.id, id))
                    .returning();

                // C. Update Tags
                if (body.tags) {
                    await tx.delete(product_tags).where(eq(product_tags.productId, id));
                    
                    for (const tagName of body.tags) {
                        let tagId;
                        const existingTag = await tx.query.tags.findFirst({
                            where: (t, { eq }) => eq(t.name, tagName)
                        });
                        if (existingTag) {
                            tagId = existingTag.id;
                        } else {
                            const [newTag] = await tx.insert(tags)
                                .values({ name: tagName, type: 'auto' })
                                .returning();
                            tagId = newTag.id;
                        }
                        
                        await tx.insert(product_tags)
                            .values({ productId: id, tagId: tagId })
                            .onConflictDoNothing();
                    }
                }

                return updatedProduct;
            });
        } catch (error) {
            console.error('Update Product Failed:', error);
            throw new InternalServerError('Failed to update product.');
        }
    }

    /**
     * 7. XÓA MỀM (SOFT DELETE)
     */
    async delete(id: string) {
        try {
            const [deletedProduct] = await this.db.update(products)
                .set({ deletedAt: new Date() })
                .where(eq(products.id, id))
                .returning();

            if (!deletedProduct) {
                throw new NotFoundError('Product not found.');
            }
                
            return { message: `Soft deleted product ${id}` };
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            console.error('Delete Product Failed:', error);
            throw new InternalServerError('Failed to delete product.');
        }
    }

    // Helpers
    async getAllCategories() {
        try {
            return await this.db.select().from(categories);
        } catch (error) {
            throw new InternalServerError('Failed to fetch categories.');
        }
    }

    async getAllTags() {
        try {
            return await this.db.select().from(tags);
        } catch (error) {
            throw new InternalServerError('Failed to fetch tags.');
        }
    }
}