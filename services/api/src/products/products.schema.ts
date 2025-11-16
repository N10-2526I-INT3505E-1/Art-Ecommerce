// /services/api/src/products/products.schema.ts

import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';
import { createSelectSchema, createInsertSchema } from 'drizzle-typebox';
import { t } from 'elysia';
import { Intersect, Omit } from '@sinclair/typebox';

/**
 * Bảng Danh mục Sản phẩm
 * (Ví dụ: Tranh sơn dầu, Tranh lụa, Điêu khắc)
 */
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
});

/**
 * Bảng Sản phẩm (Tác phẩm nghệ thuật)
 */
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  price: real('price').notNull().default(0.0),
  imageUrl: text('image_url').notNull(),
  stock: integer('stock').notNull().default(1),
  artistName: text('artist_name'),
  
  // Liên kết với bảng categories
  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'set null', // Nếu xóa danh mục, set cột này về null
  }),

  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

const baseInsertSchema = createInsertSchema(products);

const strictInsertRules = t.Object({
  name: t.String({ minLength: 1, default: 'Untitled' }),
  imageUrl: t.String({minLength:1, default: 'https://via.placeholder.com/150' }),
  price: t.Number({ minimum: 0, default: 0.0 }),
  stock: t.Number({ minimum: 0, default: 0 }),
});

// Kết hợp cả 2 schema trên để tạo schema cuối cùng cho việc thêm sản phẩm
export const insertProductSchema = Omit(
  Intersect([
    baseInsertSchema, 
    strictInsertRules
  ]),
  ['id', 'createdAt']
)

// === PHẦN BỔ SUNG CHO OPENAPI ===
// Tạo schema TypeBox để validate dữ liệu trả về (response)
export const selectProductSchema = createSelectSchema(products);
export const selectCategorySchema = createSelectSchema(categories);

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({autoIncrement:true}),
  name: text('name').notNull().unique(),
  type: text('type').notNull(),
});

export const product_tags = sqliteTable('product_tags', 
  {
    productId: integer('product_id').notNull().references(
      () => products.id, { onDelete: 'cascade',}
    ),
    
    tagId: integer('tag_id').notNull().references(
      () => tags.id, {onDelete: 'cascade'}
    ),
  },
  (table) => ({
    pk: primaryKey({columns: [table.productId, table.tagId]}),
  })
);





