<script lang="ts">
	import type { EmblaCarouselType } from 'embla-carousel';
	import AutoHeight from 'embla-carousel-auto-height';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import {
		Check,
		ChevronLeft,
		ChevronRight,
		Heart,
		Info,
		Minus,
		Plus,
		RotateCcw,
		Shield,
		ShoppingBag,
		Star,
		Tag,
		Truck,
		X,
	} from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { cart } from '$lib/stores/cart.svelte';
	import { currentProductStore, type CurrentProduct } from '$lib/stores/currentProduct.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Set current product for AI Chat context - use data.product directly to track navigation changes
	$effect(() => {
		const prod = data.product;
		if (prod) {
			console.log('🛍️ Setting current product for AI:', prod.name);
			currentProductStore.set({
				id: prod.id,
				name: prod.name,
				price: prod.price,
				description: prod.description,
				imageUrl: prod.images?.[0],
				categoryName: prod.category?.name,
				tags: prod.tags?.map((t: { name: string }) => t.name) ?? [],
			});
		}

		// Clear when leaving the page
		return () => {
			currentProductStore.clear();
		};
	});

	// ============================================
	// Constants
	// ============================================
	const EMBLA_OPTIONS = {
		loop: false,
		align: 'center' as const,
		skipSnaps: false,
		containScroll: 'trimSnaps' as const,
	};

	const EMBLA_PLUGINS = [AutoHeight()];
	const SWIPE_THRESHOLD = 50;
	const CART_FEEDBACK_DURATION = 2000;
	const LOW_STOCK_THRESHOLD = 5;

	// ============================================
	// Product Data (Derived from Server Data)
	// ============================================
	let product = $derived(data.product);

	// ============================================
	// State
	// ============================================
	let quantity = $state(1);
	let isWishlisted = $state(false);
	let addedToCart = $state(false);
	let showLightbox = $state(false);
	let lightboxIndex = $state(0);
	let touchStartX = $state(0);
	let touchStartY = $state(0);

	// Embla State
	let emblaApi = $state<EmblaCarouselType | null>(null);
	let selectedIndex = $state(0);
	let canScrollPrev = $state(false);
	let canScrollNext = $state(false);

	// Refs
	let lightboxRef = $state<HTMLElement | null>(null);
	let previousActiveElement: Element | null = null;

	// Timers (for cleanup)
	let addToCartTimer: ReturnType<typeof setTimeout>;

	// Embla event handler reference (for cleanup)
	let emblaSelectHandler: (() => void) | null = null;

	// ============================================
	// Derived State
	// ============================================
	const isLowStock = $derived(product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD);
	const isOutOfStock = $derived(product.stock === 0);
	const formattedPrice = $derived(new Intl.NumberFormat('vi-VN').format(product.price));

	const structuredData = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'Product',
			name: product.name,
			image: product.images,
			description: product.description,
			offers: {
				'@type': 'Offer',
				price: product.price,
				priceCurrency: 'VND',
				availability:
					product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
			},
			aggregateRating: {
				'@type': 'AggregateRating',
				ratingValue: product.rating,
				reviewCount: product.reviewCount,
			},
		}),
	);

	// ============================================
	// Reset State on Navigation
	// ============================================
	$effect(() => {
		// Watch for product ID changes to reset local state
		const _id = product.id;
		quantity = 1;
		addedToCart = false;
		selectedIndex = 0;
		if (emblaApi) emblaApi.scrollTo(0);
	});

	// ============================================
	// Embla Carousel Functions
	// ============================================
	function updateScrollButtons() {
		if (!emblaApi) return;
		canScrollPrev = emblaApi.canScrollPrev();
		canScrollNext = emblaApi.canScrollNext();
	}

	function onEmblaInit(event: CustomEvent<EmblaCarouselType>) {
		emblaApi = event.detail;
		selectedIndex = emblaApi.selectedScrollSnap();
		updateScrollButtons();

		emblaSelectHandler = () => {
			if (!emblaApi) return;
			selectedIndex = emblaApi.selectedScrollSnap();
			updateScrollButtons();
		};

		emblaApi.on('select', emblaSelectHandler);

		// Re-init if images loaded late
		emblaApi.reInit();
	}

	function scrollPrev() {
		emblaApi?.scrollPrev();
	}

	function scrollNext() {
		emblaApi?.scrollNext();
	}

	function scrollTo(index: number) {
		emblaApi?.scrollTo(index);
	}

	function handleFirstImageLoad() {
		emblaApi?.reInit();
	}

	// ============================================
	// Quantity Functions
	// ============================================
	function increaseQuantity() {
		if (quantity < product.stock) {
			quantity++;
		}
	}

	function decreaseQuantity() {
		if (quantity > 1) {
			quantity--;
		}
	}

	function validateQuantity() {
		const parsed = Math.floor(Number(quantity));
		quantity = Number.isNaN(parsed) || parsed < 1 ? 1 : Math.min(parsed, product.stock);
	}

	// ============================================
	// Cart Functions
	// ============================================
	function addToCart() {
		if (isOutOfStock) return;

		// Call the store method
		cart.addItem(product, quantity);

		console.log(`Added ${quantity} of ${product.name} to cart`);
		addedToCart = true;

		clearTimeout(addToCartTimer);
		addToCartTimer = setTimeout(() => {
			addedToCart = false;
		}, CART_FEEDBACK_DURATION);
	}

	function buyNow() {
		if (isOutOfStock) return;
		// Add to cart and redirect
		cart.addItem(product, quantity);
		goto('/cart');
	}

	function toggleWishlist() {
		isWishlisted = !isWishlisted;
	}

	// ============================================
	// Lightbox Functions (with browser guards)
	// ============================================
	function openLightbox(index: number) {
		if (browser) {
			previousActiveElement = document.activeElement;
			document.body.style.overflow = 'hidden';
		}
		lightboxIndex = index;
		showLightbox = true;
	}

	function closeLightbox() {
		showLightbox = false;

		if (browser) {
			document.body.style.overflow = '';

			// Restore focus to previous element
			if (previousActiveElement instanceof HTMLElement) {
				previousActiveElement.focus();
			}
		}
	}

	function nextImage() {
		if (lightboxIndex < product.images.length - 1) {
			lightboxIndex += 1;
		}
	}

	function prevImage() {
		if (lightboxIndex > 0) {
			lightboxIndex -= 1;
		}
	}

	function goToImage(index: number) {
		lightboxIndex = index;
	}

	// ============================================
	// Touch Handlers for Lightbox
	// ============================================
	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}

	function handleTouchEnd(e: TouchEvent) {
		if (!e.changedTouches.length) return;

		const touchEndX = e.changedTouches[0].clientX;
		const touchEndY = e.changedTouches[0].clientY;
		const diffX = touchStartX - touchEndX;
		const diffY = touchStartY - touchEndY;

		if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > SWIPE_THRESHOLD) {
			if (diffX > 0) {
				nextImage();
			} else {
				prevImage();
			}
		}
	}

	// ============================================
	// Keyboard Handlers
	// ============================================
	function handleKeydown(e: KeyboardEvent) {
		if (!showLightbox) return;

		switch (e.key) {
			case 'Escape':
				e.preventDefault();
				closeLightbox();
				break;
			case 'ArrowRight':
				e.preventDefault();
				nextImage();
				break;
			case 'ArrowLeft':
				e.preventDefault();
				prevImage();
				break;
			case 'Tab':
				handleFocusTrap(e);
				break;
		}
	}

	function handleFocusTrap(e: KeyboardEvent) {
		if (!browser || !lightboxRef) return;

		const focusableElements = lightboxRef.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
		);

		if (focusableElements.length === 0) return;

		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		if (e.shiftKey && document.activeElement === firstElement) {
			e.preventDefault();
			lastElement?.focus();
		} else if (!e.shiftKey && document.activeElement === lastElement) {
			e.preventDefault();
			firstElement?.focus();
		}
	}

	// ============================================
	// Lightbox Focus Management (with browser guard)
	// ============================================
	$effect(() => {
		if (browser && showLightbox && lightboxRef) {
			const closeButton = lightboxRef.querySelector<HTMLButtonElement>('button[aria-label="Đóng"]');
			closeButton?.focus();
		}
	});

	// ============================================
	// Lifecycle
	// ============================================
	onMount(() => {
		// Preload second image for smoother carousel
		if (product.images[1]) {
			const link = document.createElement('link');
			link.rel = 'preload';
			link.as = 'image';
			link.href = product.images[1];
			document.head.appendChild(link);
		}
	});

	onDestroy(() => {
		// Clean up timer
		clearTimeout(addToCartTimer);

		// Clean up embla listener
		if (emblaApi && emblaSelectHandler) {
			emblaApi.off('select', emblaSelectHandler);
		}

		// Reset body overflow (with browser guard)
		if (browser) {
			document.body.style.overflow = '';
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>{product.name} | Novus</title>
	<meta name="description" content={product.description} />
	<meta property="og:title" content={product.name} />
	<meta property="og:description" content={product.description} />
	<meta property="og:image" content={product.images[0]} />
	<meta property="og:type" content="product" />
	<meta
		name="viewport"
		content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"
	/>
	{@html `<script type="application/ld+json">${structuredData}</script>`}
</svelte:head>

<div class="bg-base-100 min-h-screen pb-24 lg:pb-12">
	<!-- Skip link -->
	<a
		href="#main-content"
		class="focus:bg-base-100 sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
	>
		Skip to main content
	</a>

	<!-- Breadcrumbs - Hidden on mobile -->
	<div class="container mx-auto hidden px-4 py-4 md:block lg:py-6">
		<nav
			aria-label="Breadcrumb"
			class="breadcrumbs text-sm opacity-60 transition-opacity hover:opacity-100"
		>
			<ul>
				<li><a href="/" class="hover:text-primary transition-colors">Trang chủ</a></li>
				{#if product.category}
					<li>
						<a href={`/shop/${product.category.slug}`} class="hover:text-primary transition-colors">
							{product.category.name}
						</a>
					</li>
				{/if}
				<li>
					<span class="text-base-content font-montserrat font-medium" aria-current="page">
						{product.name}
					</span>
				</li>
			</ul>
		</nav>
	</div>

	<main id="main-content" class="container mx-auto px-0 md:px-4" aria-labelledby="product-title">
		<div class="flex flex-col lg:grid lg:grid-cols-2 lg:gap-8 xl:gap-12">
			<!-- Product Images Section -->
			<section class="order-1 space-y-3 md:space-y-4 lg:space-y-6" aria-label="Product images">
				<!-- Main Carousel -->
				<div class="relative">
					<div
						class="embla bg-base-200 overflow-hidden lg:rounded-2xl xl:rounded-3xl"
						use:emblaCarouselSvelte={{ options: EMBLA_OPTIONS, plugins: EMBLA_PLUGINS }}
						onemblaInit={onEmblaInit}
						role="region"
						aria-label="Product image carousel"
						aria-roledescription="carousel"
					>
						<div class="embla__container">
							{#each product.images as img, i}
								<div
									class="embla__slide"
									role="group"
									aria-roledescription="slide"
									aria-label="Ảnh {i + 1} của {product.images.length}"
								>
									<button
										type="button"
										class="group relative block w-full cursor-zoom-in transition-transform active:scale-95"
										onclick={() => openLightbox(i)}
										aria-label="Phóng to ảnh {i + 1} của {product.images.length}"
									>
										<img
											src={img}
											alt="{product.name} - Góc nhìn {i + 1}"
											loading={i === 0 ? 'eager' : 'lazy'}
											decoding={i === 0 ? 'auto' : 'async'}
											fetchpriority={i === 0 ? 'high' : 'auto'}
											class="h-auto max-h-[85vh] min-h-[300px] w-full object-contain transition-transform duration-500 group-hover:scale-105 group-active:scale-100"
											onload={() => i === 0 && handleFirstImageLoad()}
										/>
										<div
											class="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
											aria-hidden="true"
										></div>
									</button>
								</div>
							{/each}
						</div>
					</div>

					<!-- Navigation Buttons - Hidden on mobile -->
					{#if canScrollPrev}
						<button
							type="button"
							class="btn btn-circle absolute top-1/2 left-4 z-10 hidden -translate-y-1/2 border-none bg-white/90 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-white active:scale-95 md:flex"
							onclick={scrollPrev}
							aria-label="Ảnh trước"
						>
							<ChevronLeft class="size-5 md:size-6" />
						</button>
					{/if}

					{#if canScrollNext}
						<button
							type="button"
							class="btn btn-circle absolute top-1/2 right-4 z-10 hidden -translate-y-1/2 border-none bg-white/90 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-white active:scale-95 md:flex"
							onclick={scrollNext}
							aria-label="Ảnh tiếp theo"
						>
							<ChevronRight class="size-5 md:size-6" />
						</button>
					{/if}

					<!-- Wishlist Button -->
					<div class="absolute top-2 right-2 z-10 flex gap-2 md:top-4 md:right-4">
						<button
							type="button"
							class="btn btn-circle touch-manipulation border border-black/30 bg-white/90 shadow-lg backdrop-blur-sm transition-all active:scale-90 md:hover:scale-110"
							onclick={toggleWishlist}
							aria-pressed={isWishlisted}
							aria-label={isWishlisted ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
						>
							<Heart class="size-5 {isWishlisted ? 'fill-error text-error' : ''}" />
						</button>
					</div>

					<!-- Image Counter -->
					<div
						class="bg-base-content/80 absolute bottom-2 left-2 z-10 rounded-full px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm md:bottom-4 md:left-4 md:px-4 md:py-1.5 md:text-sm"
						aria-live="polite"
						aria-atomic="true"
					>
						{selectedIndex + 1} / {product.images.length}
					</div>
				</div>

				<!-- Thumbnail Navigation -->
				{#if product.images.length > 1}
					<div
						class="scrollbar-hide flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-1 md:gap-3 md:px-1"
						role="tablist"
						aria-label="Ảnh thu nhỏ"
					>
						{#each product.images as img, i}
							<button
								type="button"
								class="relative size-14 shrink-0 touch-manipulation snap-start overflow-hidden rounded-lg transition-all md:size-20 md:rounded-xl {selectedIndex ===
								i
									? 'ring-primary ring-offset-base-100 scale-95 opacity-100 ring-2 ring-offset-2'
									: 'opacity-60 hover:opacity-80 active:scale-95'}"
								onclick={() => scrollTo(i)}
								role="tab"
								aria-selected={selectedIndex === i}
								aria-label="Xem ảnh {i + 1}"
								tabindex={selectedIndex === i ? 0 : -1}
							>
								<img
									src={img}
									alt=""
									loading="lazy"
									decoding="async"
									class="h-full w-full object-cover"
								/>
							</button>
						{/each}
					</div>
				{/if}
			</section>

			<!-- Product Info Section -->
			<section
				class="order-2 mt-4 px-4 md:px-0 lg:sticky lg:top-4 lg:mt-0 lg:self-start"
				aria-label="Product information"
			>
				<div class="space-y-4 md:space-y-6">
					<!-- Header -->
					<header class="space-y-2 md:space-y-3">
						{#if product.category}
							<div
								class="text-primary font-montserrat flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase md:text-sm"
							>
								<Tag class="size-3.5 md:size-4" />
								<span>{product.category.name}</span>
							</div>
						{/if}

						<h1
							id="product-title"
							class="text-base-content font-montserrat text-2xl leading-tight font-black tracking-tight md:text-4xl lg:text-5xl"
						>
							{product.name}
						</h1>

						<!-- Rating & Reviews -->
						<div class="flex flex-wrap items-center gap-2">
							<div class="flex items-center gap-1">
								<Star class="fill-warning text-warning size-4" />
								<span class="text-sm font-bold">{product.rating}</span>
							</div>
							<span class="text-base-content/50 text-xs" aria-hidden="true">|</span>
							<span class="text-base-content/70 text-xs">{product.reviewCount} đánh giá</span>
						</div>

						{#if product.sourceUrl}
							<a
								href={product.sourceUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="text-base-content/60 hover:text-primary hover:border-primary inline-flex touch-manipulation items-center gap-1 border-b border-transparent text-xs transition-colors md:text-sm"
							>
								Nguồn gốc sản phẩm
								<span class="text-xs" aria-hidden="true">↗</span>
							</a>
						{/if}
					</header>

					<!-- Pricing & Stock -->
					<div
						class="bg-base-200/50 border-base-200 rounded-xl border p-4 backdrop-blur-sm md:rounded-2xl md:p-6"
					>
						<div class="mb-3 flex items-start justify-between md:mb-4">
							<!-- Price -->
							<div class="flex items-baseline gap-1.5 md:gap-2">
								<span
									class="text-base-content font-montserrat text-2xl font-black tracking-tight md:text-4xl lg:text-5xl"
								>
									{formattedPrice}
								</span>
								<span class="text-base-content/50 text-base font-medium md:text-lg">VND</span>
							</div>

							<!-- Stock Status -->
							{#if !isOutOfStock}
								<div
									class="badge badge-success gap-1.5 border-none px-2.5 py-2.5 text-xs font-bold text-white md:px-3 md:py-3"
									role="status"
								>
									<span class="size-1.5 animate-pulse rounded-full bg-white" aria-hidden="true"
									></span>
									Còn hàng
								</div>
							{:else}
								<div
									class="badge badge-error bg-error/20 text-error gap-1.5 border-none px-2.5 py-2.5 text-xs font-bold md:px-3 md:py-3"
									role="status"
								>
									<span class="bg-error size-1.5 rounded-full" aria-hidden="true"></span>
									Hết hàng
								</div>
							{/if}
						</div>

						{#if isLowStock}
							<div
								id="stock-warning"
								class="alert alert-warning mb-3 flex items-start gap-2 p-3 text-sm md:mb-4 md:p-4"
								role="alert"
							>
								<Info class="mt-0.5 size-4 shrink-0" />
								<p class="text-xs font-semibold md:text-sm">Chỉ còn {product.stock} sản phẩm!</p>
							</div>
						{/if}

						<!-- Actions -->
						<div class="space-y-2.5 md:space-y-3">
							<!-- Quantity + Add to Cart Row -->
							<div class="flex gap-2 md:gap-3">
								<!-- Quantity Selector -->
								<div
									class="join border-base-300 bg-base-100 h-11 w-full rounded-lg border md:h-12 md:w-auto md:rounded-xl"
								>
									<button
										type="button"
										class="join-item btn btn-ghost hover:bg-base-200 h-full min-w-11 px-0 text-lg transition-transform active:scale-95 md:px-4"
										onclick={decreaseQuantity}
										disabled={isOutOfStock || quantity <= 1}
										aria-label="Giảm số lượng"
									>
										<Minus class="size-4" />
									</button>
									<label class="sr-only" for="quantity-input">Số lượng</label>
									<input
										id="quantity-input"
										class="join-item w-full border-none bg-transparent text-center text-sm font-bold focus:outline-none md:w-14 md:text-base"
										type="number"
										inputmode="numeric"
										pattern="[0-9]*"
										min="1"
										max={product.stock}
										bind:value={quantity}
										onblur={validateQuantity}
										aria-live="polite"
										aria-describedby={isLowStock ? 'stock-warning' : undefined}
									/>
									<button
										type="button"
										class="join-item btn btn-ghost hover:bg-base-200 h-full min-w-11 px-0 text-lg transition-transform active:scale-95 md:px-4"
										onclick={increaseQuantity}
										disabled={isOutOfStock || quantity >= product.stock}
										aria-label="Tăng số lượng"
									>
										<Plus class="size-4" />
									</button>
								</div>

								<!-- Add to Cart - Hidden on mobile (shown in sticky bar) -->
								<button
									type="button"
									class="btn btn-primary shadow-primary/20 hover:shadow-primary/40 hidden h-11 flex-1 gap-2 rounded-lg text-sm font-bold shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 md:flex md:h-12 md:rounded-xl md:text-base"
									onclick={addToCart}
									disabled={isOutOfStock}
									aria-live="polite"
								>
									{#if addedToCart}
										<Check class="size-[18px]" />
										Đã thêm!
									{:else}
										<ShoppingBag class="size-[18px]" />
										Thêm vào giỏ
									{/if}
								</button>
							</div>

							<!-- Buy Now Button -->
							<button
								type="button"
								class="btn btn-outline btn-block hover:bg-base-content hover:border-base-content hover:text-base-100 h-11 touch-manipulation rounded-lg border-2 text-sm font-bold transition-all active:scale-95 md:h-12 md:rounded-xl md:text-base"
								onclick={buyNow}
								disabled={isOutOfStock}
							>
								Mua ngay
							</button>
						</div>
					</div>

					<!-- Value Props -->
					<div class="grid grid-cols-3 gap-2 md:gap-3">
						<div
							class="bg-base-100 border-base-200 hover:border-primary/30 touch-manipulation rounded-lg border p-2.5 text-center transition-colors md:rounded-xl md:p-3"
						>
							<Truck
								class="text-primary mx-auto mb-1.5 size-5 opacity-80 md:size-6"
								strokeWidth={1.5}
							/>
							<span
								class="text-base-content/70 block text-[10px] leading-tight font-bold uppercase md:text-xs"
							>
								Giao hàng<br />nhanh
							</span>
						</div>
						<div
							class="bg-base-100 border-base-200 hover:border-primary/30 touch-manipulation rounded-lg border p-2.5 text-center transition-colors md:rounded-xl md:p-3"
						>
							<Shield
								class="text-primary mx-auto mb-1.5 size-5 opacity-80 md:size-6"
								strokeWidth={1.5}
							/>
							<span
								class="text-base-content/70 block text-[10px] leading-tight font-bold uppercase md:text-xs"
							>
								Thanh toán<br />bảo mật
							</span>
						</div>
						<div
							class="bg-base-100 border-base-200 hover:border-primary/30 touch-manipulation rounded-lg border p-2.5 text-center transition-colors md:rounded-xl md:p-3"
						>
							<RotateCcw
								class="text-primary mx-auto mb-1.5 size-5 opacity-80 md:size-6"
								strokeWidth={1.5}
							/>
							<span
								class="text-base-content/70 block text-[10px] leading-tight font-bold uppercase md:text-xs"
							>
								Đổi trả<br />dễ dàng
							</span>
						</div>
					</div>

					<!-- Trust Elements -->
					<div class="border-base-200 grid grid-cols-2 gap-4 border-t pt-4 md:pt-6">
						<div class="flex items-start gap-2">
							<span class="text-xl md:text-2xl" role="img" aria-label="Đánh giá sao">⭐</span>
							<div>
								<h4 class="text-xs font-bold md:text-sm">Đánh giá cao</h4>
								<p class="text-base-content/70 text-xs">{product.rating}/5 từ khách hàng</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-xl md:text-2xl" role="img" aria-label="Chứng nhận">📜</span>
							<div>
								<h4 class="text-xs font-bold md:text-sm">Xuất xứ rõ ràng</h4>
								<p class="text-base-content/70 text-xs">100% chính hãng</p>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>

		<!-- Description Section -->
		<section
			class="border-base-200 mt-8 border-t px-4 pt-6 md:mt-12 md:px-0 md:pt-8"
			aria-labelledby="product-description"
		>
			<div class="max-w-full">
				<div class="text-primary mb-3 flex items-center gap-2 md:mb-4">
					<Info class="size-[18px]" />
					<h2
						id="product-description"
						class="text-sm font-bold tracking-wider uppercase md:text-base"
					>
						Mô tả sản phẩm
					</h2>
				</div>
				<p
					class="text-base-content/80 mb-4 text-sm leading-relaxed font-light md:mb-6 md:text-base md:leading-loose"
				>
					{product.description}
				</p>

				{#if product.tags && product.tags.length > 0}
					<div class="flex flex-wrap gap-2" role="list" aria-label="Thẻ sản phẩm">
						{#each product.tags as tag (tag.id)}
							<div
								class="badge badge-lg badge-ghost text-base-content/70 gap-1.5 px-2 py-2.5 text-xs font-medium md:px-2.5 md:py-3 md:text-sm"
								role="listitem"
							>
								<div
									class="size-1.5 rounded-full {tag.type === 'auto' ? 'bg-info' : 'bg-secondary'}"
									aria-hidden="true"
								></div>
								{tag.name}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</section>
	</main>

	<!-- Mobile Sticky CTA -->
	{#if !isOutOfStock}
		<div
			class="bg-base-100/95 border-base-200 safe-bottom fixed right-0 bottom-0 left-0 z-40 border-t p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] backdrop-blur-md md:p-4 lg:hidden"
			role="complementary"
			aria-label="Hành động mua hàng nhanh"
		>
			<div class="mb-2 flex items-center justify-between gap-2">
				<div class="min-w-0 flex-1">
					<p class="text-base-content/60 truncate text-xs">{product.name}</p>
					<p class="text-base font-bold whitespace-nowrap md:text-lg">
						{formattedPrice} <span class="text-xs">VND</span>
					</p>
				</div>
				<button
					type="button"
					class="btn btn-circle border-base-300 touch-manipulation transition-transform active:scale-90"
					onclick={toggleWishlist}
					aria-pressed={isWishlisted}
					aria-label={isWishlisted ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
				>
					<Heart class="size-[18px] {isWishlisted ? 'fill-error text-error' : ''}" />
				</button>
			</div>
			<button
				type="button"
				class="btn btn-primary btn-block shadow-primary/25 h-11 touch-manipulation rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95"
				onclick={addToCart}
			>
				{#if addedToCart}
					<Check class="size-[18px]" />
					Đã thêm vào giỏ
				{:else}
					<ShoppingBag class="size-[18px]" />
					Thêm vào giỏ hàng
				{/if}
			</button>
		</div>
	{/if}

	<!-- Lightbox Modal -->
	{#if showLightbox}
		<div
			bind:this={lightboxRef}
			class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-2 backdrop-blur-sm md:p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="lightbox-title"
			onclick={(e) => e.target === e.currentTarget && closeLightbox()}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					closeLightbox();
				}
			}}
			ontouchstart={handleTouchStart}
			ontouchend={handleTouchEnd}
		>
			<h2 id="lightbox-title" class="sr-only">
				Ảnh {lightboxIndex + 1} của {product.images.length} - {product.name}
			</h2>

			<!-- Close button -->
			<button
				type="button"
				class="btn btn-circle absolute top-2 right-2 z-20 touch-manipulation border border-white/40 bg-black/60 text-white shadow-none hover:bg-black/80 active:scale-90 md:top-4 md:right-4"
				onclick={closeLightbox}
				aria-label="Đóng"
			>
				<X class="size-5 md:size-6" />
			</button>

			<!-- Navigation -->
			{#if lightboxIndex > 0}
				<button
					type="button"
					class="absolute top-1/2 left-2 z-20 flex -translate-y-1/2 touch-manipulation items-center justify-center rounded-full border border-white/40 bg-black/60 p-2 text-white hover:bg-black/80 active:scale-90 md:left-4 md:p-3"
					onclick={prevImage}
					aria-label="Ảnh trước"
				>
					<ChevronLeft class="size-5 md:size-6" />
				</button>
			{/if}

			{#if lightboxIndex < product.images.length - 1}
				<button
					type="button"
					class="absolute top-1/2 right-2 z-20 flex -translate-y-1/2 touch-manipulation items-center justify-center rounded-full border border-white/40 bg-black/60 p-2 text-white hover:bg-black/80 active:scale-90 md:right-4 md:p-3"
					onclick={nextImage}
					aria-label="Ảnh tiếp theo"
				>
					<ChevronRight class="size-5 md:size-6" />
				</button>
			{/if}

			<!-- Main image -->
			<div class="flex max-h-full max-w-full items-center justify-center">
				<img
					src={product.images[lightboxIndex]}
					alt="{product.name} - Xem toàn cỡ {lightboxIndex + 1}"
					class="max-h-[75vh] max-w-full object-contain md:max-h-[80vh]"
					loading="eager"
					decoding="sync"
				/>
			</div>

			<!-- Thumbnails -->
			{#if product.images.length > 1}
				<div
					class="scrollbar-hide mt-3 flex max-w-full gap-1.5 overflow-x-auto px-2 md:mt-4 md:gap-2 md:px-4"
					role="tablist"
					aria-label="Ảnh thu nhỏ trong lightbox"
				>
					{#each product.images as img, i}
						<button
							type="button"
							class="relative size-12 shrink-0 touch-manipulation overflow-hidden rounded-lg border-2 transition-all active:scale-90 md:size-16 lg:size-20 {lightboxIndex ===
							i
								? 'border-white opacity-100'
								: 'border-white/20 opacity-60 hover:opacity-80'}"
							onclick={() => goToImage(i)}
							role="tab"
							aria-selected={lightboxIndex === i}
							aria-label="Xem ảnh phóng to {i + 1}"
							tabindex={lightboxIndex === i ? 0 : -1}
						>
							<img
								src={img}
								alt=""
								loading="lazy"
								decoding="async"
								class="h-full w-full object-cover"
							/>
						</button>
					{/each}
				</div>
			{/if}

			<!-- Image Counter -->
			<div
				class="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm md:bottom-4 md:px-4 md:py-2 md:text-sm"
				aria-live="polite"
				aria-atomic="true"
			>
				{lightboxIndex + 1} / {product.images.length}
			</div>

			<!-- Swipe hint for mobile -->
			<div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/50 md:hidden">
				← Vuốt để xem ảnh khác →
			</div>
		</div>
	{/if}
</div>

<style>
	.embla {
		overflow: hidden;
	}

	.embla__container {
		display: flex;
		align-items: flex-start;
	}

	.embla__slide {
		flex: 0 0 100%;
		min-width: 0;
	}

	/* Hide scrollbar */
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;

		&::-webkit-scrollbar {
			display: none;
		}
	}

	/* Safe area for mobile notches */
	.safe-bottom {
		padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
	}

	/* Remove number input spinners */
	input[type='number'] {
		-moz-appearance: textfield;

		&::-webkit-inner-spin-button,
		&::-webkit-outer-spin-button {
			-webkit-appearance: none;
			margin: 0;
		}
	}
</style>
