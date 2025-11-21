// File: /services/api/src/products/index.ts

import { and, desc, eq, like, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia'
import { db } from './db';
import { categories, insertProductBody, product_tags, products, selectProductSchema, tags, updateProductBody } from './products.schema';

export const productsAPI = new Elysia({ prefix: '/products' })

    .post('/', async ({ body, set }) => {
        console.log(`📥 Nhận: ${body.name}`);

        try {
            // --- BƯỚC 1: XỬ LÝ CATEGORY ---
            let categoryId = null;
            if (body.categoryName) {
                // Tìm xem category có chưa
                const existingCat = await db.query.categories.findFirst({
                    where: (c, { eq }) => eq(c.name, body.categoryName!)
                });

                if (existingCat) {
                    categoryId = existingCat.id;
                } else {
                    // Chưa có -> Tạo mới
                    const newCat = await db.insert(categories)
                        .values({ name: body.categoryName! })
                        .returning();
                    categoryId = newCat[0]?.id;
                }
            }

            // --- BƯỚC 2: TẠO SẢN PHẨM ---
            const newProductResult = await db.insert(products)
                .values({
                    name: body.name,
                    price: body.price,
                    imageUrl: body.imageUrl,
                    description: body.description,
                    categoryId: categoryId,
                    sourceUrl: body.sourceUrl
                })
                .onConflictDoUpdate({
                    target: products.sourceUrl,
                    set: {
                        price: body.price,
                        imageUrl: body.imageUrl,
                    }
                })
                .returning();
            const newProduct = newProductResult[0];

            // --- BƯỚC 3: XỬ LÝ TAGS (CHO AI) ---
            if (body.tags && body.tags.length > 0) {
                for (const tagName of body.tags) {
                    // Tìm hoặc Tạo Tag
                    let tagId;
                    const existingTag = await db.query.tags.findFirst({
                        where: (t, { eq }) => eq(t.name, tagName)
                    });

                    if (existingTag) {
                        tagId = existingTag.id;
                    } else {
                        const newTag = await db.insert(tags)
                            .values({ name: tagName, type: 'auto' })
                            .returning();
                        tagId = newTag[0].id;
                    }

                    // Tạo liên kết
                    await db.insert(product_tags)
                        .values({ productId: newProduct.id, tagId: tagId })
                        .onConflictDoNothing();
                }
            }

            set.status = 201;
            console.log(`✅ Đã lưu ID: ${newProduct.id}`);
            return newProduct;

        } catch (error) {
            console.error("❌ Lỗi:", error);
            set.status = 500;
            return { error: "Internal Server Error" };
        }
    }, {
        body: insertProductBody
    })

    /**
     * 2. GET /product (Upgrade)
     * Support : Pagination, Search, Filter Category
     * Example : /products?page=1&limit=10&search=ngua&categoryId=5
     */
    .get('/', async ({ query }) => {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 12;
        const offset = (page - 1) * limit;

        const search = query.search ? `%${query.search}%` : undefined;
        const categoryId = query.categoryId ? Number(query.categoryId) : undefined;

        const conditions = [];
        if (search) conditions.push(like(products.name, search));
        if (categoryId) conditions.push(eq(products.categoryId, categoryId));

        const data = await db.query.products.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            limit: limit,
            offset: offset,
            orderBy: [desc(products.createdAt)],
            with: {
                category: true,
            }
        });

        const allItems = await db.select({ count: sql<number>`count(*)` }).from(products);
        const total = allItems[0]?.count ?? 0;

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }, {
        // Validate Query String
        query: t.Object({
            page: t.Optional(t.String()),
            limit: t.Optional(t.String()),
            search: t.Optional(t.String()),
            categoryId: t.Optional(t.String())
        }),
        detail: {
            tags: ["Products"],
            summary: 'List Products (Filter and Pagination)'
        }
    })

    // GET /product (details)
    .get('/:id', async ({ params, set }) => {
        const id = Number(params.id);

        const product = await db.query.products.findFirst({
            where: eq(products.id, id),
            with: {
                category: true, // lay thong tin category
                productTags: { // lay thong tin tag di kem
                    with: {
                        tag: true
                    }
                }
            }
        });
        if (!product) {
            set.status = 404;
            return { error: 'Product not found' };
        }

        // lam dep du lieu tags truoc khi tra ve 
        // bien doi thanh cau truc long nhau thanh mang phang
        const flatTags = product.productTags.map(pt => pt.tag);

        return {
            ...product,
            tags: flatTags,
            productTags: undefined
        };

    }, {
        params: t.Object({
            id: t.String()
        }),
        detail: {
            tags: ["Products"],
            summary: 'Get Product Detail'
        }
    })

    /**
     * GET /categories
     * get category -> menu header
     */
    .get('/categories', async () => {
        return await db.select().from(categories);
    }, {
        detail: {
            tags: ["Products"],
            summary: 'Get Menu Categories'
        }
    })

    /**
     * GET /tags
     * get tags -> Sidebar (Phong thuy)
     */
    .get('/tags', async () => {
        return await db.select().from(tags);
    }, {
        tags: ["Products"],
        detail: { summary: 'Get All tags (For filter)' }
    })

    /**
     * PATCH /products/:id
     */
    .patch('/:id', async ({ params, body, set }) => {
        const id = Number(params.id);

        try {
            // 1. Update Category if needed
            let categoryId;
            if (body.categoryName) {
                const existingCat = await db.query.categories.findFirst({
                    where: (c, { eq }) => eq(c.name, body.categoryName!)
                });
                if (existingCat) {
                    categoryId = existingCat.id;
                } else {
                    const newCat = await db.insert(categories).values({ name: body.categoryName! }).returning();
                    categoryId = newCat[0]?.id;
                }
            }

            // 2. Update Product fields
            const updateData: any = {
                ...body
            };
            if (categoryId !== undefined) {
                updateData.categoryId = categoryId;
            }
            delete updateData.categoryName;
            delete updateData.tags;

            await db.update(products)
                .set(updateData)
                .where(eq(products.id, id));

            // 3. Update Tags if needed
            if (body.tags) {
                // Clear old tags
                await db.delete(product_tags).where(eq(product_tags.productId, id));

                // Add new tags
                for (const tagName of body.tags) {
                    let tagId;
                    const existingTag = await db.query.tags.findFirst({
                        where: (t, { eq }) => eq(t.name, tagName)
                    });

                    if (existingTag) {
                        tagId = existingTag.id;
                    } else {
                        const newTag = await db.insert(tags).values({ name: tagName, type: 'auto' }).returning();
                        tagId = newTag[0].id;
                    }

                    await db.insert(product_tags)
                        .values({ productId: id, tagId: tagId })
                        .onConflictDoNothing();
                }
            }

            return { success: true, message: `Updated product ${id}` };

        } catch (error) {
            console.error("❌ Error updating product:", error);
            set.status = 500;
            return { error: "Internal Server Error" };
        }
    }, {
        params: t.Object({
            id: t.String()
        }),
        body: updateProductBody,
        detail: {
            tags: ["Products"],
            summary: 'Update Product'
        }
    })

    /**
     * admin 
     * DELETE /products/:id
     */
    .delete('/:id', async ({ params, set }) => {
        const id = Number(params.id);
        await db.delete(products).where(eq(products.id, id))
        return { success: true, message: `Deleted product ${id}` };

    }, {
        params: t.Object({
            id: t.String()
        }),
        detail: {
            tags: ["Products"],
            summary: 'Delete Product',
        },
    });



