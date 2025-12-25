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
        // 1. Fetch all products with relations
        console.log('📦 Fetching products from database...');
        const allProducts = await db.select().from(products);
        console.log(`   ✅ Found ${allProducts.length} products\n`);

        // 2. Prepare documents for Meilisearch
        console.log('🔄 Preparing documents...');
        const documents = [];

        for (const product of allProducts) {
            // Get category
            let categoryName = null;
            if (product.categoryId) {
                const category = await db
                    .select()
                    .from(categories)
                    .where(eq(categories.id, product.categoryId))
                    .get();
                categoryName = category?.name;
            }

            // Get tags
            const productTagsData = await db
                .select({ tagName: tags.name })
                .from(product_tags)
                .innerJoin(tags, eq(product_tags.tagId, tags.id))
                .where(eq(product_tags.productId, product.id));

            const tagNames = productTagsData.map(pt => pt.tagName);

            // Create Meilisearch document
            documents.push({
                id: product.id,
                name: product.name,
                description: product.description || '',
                price: product.price,
                imageUrl: product.imageUrl,
                categoryName: categoryName || 'Uncategorized',
                tags: tagNames,
                createdAt: product.createdAt,
            });
        }

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
        await new Promise(resolve => setTimeout(resolve, 3000));
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