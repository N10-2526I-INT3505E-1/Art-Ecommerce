import { MeiliSearch } from 'meilisearch';

const client = new MeiliSearch({
    host: process.env.MEILISEARCH_URL || 'http://localhost:7700',
    apiKey: process.env.MEILISEARCH_KEY,
});

async function setupMeilisearchIndex() {
    console.log('🔧 Setting up Meilisearch index...\n');

    try {
        const index = client.index('products');

        // 1. Configure searchable attributes
        console.log('📝 Configuring searchable attributes...');
        await index.updateSearchableAttributes([
            'name',
            'description',
            'tags',
            'categoryName'
        ]);
        console.log('   ✅ Searchable attributes set\n');

        // 2. Configure filterable attributes
        console.log('🔍 Configuring filterable attributes...');
        await index.updateFilterableAttributes([
            'categoryName',
            'tags',
            'price'
        ]);
        console.log('   ✅ Filterable attributes set\n');

        // 3. Configure sortable attributes
        console.log('📊 Configuring sortable attributes...');
        await index.updateSortableAttributes([
            'price',
            'createdAt'
        ]);
        console.log('   ✅ Sortable attributes set\n');

        // 4. Verify settings
        const settings = await index.getSettings();
        console.log('✅ Index settings configured successfully!');
        console.log('\n📋 Current settings:');
        console.log('   - Searchable:', settings.searchableAttributes);
        console.log('   - Filterable:', settings.filterableAttributes);
        console.log('   - Sortable:', settings.sortableAttributes);

    } catch (error) {
        console.error('❌ Error setting up index:', error);
        process.exit(1);
    }
}

// Run setup
setupMeilisearchIndex();
