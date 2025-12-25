import { MeiliSearch, type Index } from 'meilisearch';

/**
 * MeilisearchService - Singleton service for Meilisearch operations
 * Auto-indexes products when created/updated/deleted
 */
class MeilisearchService {
    private client: MeiliSearch;
    private productsIndex: Index;

    constructor() {
        this.client = new MeiliSearch({
            host: process.env.MEILISEARCH_URL || 'http://localhost:7700',
            apiKey: process.env.MEILISEARCH_KEY,
        });
        this.productsIndex = this.client.index('products');
    }

    /**
     * Index a single product to Meilisearch
     * @param product - Product object with relations (category, tags)
     */
    async indexProduct(product: any): Promise<void> {
        try {
            const document = this.prepareDocument(product);
            await this.productsIndex.addDocuments([document]);
            console.log(`✅ Indexed product ${product.id} to Meilisearch`);
        } catch (error) {
            console.error(`⚠️ Failed to index product ${product.id}:`, error);
            // Don't throw - product already created in DB
        }
    }

    /**
     * Update a product in Meilisearch (same as index - Meilisearch auto-upserts)
     * @param product - Updated product object
     */
    async updateProduct(product: any): Promise<void> {
        try {
            const document = this.prepareDocument(product);
            await this.productsIndex.addDocuments([document]);
            console.log(`✅ Updated product ${product.id} in Meilisearch`);
        } catch (error) {
            console.error(`⚠️ Failed to update product ${product.id}:`, error);
        }
    }

    /**
     * Delete a product from Meilisearch
     * @param productId - Product ID to delete
     */
    async deleteProduct(productId: string): Promise<void> {
        try {
            await this.productsIndex.deleteDocument(productId);
            console.log(`✅ Deleted product ${productId} from Meilisearch`);
        } catch (error) {
            console.error(`⚠️ Failed to delete product ${productId}:`, error);
        }
    }

    /**
     * Search products
     * @param query - Search query
     * @param options - Search options (filters, limit, etc.)
     */
    async search(query: string, options?: any) {
        return await this.productsIndex.search(query, options);
    }

    /**
     * Prepare product document for Meilisearch
     * @param product - Raw product object
     * @returns Formatted document
     */
    private prepareDocument(product: any) {
        return {
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: product.price,
            imageUrl: product.imageUrl,
            categoryName: product.category?.name || product.categoryName || 'Uncategorized',
            tags: product.tags?.map((t: any) => t.tag?.name || t.name) || [],
            createdAt: product.createdAt,
        };
    }
}

// Export singleton instance
export const meilisearchService = new MeilisearchService();
