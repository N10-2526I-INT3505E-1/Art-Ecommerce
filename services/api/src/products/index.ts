// File: /services/api/src/products/index.ts

import { Elysia } from 'elysia';
import { db } from './db';
import { products, categories, tags, product_tags, insertProductBody, selectProductSchema } from './products.schema';
import { t } from 'elysia'

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
                categoryId = newCat[0].id;
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
  
  .get('/', async () => {
      return await db.select().from(products);
  },
  {
    response: t.Array(selectProductSchema),
    detail: {
      summary: 'Get all products', 
      description: 'Lấy danh sách tất cả các sản phẩm đang có trong Database',
      tags:['Products']
    }
  });