import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { MeiliSearch } from 'meilisearch';
import { products, categories, product_tags, tags } from '../products/product.model';
import { eq } from 'drizzle-orm';

// Initialize database
const client = createClient({
	url: process.env.TURSO_PRODUCTS_DATABASE_URL!,
	authToken: process.env.TURSO_PRODUCTS_AUTH_TOKEN,
});

const db = drizzle(client);

// Initialize Meilisearch
const meiliClient = new MeiliSearch({
	host: process.env.MEILISEARCH_URL || 'http://localhost:7700',
	// No API key needed in development mode
	// For production, set MEILI_MASTER_KEY in docker-compose and use:
	// apiKey: process.env.MEILISEARCH_KEY,
	apiKey: process.env.MEILISEARCH_KEY || 'your_super_secret_master_key_change_this',
});

async function batchIndexProducts() {
	console.log('🚀 Starting batch indexing to Meilisearch...\n');

	try {
		// 1. Fetch all products with categories in one query
		console.log('📦 Fetching products from database...');
		const allProducts = await db
			.select({
				id: products.id,
				name: products.name,
				description: products.description,
				price: products.price,
				imageUrl: products.imageUrl,
				categoryId: products.categoryId,
				categoryName: categories.name,
				createdAt: products.createdAt,
			})
			.from(products)
			.leftJoin(categories, eq(products.categoryId, categories.id));
		console.log(`   ✅ Found ${allProducts.length} products\n`);

		// 2. Fetch all product tags in one query
		console.log('📦 Fetching product tags...');
		const allProductTags = await db
			.select({
				productId: product_tags.productId,
				tagName: tags.name,
			})
			.from(product_tags)
			.innerJoin(tags, eq(product_tags.tagId, tags.id));

		// Group tags by product ID
		const tagsByProduct = new Map<string, string[]>();
		for (const pt of allProductTags) {
			if (!tagsByProduct.has(pt.productId)) {
				tagsByProduct.set(pt.productId, []);
			}
			tagsByProduct.get(pt.productId)!.push(pt.tagName);
		}
		console.log(`   ✅ Fetched tags for ${tagsByProduct.size} products\n`);

		// 3. Prepare documents for Meilisearch
		console.log('🔄 Preparing documents...');
		const documents = allProducts.map((product) => ({
			id: product.id,
			name: product.name,
			description: product.description || '',
			price: product.price,
			imageUrl: product.imageUrl,
			categoryName: product.categoryName || 'Uncategorized',
			tags: tagsByProduct.get(product.id) || [],
			createdAt: product.createdAt,
		}));

		console.log(`   ✅ Prepared ${documents.length} documents\n`);

		// 3. Index to Meilisearch
		console.log('📤 Indexing to Meilisearch...');
		const index = meiliClient.index('products');

		// Batch index (Meilisearch handles large batches well)
		const task = await index.addDocuments(documents);
		console.log(`   ⏳ Task submitted: ${task.taskUid}`);
		console.log(`   ✅ Indexing started (processing in background)!\n`);

		// Wait a bit for indexing to process
		console.log('⏳ Waiting 3 seconds for indexing to complete...');
		await new Promise((resolve) => setTimeout(resolve, 3000));
		console.log(`   ✅ Indexing should be completed!\n`);

		// 4. Verify
		const stats = await index.getStats();
		console.log('📊 Index Statistics:');
		console.log(`   - Total documents: ${stats.numberOfDocuments}`);
		console.log(`   - Is indexing: ${stats.isIndexing}`);
		console.log(`   - Field distribution:`, stats.fieldDistribution);

		console.log('\n🎉 Batch indexing completed successfully!');
	} catch (error) {
		console.error('❌ Error during batch indexing:', error);
		process.exit(1);
	}
}

// Run the script
batchIndexProducts();
