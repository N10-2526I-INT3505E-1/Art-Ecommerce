<script lang="ts">
	import { ExternalLink } from 'lucide-svelte';
	import ProductCard from './ProductCard.svelte';
	import { marked } from 'marked';

	interface Props {
		data: {
			analysis: string;
			products: any[];
		};
	}

	let { data }: Props = $props();

	// Convert markdown to HTML
	const analysisHtml = $derived(marked(data.analysis || 'Không có phân tích'));
</script>

<div class="space-y-6">
	<!-- Analysis Text -->
	<div class="prose max-w-none">
		<h3 class="mb-2 text-lg font-semibold">Phân Tích Của AI</h3>
		<div class="bg-base-200 rounded-lg p-4">
			<!-- Render markdown as HTML -->
			{@html analysisHtml}
		</div>

		<!-- Debug info (only in development) -->
		{#if import.meta.env.DEV}
			<details class="text-base-content/50 mt-2 text-xs">
				<summary class="cursor-pointer">🔍 Debug Info</summary>
				<pre class="bg-base-300 mt-2 overflow-auto rounded p-2">{JSON.stringify(
						data,
						null,
						2,
					)}</pre>
			</details>
		{/if}
	</div>

	<!-- Product Recommendations -->
	{#if data.products && data.products.length > 0}
		<div>
			<h3 class="mb-4 text-lg font-semibold">Gợi Ý Sản Phẩm ({data.products.length})</h3>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#each data.products as product}
					<ProductCard {product} />
				{/each}
			</div>
		</div>
	{:else}
		<div class="alert alert-info">
			<span>Không tìm thấy sản phẩm phù hợp trong kho</span>
		</div>
	{/if}
</div>
