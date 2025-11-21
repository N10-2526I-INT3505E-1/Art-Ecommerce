// File: /services/api/src/products/products.schema.ts

import { relations } from 'drizzle-orm';
import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createSelectSchema } from 'drizzle-typebox';
import { t } from 'elysia';

// 1. BẢNG CATEGORIES (Menu danh mục)
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(), // VD: "Tranh Phong Cảnh"
  description: text('description'),
});

// 2. BẢNG PRODUCTS (Sản phẩm)
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  price: real('price').notNull(),         // Giá số
  imageUrl: text('image_url').notNull(),  // Link ảnh
  description: text('description'),       // Mô tả

  // Liên kết: Sản phẩm thuộc 1 Category
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),

  sourceUrl: text('source_url').unique(),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// 3. BẢNG TAGS (Metadata cho AI)
export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(), // VD: "phong_thuy_moc"
  type: text('type').default('auto'),    // VD: "phong_thuy", "chu_de"
});

// 4. BẢNG NỐI (Product <-> Tags)
export const product_tags = sqliteTable('product_tags', {
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
},
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.tagId] }),
  })
);

// === VALIDATION SCHEMA (Dữ liệu Crawler gửi lên) ===
export const insertProductBody = t.Object({
  name: t.String(),
  price: t.Number(),
  imageUrl: t.String(),
  description: t.Optional(t.String()),

  sourceUrl: t.Optional(t.String()),

  categoryName: t.Optional(t.String()), // Crawler gửi tên danh mục
  tags: t.Optional(t.Array(t.String())) // Crawler gửi mảng tags
});

export const updateProductBody = t.Object({
  name: t.Optional(t.String()),
  price: t.Optional(t.Number()),
  imageUrl: t.Optional(t.String()),
  description: t.Optional(t.String()),
  sourceUrl: t.Optional(t.String()),
  categoryName: t.Optional(t.String()),
  tags: t.Optional(t.Array(t.String()))
});

export const selectProductSchema = createSelectSchema(products);

// san pham thuoc category va tag 
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  productTags: many(product_tags),
}))

// connect Product and tag
export const productTagsRelations = relations(product_tags, ({ one }) => ({
  product: one(products, {
    fields: [product_tags.productId],
    references: [products.id],
  }),
  tag: one(tags, {
    fields: [product_tags.tagId],
    references: [tags.id],
  }),
}));

// category biet minh co bao nhieu san pham 
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

