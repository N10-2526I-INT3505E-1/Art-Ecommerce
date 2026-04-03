<script lang="ts">
	
	import { ChevronDown, Filter, ShoppingCart, X } from 'lucide-svelte';
	import { onMount } from 'svelte';
import { page } from '$app/state';
	import { cart } from '$lib/stores/cart.svelte';
	import { type SearchHit, searchStore } from '$lib/stores/search.svelte';
	import { showToast } from '$lib/toastStore';

	// Get query from URL
	let searchQuery = $derived(page.url.searchParams.get('q') || '');
	let categoryFilter = $state('');
	let sortOption = $state('createdAt:desc');
	let minPrice = $state<number | undefined>(undefined);
	let maxPrice = $state<number | undefined>(undefined);
	let showFilters = $state(false);

	// Derived state from store
	let results = $derived(searchStore.results);
	let isLoading = $derived(searchStore.isLoading);
	let totalHits = $derived(searchStore.totalHits);
	let processingTimeMs = $derived(searchStore.processingTimeMs);
	let facets = $derived(searchStore.facets);

	// Format currency
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
	};

	// Perform search
	async function performSearch() {
		await searchStore.search({
			q: searchQuery,
			category: categoryFilter || undefined,
			minPrice: minPrice,
			maxPrice: maxPrice,
			sort: sortOption,
			limit: 50,
		});
	}

	// Add to cart
	function handleAddToCart(product: SearchHit) {
		cart.add({
			productId: product.id,
			name: product.name,
			price: product.price,
			imageUrl: product.imageUrl,
			quantity: 1,
		});
		showToast({ message: `Đã thêm "${product.name}" vào giỏ hàng`, type: 'success' });
	}

	// Clear filters
	function clearFilters() {
		categoryFilter = '';
		minPrice = undefined;
		maxPrice = undefined;
		sortOption = 'createdAt:desc';
		performSearch();
	}

	// Load facets and initial search
	onMount(async () => {
		await searchStore.loadFacets();
		if (searchQuery) {
			await performSearch();
		}
	});

	// Re-search when query changes
	$effect(() => {
		if (searchQuery) {
			performSearch();
		}
	});
</script>

<svelte:head>
	<title>{searchQuery ? `Tìm kiếm: ${searchQuery}` : 'Tìm kiếm'} | Novus</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 pt-20">
	<div class="container mx-auto max-w-7xl px-4 py-8">
		<!-- Header -->
		<div class="mb-6">
			<h1 class="text-2xl font-bold text-gray-900 md:text-3xl">
				{#if searchQuery}
					Kết quả tìm kiếm cho "{searchQuery}"
				{:else}
					Tìm kiếm sản phẩm
				{/if}
			</h1>
			{#if totalHits > 0}
				<p class="mt-1 text-sm text-gray-600">
					Tìm thấy {totalHits} sản phẩm ({processingTimeMs}ms)
				</p>
			{/if}
		</div>

		<div class="flex flex-col gap-6 lg:flex-row">
			<!-- Filters Sidebar -->
			<aside class="w-full lg:w-64 lg:flex-shrink-0">
				<!-- Mobile filter toggle -->
				<button
					class="btn btn-outline btn-sm mb-4 w-full lg:hidden"
					onclick={() => (showFilters = !showFilters)}
				>
					<Filter class="h-4 w-4" />
					Bộ lọc
					<ChevronDown class="h-4 w-4 {showFilters ? 'rotate-180' : ''}" />
				</button>

				<div class="rounded-lg bg-white p-4 shadow-sm {showFilters ? 'block' : 'hidden lg:block'}">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="font-semibold text-gray-900">Bộ lọc</h3>
						<button class="text-primary text-sm hover:underline" onclick={clearFilters}>
							Xóa tất cả
						</button>
					</div>

					<!-- Category Filter -->
					<div class="mb-4">
						<label class="mb-2 block text-sm font-medium text-gray-700">Danh mục</label>
						<select
							class="select select-bordered select-sm w-full"
							bind:value={categoryFilter}
							onchange={performSearch}
						>
							<option value="">Tất cả danh mục</option>
							{#each facets.categories as category}
								<option value={category}>{category}</option>
							{/each}
						</select>
					</div>

					<!-- Price Range -->
					<div class="mb-4">
						<label class="mb-2 block text-sm font-medium text-gray-700">Khoảng giá</label>
						<div class="flex items-center gap-2">
							<input
								type="number"
								placeholder="Từ"
								class="input input-bordered input-sm w-full"
								bind:value={minPrice}
								onchange={performSearch}
							/>
							<span class="text-gray-400">-</span>
							<input
								type="number"
								placeholder="Đến"
								class="input input-bordered input-sm w-full"
								bind:value={maxPrice}
								onchange={performSearch}
							/>
						</div>
					</div>

					<!-- Sort -->
					<div class="mb-4">
						<label class="mb-2 block text-sm font-medium text-gray-700">Sắp xếp</label>
						<select
							class="select select-bordered select-sm w-full"
							bind:value={sortOption}
							onchange={performSearch}
						>
							<option value="createdAt:desc">Mới nhất</option>
							<option value="createdAt:asc">Cũ nhất</option>
							<option value="price:asc">Giá thấp đến cao</option>
							<option value="price:desc">Giá cao đến thấp</option>
							<option value="name:asc">Tên A-Z</option>
							<option value="name:desc">Tên Z-A</option>
						</select>
					</div>

					<!-- Tags -->
					{#if facets.tags.length > 0}
						<div>
							<label class="mb-2 block text-sm font-medium text-gray-700">Tags phổ biến</label>
							<div class="flex flex-wrap gap-1">
								{#each facets.tags.slice(0, 10) as tag}
									<button
										class="badge badge-outline badge-sm hover:badge-primary cursor-pointer"
										onclick={() => {
											searchStore.search({ q: searchQuery, tags: tag });
										}}
									>
										{tag}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</aside>

			<!-- Results Grid -->
			<main class="flex-1">
				{#if isLoading}
					<div class="flex items-center justify-center py-12">
						<span class="loading loading-spinner loading-lg text-primary"></span>
					</div>
				{:else if results.length === 0}
					<div
						class="flex flex-col items-center justify-center rounded-lg bg-white py-16 text-center shadow-sm"
					>
						<div class="mb-4 text-6xl">🔍</div>
						<h3 class="mb-2 text-lg font-semibold text-gray-900">Không tìm thấy sản phẩm</h3>
						<p class="text-sm text-gray-600">
							Thử tìm kiếm với từ khóa khác hoặc điều chỉnh bộ lọc
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
						{#each results as product}
							<article
								class="group relative overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-lg"
							>
								<figure class="relative aspect-[3/4] overflow-hidden bg-gray-100">
									<img
										src={product.imageUrl}
										alt={product.name}
										class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
										loading="lazy"
									/>
									<div
										class="badge badge-sm badge-neutral absolute top-2 left-2 border-none bg-black/70 text-[10px] text-white backdrop-blur-md"
									>
										{product.categoryName}
									</div>

									<div
										class="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent p-2 transition-transform duration-300 group-hover:translate-y-0"
									>
										<button
											class="btn btn-primary btn-xs w-full shadow-lg"
											onclick={() => handleAddToCart(product)}
											aria-label={`Thêm ${product.name} vào giỏ`}
										>
											<ShoppingCart class="h-3 w-3" />
											<span class="text-[10px]">Thêm vào giỏ</span>
										</button>
									</div>
								</figure>

								<div class="p-3">
									<a
										href={`/products/${product.id}`}
										class="group-hover:text-primary line-clamp-2 block text-sm font-bold text-gray-900 transition-colors"
									>
										{#if product._formatted?.name}
											{@html product._formatted.name}
										{:else}
											{product.name}
										{/if}
									</a>
									<div class="mt-2 flex items-center justify-between">
										<span class="text-primary text-base font-semibold">
											{formatCurrency(product.price)}
										</span>
									</div>
									{#if product.tags && product.tags.length > 0}
										<div class="mt-2 flex flex-wrap gap-1">
											{#each product.tags.slice(0, 2) as tag}
												<span class="badge badge-ghost badge-xs">{tag}</span>
											{/each}
										</div>
									{/if}
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</main>
		</div>
	</div>
</div>
