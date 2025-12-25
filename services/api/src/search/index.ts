import { Elysia, t } from 'elysia';
import type { MeilisearchService } from './meilisearch.service';

/**
 * Search Plugin - Provides search endpoints for products
 * Follows the same plugin pattern as other services
 */
export const searchPlugin = async (dependencies: { meilisearchService: MeilisearchService }) =>
	new Elysia({ name: 'search-plugin' })
		.decorate('meilisearchService', dependencies.meilisearchService)
		.group('/v1/search', (app) =>
			app
				/**
				 * Main search endpoint
				 * GET /v1/search?q=tranh&category=Phong Cảnh&minPrice=100000&maxPrice=500000&tags=menh_moc,chu_de_phong_canh&sort=price:asc&limit=20
				 */
				.get(
					'/',
					async ({ query, meilisearchService }) => {
						const {
							q = '',
							category,
							minPrice,
							maxPrice,
							tags,
							sort = 'createdAt:desc',
							limit = 20,
						} = query;

						// Build filters
						const filters: string[] = [];

						if (category) {
							filters.push(`categoryName = "${category}"`);
						}

						if (minPrice) {
							filters.push(`price >= ${minPrice}`);
						}

						if (maxPrice) {
							filters.push(`price <= ${maxPrice}`);
						}

						if (tags) {
							const tagList = tags
								.split(',')
								.map((t) => `"${t.trim()}"`)
								.join(', ');
							filters.push(`tags IN [${tagList}]`);
						}

						// Parse sort
						const [sortField, sortOrder] = sort.split(':');
						const sortArray = sortOrder === 'desc' ? [`${sortField}:desc`] : [`${sortField}:asc`];

						// Search
						const results = await meilisearchService.search(q, {
							filter: filters.length > 0 ? filters.join(' AND ') : undefined,
							sort: sortArray,
							limit: parseInt(limit.toString()),
							attributesToHighlight: ['name', 'description'],
						});

						return {
							hits: results.hits,
							query: q,
							processingTimeMs: results.processingTimeMs,
							totalHits: results.estimatedTotalHits,
							limit: results.limit,
						};
					},
					{
						query: t.Object({
							q: t.Optional(t.String()),
							category: t.Optional(t.String()),
							minPrice: t.Optional(t.Number()),
							maxPrice: t.Optional(t.Number()),
							tags: t.Optional(t.String()),
							sort: t.Optional(t.String()),
							limit: t.Optional(t.Number()),
						}),
						detail: { tags: ['Search'], summary: 'Search Products' },
					},
				)

				/**
				 * Autocomplete/Suggestions endpoint
				 * GET /v1/search/suggestions?q=tra
				 */
				.get(
					'/suggestions',
					async ({ query, meilisearchService }) => {
						const { q = '', limit = 5 } = query;

						const results = await meilisearchService.search(q, {
							limit: parseInt(limit.toString()),
							attributesToRetrieve: ['name', 'id'],
						});

						return {
							suggestions: results.hits.map((hit: any) => ({
								id: hit.id,
								name: hit.name,
							})),
						};
					},
					{
						query: t.Object({
							q: t.String(),
							limit: t.Optional(t.Number()),
						}),
						detail: { tags: ['Search'], summary: 'Search Suggestions' },
					},
				)

				/**
				 * Facets endpoint - Get available filters
				 * GET /v1/search/facets
				 */
				.get(
					'/facets',
					async ({ meilisearchService }) => {
						// Get all unique categories and tags for filters
						const results = await meilisearchService.search('', {
							limit: 1000,
							attributesToRetrieve: ['categoryName', 'tags'],
						});

						const categories = new Set<string>();
						const allTags = new Set<string>();

						results.hits.forEach((hit: any) => {
							if (hit.categoryName) categories.add(hit.categoryName);
							if (hit.tags) hit.tags.forEach((tag: string) => allTags.add(tag));
						});

						return {
							categories: Array.from(categories).sort(),
							tags: Array.from(allTags).sort(),
						};
					},
					{
						detail: { tags: ['Search'], summary: 'Search Facets' },
					},
				),
		);

// Re-export the service for convenience
export { meilisearchService, MeilisearchService } from './meilisearch.service';
