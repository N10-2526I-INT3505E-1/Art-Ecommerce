// File: /services/api/src/products/products.schema.ts

import { relations } from 'drizzle-orm';
import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { t } from 'elysia';

// 1. BẢNG CATEGORIES
export const categories = sqliteTable('categories', {
  // Dùng UUIDv7
  id: text('id').primaryKey().$defaultFn(() => Bun.randomUUIDv7()),
  name: text('name').notNull().unique(),
  slug: text('slug'),
  description: text('description'),
});

// 2. BẢNG PRODUCTS
export const products = sqliteTable('products', {
  // Dùng UUIDv7
  id: text('id').primaryKey().$defaultFn(() => Bun.randomUUIDv7()),
  name: text('name').notNull(),
  price: real('price').notNull(),
  imageUrl: text('image_url').notNull(),
  description: text('description'),
  
  slug: text('slug').unique(),
  stock: integer('stock').notNull().default(10),
  
  // Khóa ngoại là TEXT
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  
  sourceUrl: text('source_url').unique(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', {mode: 'timestamp'}),
});

// 3. BẢNG TAGS
export const tags = sqliteTable('tags', {
  // Dùng UUIDv7
  id: text('id').primaryKey().$defaultFn(() => Bun.randomUUIDv7()),
  name: text('name').notNull().unique(),
  type: text('type').default('auto'),
});

// 4. BẢNG NỐI
export const product_tags = sqliteTable('product_tags', {
    // Khóa ngoại là TEXT
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.tagId] }),
  })
);

// === VALIDATION & RELATIONS (Giữ nguyên logic nhưng ID giờ là string) ===

export const insertProductBody = t.Object({
  name: t.String(),
  price: t.Number(),
  imageUrl: t.String(),
  description: t.Optional(t.String()),
  sourceUrl: t.Optional(t.String()),
  categoryName: t.Optional(t.String()),
  tags: t.Optional(t.Array(t.String())),
  stock: t.Optional(t.Number())
});

export const updateProductBody = t.Partial(insertProductBody);
export const selectProductSchema = createSelectSchema(products);

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  productTags: many(product_tags),
}));

export const productTagsRelations = relations(product_tags, ({ one }) => ({
  product: one(products, { fields: [product_tags.productId], references: [products.id] }),
  tag: one(tags, { fields: [product_tags.tagId], references: [tags.id] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

const orderItemSchema = t.Object({
  productId: t.String(),
  quantity: t.Number()
});

export const reduceStockBody = t.Object({
  items: t.Array(orderItemSchema)
})