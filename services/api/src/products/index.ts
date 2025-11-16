import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from './db'; 
import { 
    products, 
    selectProductSchema, 
    insertProductSchema 
} from './products.schema';

// Đặt tên cho export, Elysia sẽ dùng tên này làm "Tag" trong OpenAPI
export const productsAPI = new Elysia({ prefix: '/products' })
  
  /**
   * Endpoint: GET /products
   * Lấy tất cả sản phẩm
   */
  .get(
    '/', 
    async () => {
      console.log('--- 🚀 ĐÃ NHẬN REQUEST: GET /products ---');
      const allProducts = await db.select().from(products);
      console.log(`---> 🔍 Đã tìm thấy ${allProducts.length} sản phẩm.`);
      return allProducts;
    },
    {
      response: t.Array(selectProductSchema),
      detail: {
        summary: 'Get All Products',
        tags: ['Products'],
      },
    }
  )

  /**
   * Endpoint: GET /products/:id
   * Lấy 1 sản phẩm theo ID
   */
  .get(
    '/:id',
    async ({ params, set }) => {
      console.log(`--- 🚀 ĐÃ NHẬN REQUEST: GET /products/${params.id} ---`);
      const { id } = params;
      const product = await db.query.products.findFirst({
        where: (products, { eq }) => eq(products.id, id),
      });

      if (!product) {
        console.log(`---> ❌ LỖI: Không tìm thấy sản phẩm ID: ${id}`);
        set.status = 404;
        return { error: 'Product not found' };
      }
      
      console.log(`---> ✅ Đã tìm thấy sản phẩm: ${product.name}`);
      return product;
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
      response: {
        200: selectProductSchema,
        404: t.Object({ error: t.String() })
      },
      detail: {
        summary: 'Get Product by ID',
        tags: ['Products'],
      },
    }
  )

  /**
   * Endpoint: POST /products
   * Tạo sản phẩm mới
   */
  .post(
    '/',
    async ({body, set}) => {
        console.log('--- 🚀 ĐÃ NHẬN REQUEST: POST /products ---');
        console.log('---> 📥 Body nhận được:', body);

        const newProduct = await db.insert(products).values(body).returning();
        
        console.log(`---> ✅ Đã tạo sản phẩm mới, ID: ${newProduct[0].id}`);
        set.status = 201;
        return newProduct[0];
    },
    {
        body: insertProductSchema,
        response: {
            201: selectProductSchema,
        },
        detail: {
            summary: 'Create a New Product',
            tags: ['Products'],
        },
    }
  )
  
  /**
   * Endpoint: PUT /products/:id
   * Cập nhật sản phẩm
   */
  .put(
    '/:id',
    async ({ params, body, set }) => {
      console.log(`--- 🚀 ĐÃ NHẬN REQUEST: PUT /products/${params.id} ---`);
      console.log('---> 📥 Body nhận được:', body);
      
      const { id } = params;
      
      const updatedProduct = await db
        .update(products)
        .set(body)
        .where(eq(products.id, id))
        .returning();

      if (updatedProduct.length === 0) {
        console.log(`---> ❌ LỖI: Không tìm thấy sản phẩm ID: ${id} để cập nhật.`);
        set.status = 404;
        return { error: 'Product not found' };
      }

      console.log(`---> ✅ Đã cập nhật sản phẩm ID: ${updatedProduct[0].id}`);
      return updatedProduct[0];
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Partial(insertProductSchema),
      response: {
        200: selectProductSchema,
        404: t.Object({ error: t.String() })
      },
      detail: {
        summary: 'Update a Product',
        tags: ['Products'],
      },
    }
  )

  /**
   * Endpoint: DELETE /products/:id
   * Xóa sản phẩm
   */
  .delete(
    '/:id',
    async ({ params, set }) => {
      console.log(`--- 🚀 ĐÃ NHẬN REQUEST: DELETE /products/${params.id} ---`);
      const { id } = params;
      
      const deletedProduct = await db
        .delete(products)
        .where(eq(products.id, id))
        .returning({ deletedId: products.id });
      
      if (deletedProduct.length === 0) {
        console.log(`---> ❌ LỖI: Không tìm thấy sản phẩm ID: ${id} để xóa.`);
        set.status = 404;
        return { error: 'Product not found' };
      }
      
      console.log(`---> ✅ Đã xóa sản phẩm ID: ${deletedProduct[0].deletedId}`);
      return { success: true, deletedId: deletedProduct[0].deletedId };
    },
    {
      params: t.Object({ id: t.Numeric() }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          deletedId: t.Numeric(),
        }),
        404: t.Object({ error: t.String() })
      },
      detail: {
        summary: 'Delete a Product',
        tags: ['Products'],
      },
    }
  );