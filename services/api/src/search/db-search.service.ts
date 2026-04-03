import { and, asc, desc, eq, gte, inArray, isNull, like, lte, sql } from 'drizzle-orm';
import { db } from '../products/db';
import { categories, product_tags, products, tags } from '../products/product.model';

/**
 * DbSearchService - Replaces Meilisearch with direct DB queries via Turso
 */
export class DbSearchService {
	/**
	 * Search products using DB LIKE queries
	 * @param query - Search query string
	 * @param options - Search options (filter, sort, limit, attributesToRetrieve, attributesToHighlight)
	 */
	async search(query: string, options: any = {}) {
		const conditions: any[] = [isNull(products.deletedAt)];

		// Text search via LIKE
		if (query && query.trim()) {
			const searchTerms = query.trim().split(/\s+/);
			for (const term of searchTerms) {
				conditions.push(
					sql`(${products.name} LIKE ${'%' + term + '%'} OR ${products.description} LIKE ${'%' + term + '%'})`,
				);
			}
		}

		// Parse Meilisearch-style filter string into conditions
		if (options.filter) {
			const filterStr = options.filter as string;

			// Parse: categoryName = "value"
			const categoryMatch = filterStr.match(/categoryName\s*=\s*"([^"]+)"/);
			if (categoryMatch && categoryMatch[1]) {
				const categoryName = categoryMatch[1] as string;
				// Sub-query: find category ID by name, then filter products
				const category = await db.query.categories.findFirst({
					where: eq(categories.name, categoryName),
				});
				if (category) {
					conditions.push(eq(products.categoryId, category.id));
				} else {
					// Category not found — return empty results
					return {
						hits: [],
						processingTimeMs: 0,
						estimatedTotalHits: 0,
						limit: options.limit || 20,
					};
				}
			}

			// Parse: price >= N
			const minPriceMatch = filterStr.match(/price\s*>=\s*(\d+)/);
			if (minPriceMatch) {
				conditions.push(gte(products.price, Number(minPriceMatch[1])));
			}

			// Parse: price <= N
			const maxPriceMatch = filterStr.match(/price\s*<=\s*(\d+)/);
			if (maxPriceMatch) {
				conditions.push(lte(products.price, Number(maxPriceMatch[1])));
			}

			// Parse: tags IN ["tag1", "tag2"]
			const tagsMatch = filterStr.match(/tags\s+IN\s+$$([^$$]+)\]/);
			if (tagsMatch) {
				const tagNames = tagsMatch[1]!.split(',').map((t) => t.trim().replace(/"/g, ''));
				if (tagNames.length > 0) {
					const matchingTags = await db.query.tags.findMany({
						where: (t, { inArray }) => inArray(t.name, tagNames),
					});
					if (matchingTags.length > 0) {
						const tagIds = matchingTags.map((t) => t.id);
						const matchingProductTags = await db
							.select({ productId: product_tags.productId })
							.from(product_tags)
							.where(inArray(product_tags.tagId, tagIds));
						const productIds = [...new Set(matchingProductTags.map((pt) => pt.productId))];
						if (productIds.length > 0) {
							conditions.push(inArray(products.id, productIds));
						} else {
							return {
								hits: [],
								processingTimeMs: 0,
								estimatedTotalHits: 0,
								limit: options.limit || 20,
							};
						}
					} else {
						return {
							hits: [],
							processingTimeMs: 0,
							estimatedTotalHits: 0,
							limit: options.limit || 20,
						};
					}
				}
			}
		}

		// Determine sort order
		let orderBy: any[] = [desc(products.createdAt)];
		if (options.sort && Array.isArray(options.sort) && options.sort.length > 0) {
			const [sortField, sortOrder] = options.sort[0].split(':');
			if (sortField === 'price') {
				orderBy = sortOrder === 'desc' ? [desc(products.price)] : [asc(products.price)];
			} else if (sortField === 'name') {
				orderBy = sortOrder === 'desc' ? [desc(products.name)] : [asc(products.name)];
			} else if (sortField === 'createdAt') {
				orderBy = sortOrder === 'desc' ? [desc(products.createdAt)] : [asc(products.createdAt)];
			}
		}

		const limit = options.limit || 20;

		const startTime = Date.now();

		// Run data query and count query in parallel
		const [results, countResult] = await Promise.all([
			db.query.products.findMany({
				where: and(...conditions),
				limit: limit,
				orderBy: orderBy,
				with: {
					category: true,
					productTags: {
						with: { tag: true },
					},
				},
			}),
			db
				.select({ count: sql<number>`count(*)` })
				.from(products)
				.where(and(...conditions)),
		]);

		const processingTimeMs = Date.now() - startTime;
		const totalHits = Number(countResult[0]?.count ?? 0);

		const hits = results.map((p) => ({
			id: p.id,
			name: p.name,
			description: p.description || '',
			price: p.price,
			imageUrl: p.imageUrl,
			stock: p.stock,
			slug: p.slug,
			createdAt: p.createdAt,
			categoryName: p.category?.name || 'Uncategorized',
			tags: p.productTags.map((pt) => pt.tag?.name).filter(Boolean),
		}));

		return {
			hits,
			processingTimeMs,
			estimatedTotalHits: totalHits,
			limit,
		};
	}

	/**
	 * No-op: indexing not needed for DB search
	 */
	async indexProduct(_product: any): Promise<void> {}

	/**
	 * No-op: updating index not needed for DB search
	 */
	async updateProduct(_product: any): Promise<void> {}

	/**
	 * No-op: deleting from index not needed for DB search
	 */
	async deleteProduct(_productId: string): Promise<void> {}
}

// Export singleton instance
export const dbSearchService = new DbSearchService();
