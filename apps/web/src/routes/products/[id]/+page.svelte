<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import {
		ShoppingBag,
		Heart,
		Truck,
		Shield,
		RotateCcw,
		Info,
		Tag,
		ChevronLeft,
		ChevronRight,
		X,
		Minus,
		Plus,
		Check,
		Package,
		Star,
	} from 'lucide-svelte';
	import TreeBg from '$lib/assets/backgrounds/Tree.jpg';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import AutoHeight from 'embla-carousel-auto-height';

	const product = {
		id: $page.params.id,
		name: 'Tranh phong cảnh rừng',
		price: 2500000,
		imageUrl: TreeBg,
		description:
			'Bức tranh là một bức chân dung nửa người và thể hiện một phụ nữ có những nét thể hiện trên khuôn mặt thường được miêu tả là bí ẩn. Sự mơ hồ trong nét thể hiện của người mẫu, sự lạ thường của thành phần nửa khuôn mặt, và sự huyền ảo của các kiểu mẫu hình thức và không khí hư ảo là những tính chất mới lạ góp phần vào sức mê hoặc của bức tranh. Có lẽ nó là bức tranh nổi tiếng nhất từng bị đánh cắp và được thu hồi về bảo tàng Louvre. Ít tác phẩm nghệ thuật khác từng là chủ đề của nhiều sự chăm sóc kỹ lưỡng, nghiên cứu, thần thoại hoá và bắt chước tới như vậy. Một sự nghiên cứu và vẽ thử bằng chì than và graphite về Mona Lisa được cho là của Leonardo có trong Bộ sưu tập Hyde, tại Glens Falls, NY,',
		slug: 'ethereal-landscapes-4',
		stock: 3,
		category: {
			name: 'Tranh',
			slug: 'painting',
		},
		sourceUrl: '',
		tags: [
			{ id: '1', name: 'Thiên nhiên', type: 'auto' },
			{ id: '2', name: 'Sơn dầu', type: 'auto' },
			{ id: '3', name: 'Khổ lớn', type: 'manual' },
			{ id: '4', name: 'Đương đại', type: 'manual' },
		],
		images: [TreeBg, TreeBg, TreeBg, TreeBg],
		rating: 4.8,
		reviewCount: 127,
	};

	// State
	let quantity = $state(1);
	let isWishlisted = $state(false);
	let addedToCart = $state(false);
	let showLightbox = $state(false);
	let lightboxIndex = $state(0);
	let touchStartX = $state(0);
	let touchStartY = $state(0);

	// Embla API
	let emblaApi = $state<any>(null);
	let selectedIndex = $state(0);
	let canScrollPrev = $state(false);
	let canScrollNext = $state(false);

	const emblaOptions = {
		loop: false,
		align: 'center',
		skipSnaps: false,
		containScroll: 'trimSnaps',
	};

	const emblaPlugins = [AutoHeight()];

	function onEmblaInit(event: CustomEvent) {
		emblaApi = event.detail;
		selectedIndex = emblaApi.selectedScrollSnap();
		updateScrollButtons();

		emblaApi.on('select', () => {
			selectedIndex = emblaApi.selectedScrollSnap();
			updateScrollButtons();
		});
	}

	function updateScrollButtons() {
		if (!emblaApi) return;
		canScrollPrev = emblaApi.canScrollPrev();
		canScrollNext = emblaApi.canScrollNext();
	}

	function scrollPrev() {
		if (emblaApi) emblaApi.scrollPrev();
	}

	function scrollNext() {
		if (emblaApi) emblaApi.scrollNext();
	}

	function scrollTo(index: number) {
		if (emblaApi) emblaApi.scrollTo(index);
	}

	// Quantity validation
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
		if (quantity < 1) quantity = 1;
		if (quantity > product.stock) quantity = product.stock;
	}

	function addToCart() {
		if (product.stock === 0) return;
		console.log(`Added ${quantity} of ${product.name} to cart`);
		addedToCart = true;
		setTimeout(() => {
			addedToCart = false;
		}, 2000);
	}

	function buyNow() {
		if (product.stock === 0) return;
		console.log(`Buy now: ${quantity} of ${product.name}`);
	}

	function toggleWishlist() {
		isWishlisted = !isWishlisted;
	}

	function openLightbox(index: number) {
		lightboxIndex = index;
		showLightbox = true;
		document.body.style.overflow = 'hidden';
	}

	function closeLightbox() {
		showLightbox = false;
		document.body.style.overflow = '';
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

	// Touch swipe handlers for lightbox
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

		// Only trigger swipe if horizontal movement is greater than vertical
		if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
			if (diffX > 0) {
				// Swiped left - next image
				nextImage();
			} else {
				// Swiped right - previous image
				prevImage();
			}
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!showLightbox) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			closeLightbox();
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			nextImage();
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			prevImage();
		}
	}

	onMount(() => {
		const img = new Image();
		img.src = product.images[0];

		setTimeout(() => {
			if (emblaApi) emblaApi.reInit();
		}, 100);

		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>{product.name} | Novus</title>
	<meta name="description" content={product.description} />
	<meta property="og:title" content={product.name} />
	<meta property="og:description" content={product.description} />
	<meta property="og:image" content={product.imageUrl} />
	<meta
		name="viewport"
		content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"
	/>
</svelte:head>

<div class="bg-base-100 min-h-screen pb-24 md:pb-12">
	<!-- Skip link -->
	<a
		href="#main-content"
		class="focus:bg-base-100 sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
	>
		Skip to main content
	</a>

	<!-- Breadcrumbs - Hidden on mobile, shown on tablet+ -->
	<div class="container mx-auto hidden px-4 py-3 sm:block md:py-4 lg:py-6">
		<nav
			aria-label="Breadcrumb"
			class="breadcrumbs text-xs opacity-60 transition-opacity hover:opacity-100 md:text-sm"
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
		<!-- Mobile: Images First, then Info -->
		<div class="flex flex-col lg:grid lg:grid-cols-2 lg:gap-8 xl:gap-12">
			<!-- Product Images Section -->
			<section class="order-1 space-y-3 md:space-y-4 lg:space-y-6" aria-label="Product images">
				<!-- Main Carousel -->
				<div class="relative">
					<div
						class="embla bg-base-200 overflow-hidden lg:rounded-2xl xl:rounded-3xl"
						use:emblaCarouselSvelte={{ options: emblaOptions, plugins: emblaPlugins }}
						onemblaInit={onEmblaInit}
						role="region"
						aria-label="Product image carousel"
					>
						<div class="embla__container">
							{#each product.images as img, i}
								<div class="embla__slide">
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
											class="h-auto w-full object-contain transition-transform duration-500 group-hover:scale-105 group-active:scale-100"
											style="max-height: 85vh; min-height: 300px;"
											onload={() => i === 0 && emblaApi?.reInit()}
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

					<!-- Navigation Buttons - Hidden on mobile, shown on md+ -->
					{#if canScrollPrev}
						<button
							type="button"
							class="btn btn-circle absolute top-1/2 left-3 z-10 hidden -translate-y-1/2 border-none bg-white/90 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-white active:scale-95 md:flex lg:left-4"
							onclick={scrollPrev}
							aria-label="Ảnh trước"
						>
							<ChevronLeft size={20} class="md:h-6 md:w-6" />
						</button>
					{/if}

					{#if canScrollNext}
						<button
							type="button"
							class="btn btn-circle absolute top-1/2 right-3 z-10 hidden -translate-y-1/2 border-none bg-white/90 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-white active:scale-95 md:flex lg:right-4"
							onclick={scrollNext}
							aria-label="Ảnh tiếp theo"
						>
							<ChevronRight size={20} class="md:h-6 md:w-6" />
						</button>
					{/if}

					<div class="absolute top-2 right-2 z-10 flex gap-2 md:top-4 md:right-4">
						<button
							type="button"
							class="btn btn-circle touch-manipulation border border-black/30 bg-white/90 shadow-lg backdrop-blur-sm transition-all active:scale-90 md:hover:scale-110"
							onclick={toggleWishlist}
							aria-pressed={isWishlisted}
							aria-label={isWishlisted ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
						>
							<Heart size={18} class="size-5 {isWishlisted ? 'fill-error text-error' : ''}" />
						</button>
					</div>

					<!-- Image Counter - Mobile optimized -->
					<div
						class="bg-base-content/80 absolute bottom-2 left-2 z-10 rounded-full px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm md:bottom-4 md:left-4 md:px-4 md:py-1.5 md:text-sm"
						aria-live="polite"
						aria-atomic="true"
					>
						{selectedIndex + 1} / {product.images.length}
					</div>
				</div>

				<!-- Thumbnail Navigation - Mobile scrollable -->
				<div
					class="scrollbar-hide flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-1 md:gap-3 md:px-1"
					role="tablist"
					aria-label="Ảnh thu nhỏ"
				>
					{#each product.images as img, i}
						<button
							type="button"
							class="relative h-14 w-14 shrink-0 touch-manipulation snap-start overflow-hidden rounded-lg transition-all sm:h-16 sm:w-16 md:h-20 md:w-20 md:rounded-xl {selectedIndex ===
							i
								? 'ring-primary ring-offset-base-100 scale-95 opacity-100 ring-2 ring-offset-2'
								: 'opacity-60 active:scale-95'}"
							onclick={() => scrollTo(i)}
							role="tab"
							aria-selected={selectedIndex === i}
							aria-label="Xem ảnh {i + 1}"
							tabindex={selectedIndex === i ? 0 : -1}
						>
							<img
								src={img}
								alt="Thumbnail {i + 1}"
								loading="lazy"
								class="h-full w-full object-cover"
							/>
						</button>
					{/each}
				</div>
			</section>

			<!-- Product Info Section - Mobile padding added -->
			<aside class="order-2 mt-4 px-4 md:px-0 lg:sticky lg:top-4 lg:mt-0 lg:self-start">
				<div class="space-y-4 md:space-y-6">
					<!-- Header -->
					<header class="space-y-2 md:space-y-3">
						{#if product.category}
							<div
								class="text-primary font-montserrat flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase md:text-sm"
							>
								<Tag size={14} />
								<span>{product.category.name}</span>
							</div>
						{/if}
						<h1
							id="product-title"
							class="text-base-content font-montserrat text-2xl leading-tight font-black tracking-tight sm:text-3xl md:text-4xl lg:text-5xl"
						>
							{product.name}
						</h1>

						<!-- Rating & Reviews - Mobile friendly -->
						<div class="flex flex-wrap items-center gap-2">
							<div class="flex items-center gap-1">
								<Star size={16} class="fill-warning text-warning" />
								<span class="text-sm font-bold">{product.rating}</span>
							</div>
							<span class="text-base-content/50 text-xs">|</span>
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
									class="text-base-content font-montserrat text-2xl font-black tracking-tight sm:text-3xl md:text-4xl lg:text-5xl"
								>
									{product.price.toLocaleString()}
								</span>
								<span class="text-base-content/50 text-base font-medium md:text-lg">VND</span>
							</div>

							<!-- Stock Status - Mobile compact -->
							{#if product.stock > 0}
								<div
									class="badge badge-success gap-1.5 border-none px-2.5 py-2.5 text-xs font-bold text-white md:px-3 md:py-3"
									role="status"
								>
									<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-white"></span>
									Còn hàng
								</div>
							{:else}
								<div
									class="badge badge-error bg-error/20 text-error gap-1.5 border-none px-2.5 py-2.5 text-xs font-bold md:px-3 md:py-3"
									role="status"
								>
									<span class="bg-error h-1.5 w-1.5 rounded-full"></span>
									Hết hàng
								</div>
							{/if}
						</div>

						{#if product.stock > 0 && product.stock <= 5}
							<div
								class="alert alert-warning mb-3 flex items-start gap-2 p-3 text-sm md:mb-4 md:p-4"
								role="alert"
							>
								<Info size={16} class="mt-0.5 shrink-0" />
								<div>
									<p class="text-xs font-semibold md:text-sm">Chỉ còn {product.stock} sản phẩm!</p>
								</div>
							</div>
						{/if}

						<!-- Actions - Mobile optimized -->
						<div class="space-y-2.5 md:space-y-3">
							<!-- Quantity + Add to Cart Row -->
							<div class="flex gap-2 md:gap-3">
								<!-- Quantity Selector - Larger touch targets -->
								<div
									class="join border-base-300 bg-base-100 h-11 w-full rounded-lg border md:h-12 md:w-auto md:rounded-xl"
								>
									<button
										type="button"
										class="join-item btn btn-ghost hover:bg-base-200 h-full min-w-[44px] px-0 text-lg transition-transform active:scale-95 md:px-4"
										onclick={decreaseQuantity}
										disabled={product.stock === 0 || quantity <= 1}
										aria-label="Giảm số lượng"
									>
										<Minus size={16} />
									</button>
									<label class="sr-only" for="quantity-input">Số lượng</label>
									<input
										id="quantity-input"
										class="join-item flex-1 border-none bg-transparent text-center text-sm font-bold focus:outline-none md:w-14 md:flex-none md:text-base"
										type="number"
										inputmode="numeric"
										pattern="[0-9]*"
										min="1"
										max={product.stock}
										bind:value={quantity}
										onblur={validateQuantity}
										aria-live="polite"
									/>
									<button
										type="button"
										class="join-item btn btn-ghost hover:bg-base-200 h-full min-w-[44px] px-0 text-lg transition-transform active:scale-95 md:px-4"
										onclick={increaseQuantity}
										disabled={product.stock === 0 || quantity >= product.stock}
										aria-label="Tăng số lượng"
									>
										<Plus size={16} />
									</button>
								</div>

								<!-- Add to Cart - Hidden on mobile (shown in sticky bar) -->
								<button
									type="button"
									class="btn btn-primary shadow-primary/20 hover:shadow-primary/40 hidden h-11 flex-1 gap-2 rounded-lg text-sm font-bold shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 md:flex md:h-12 md:rounded-xl md:text-base"
									onclick={addToCart}
									disabled={product.stock === 0}
									aria-live="polite"
								>
									{#if addedToCart}
										<Check size={18} /> Đã thêm!
									{:else}
										<ShoppingBag size={18} />
										Thêm vào giỏ
									{/if}
								</button>
							</div>

							<!-- Buy Now Button -->
							<button
								type="button"
								class="btn btn-outline btn-block hover:bg-base-content hover:border-base-content hover:text-base-100 h-11 touch-manipulation rounded-lg border-2 text-sm font-bold transition-all active:scale-95 md:h-12 md:rounded-xl md:text-base"
								onclick={buyNow}
								disabled={product.stock === 0}
							>
								Mua ngay
							</button>
						</div>
					</div>

					<!-- Value Props - Mobile grid -->
					<div class="grid grid-cols-3 gap-2 md:gap-3">
						<div
							class="bg-base-100 border-base-200 hover:border-primary/30 touch-manipulation rounded-lg border p-2.5 text-center transition-colors md:rounded-xl md:p-3"
						>
							<Truck
								size={20}
								class="text-primary mx-auto mb-1.5 opacity-80 md:h-6 md:w-6"
								strokeWidth={1.5}
							/>
							<span
								class="text-base-content/70 block text-[0.625rem] leading-tight font-bold uppercase md:text-xs"
							>
								Giao hàng<br />nhanh
							</span>
						</div>
						<div
							class="bg-base-100 border-base-200 hover:border-primary/30 touch-manipulation rounded-lg border p-2.5 text-center transition-colors md:rounded-xl md:p-3"
						>
							<Shield
								size={20}
								class="text-primary mx-auto mb-1.5 opacity-80 md:h-6 md:w-6"
								strokeWidth={1.5}
							/>
							<span
								class="text-base-content/70 block text-[0.625rem] leading-tight font-bold uppercase md:text-xs"
							>
								Thanh toán<br />bảo mật
							</span>
						</div>
						<div
							class="bg-base-100 border-base-200 hover:border-primary/30 touch-manipulation rounded-lg border p-2.5 text-center transition-colors md:rounded-xl md:p-3"
						>
							<RotateCcw
								size={20}
								class="text-primary mx-auto mb-1.5 opacity-80 md:h-6 md:w-6"
								strokeWidth={1.5}
							/>
							<span
								class="text-base-content/70 block text-[0.625rem] leading-tight font-bold uppercase md:text-xs"
							>
								Đổi trả<br />dễ dàng
							</span>
						</div>
					</div>

					<!-- Trust Elements - Mobile layout -->
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
			</aside>
		</div>

		<!-- Description Section - Mobile friendly -->
		<section
			class="border-base-200 mt-8 border-t px-4 pt-6 md:mt-12 md:px-0 md:pt-8"
			aria-labelledby="product-description"
		>
			<div class="max-w-full">
				<div class="text-primary mb-3 flex items-center gap-2 md:mb-4">
					<Info size={18} />
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
						{#each product.tags as tag}
							<div
								class="badge badge-lg badge-ghost text-base-content/70 gap-1.5 px-2 py-2.5 text-xs font-medium md:px-2.5 md:py-3 md:text-sm"
								role="listitem"
							>
								<div
									class="h-1.5 w-1.5 rounded-full {tag.type === 'auto'
										? 'bg-info'
										: 'bg-secondary'}"
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

	<!-- Mobile Sticky CTA - Improved -->
	{#if product.stock > 0}
		<div
			class="bg-base-100/95 border-base-200 safe-bottom fixed right-0 bottom-0 left-0 z-40 border-t p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] backdrop-blur-md md:p-4 lg:hidden"
			role="complementary"
			aria-label="Hành động mua hàng nhanh"
		>
			<div class="mb-2 flex items-center justify-between gap-2">
				<div class="min-w-0 flex-1">
					<p class="text-base-content/60 truncate text-xs">{product.name}</p>
					<p class="text-base font-bold whitespace-nowrap md:text-lg">
						{product.price.toLocaleString()} <span class="text-xs">VND</span>
					</p>
				</div>
				<button
					type="button"
					class="btn btn-circle border-base-300 touch-manipulation transition-transform active:scale-90"
					onclick={toggleWishlist}
					aria-pressed={isWishlisted}
					aria-label={isWishlisted ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
				>
					<Heart size={18} class={isWishlisted ? 'fill-error text-error' : ''} />
				</button>
			</div>
			<button
				type="button"
				class="btn btn-primary btn-block shadow-primary/25 h-11 touch-manipulation rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95"
				onclick={addToCart}
			>
				{#if addedToCart}
					<Check size={18} /> Đã thêm vào giỏ
				{:else}
					<ShoppingBag size={18} />
					Thêm vào giỏ hàng
				{/if}
			</button>
		</div>
	{/if}

	<!-- Lightbox Modal - Mobile optimized with swipe -->
	{#if showLightbox}
		<div
			class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-2 backdrop-blur-sm md:p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="lightbox-title"
			tabindex="0"
			onclick={(e) => e.target === e.currentTarget && closeLightbox()}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					closeLightbox();
				}
			}}
			ontouchstart={handleTouchStart}
			ontouchend={handleTouchEnd}
		>
			<h2 id="lightbox-title" class="sr-only">
				Ảnh {lightboxIndex + 1} của {product.images.length} - {product.name}
			</h2>

			<!-- Close button - Mobile friendly -->
			<button
				type="button"
				class="btn btn-circle absolute top-2 right-2 z-20 touch-manipulation border border-white/40 bg-black/60 text-white shadow-none hover:bg-black/80 active:scale-90 md:top-4 md:right-4"
				onclick={closeLightbox}
				aria-label="Đóng"
			>
				<X size={20} class="size-6" />
			</button>

			<!-- Navigation - Touch friendly -->
			{#if lightboxIndex > 0}
				<button
					type="button"
					class="absolute top-1/2 left-2 z-20 flex -translate-y-1/2 touch-manipulation items-center justify-center rounded-full border border-white/40 bg-black/60 p-2 text-white hover:bg-black/80 active:scale-90 md:left-4 md:p-3"
					onclick={prevImage}
					aria-label="Ảnh trước"
				>
					<ChevronLeft size={20} class="md:h-6 md:w-6" />
				</button>
			{/if}

			{#if lightboxIndex < product.images.length - 1}
				<button
					type="button"
					class="absolute top-1/2 right-2 z-20 flex -translate-y-1/2 touch-manipulation items-center justify-center rounded-full border border-white/40 bg-black/60 p-2 text-white hover:bg-black/80 active:scale-90 md:right-4 md:p-3"
					onclick={nextImage}
					aria-label="Ảnh tiếp theo"
				>
					<ChevronRight size={20} class="md:h-6 md:w-6" />
				</button>
			{/if}

			<!-- Main image - Pinch-zoom ready -->
			<div class="flex max-h-full max-w-full items-center justify-center">
				<img
					src={product.images[lightboxIndex]}
					alt="{product.name} - Xem toàn cỡ {lightboxIndex + 1}"
					class="max-h-[75vh] max-w-full object-contain md:max-h-[80vh]"
					loading="eager"
				/>
			</div>

			<!-- Thumbnails - Horizontal scroll on mobile -->
			<div
				class="scrollbar-hide mt-3 flex max-w-full gap-1.5 overflow-x-auto px-2 md:mt-4 md:gap-2 md:px-4"
				aria-label="Ảnh thu nhỏ trong lightbox"
			>
				{#each product.images as img, i}
					<button
						type="button"
						class="relative h-12 w-12 shrink-0 touch-manipulation overflow-hidden rounded-lg border-2 transition-all active:scale-90 md:h-16 md:w-16 lg:h-20 lg:w-20 {lightboxIndex ===
						i
							? 'border-white opacity-100'
							: 'border-white/20 opacity-60'}"
						onclick={() => (lightboxIndex = i)}
						aria-label="Xem ảnh phóng to {i + 1}"
					>
						<img
							src={img}
							alt="Thumbnail {i + 1}"
							loading="lazy"
							class="h-full w-full object-cover"
						/>
					</button>
				{/each}
			</div>

			<!-- Image Counter -->
			<div
				class="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm md:bottom-4 md:px-4 md:py-2 md:text-sm"
				aria-live="polite"
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
	}

	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}

	/* Safe area for mobile notches */
	.safe-bottom {
		padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
	}

	/* Smooth snap scrolling for thumbnails */
	@supports (scroll-snap-type: x mandatory) {
		.snap-x {
			scroll-snap-type: x mandatory;
		}
		.snap-start {
			scroll-snap-align: start;
		}
	}

	/* Improve touch targets on mobile */
	@media (max-width: 768px) {
		button,
		a,
		input {
			min-height: 44px;
		}
	}

	/* Remove number input spinners on mobile */
	input[type='number']::-webkit-inner-spin-button,
	input[type='number']::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	input[type='number'] {
		-moz-appearance: textfield;
	}
</style>
