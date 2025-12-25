<script lang="ts">
	import { ExternalLink, Tag } from 'lucide-svelte';

	interface Props {
		product: {
			original_id: number;
			name: string;
			price: number;
			imageUrl: string;
			category?: string;
			tags?: string[];
		};
	}

	let { product }: Props = $props();

	function formatPrice(price: number): string {
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND'
		}).format(price);
	}
</script>

<div class="card bg-base-100 border border-base-300 hover:shadow-lg transition-shadow">
	<figure class="aspect-square overflow-hidden bg-base-200">
		<img src={product.imageUrl} alt={product.name} class="w-full h-full object-cover" />
	</figure>
	<div class="card-body p-4">
		<h3 class="card-title text-base line-clamp-2">{product.name}</h3>

		{#if product.category}
			<p class="text-sm text-base-content/70">{product.category}</p>
		{/if}

		<p class="text-lg font-bold text-primary">{formatPrice(product.price)}</p>

		{#if product.tags && product.tags.length > 0}
			<div class="flex flex-wrap gap-1 mt-2">
				{#each product.tags.slice(0, 3) as tag}
					<span class="badge badge-sm badge-outline">
						{tag}
					</span>
				{/each}
				{#if product.tags.length > 3}
					<span class="badge badge-sm">+{product.tags.length - 3}</span>
				{/if}
			</div>
		{/if}

		<div class="card-actions justify-end mt-2">
			<a href={`/products/${product.original_id}`} class="btn btn-primary btn-sm">
				Xem Chi Tiết
				<ExternalLink class="w-4 h-4" />
			</a>
		</div>
	</div>
</div>
