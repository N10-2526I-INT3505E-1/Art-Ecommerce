<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import Autoplay from 'embla-carousel-autoplay';
	import { animate, stagger } from 'motion';
	import LongBg from '$lib/assets/images/Long.webp';
	import LanBg from '$lib/assets/images/Lan.webp';
	import QuyBg from '$lib/assets/images/Quy.webp';
	import PhungBg from '$lib/assets/images/Phung.webp';

	import { ArrowLeft, ArrowRight, Search, Grid, List } from 'lucide-svelte';

	const slides = [
		{
			title: 'Long',
			subtitle: 'Biểu tượng cho quyền lực tối cao, tài lộc và công danh',
			cta: 'Tìm hiểu thêm',
			image: LongBg,
		},
		{
			title: 'Lân',
			subtitle: 'Trí tuệ, đức hạnh, trấn trạch và giữ yên gia đạo.',
			cta: 'Tìm hiểu thêm',
			image: LanBg,
		},
		{
			title: 'Quy',
			subtitle: 'Trường thọ, chiêu tài và sức khỏe dồi dào',
			cta: 'Tìm hiểu thêm',
			image: QuyBg,
		},
		{
			title: 'Phụng',
			subtitle: 'Phẩm hạnh cao quý, trường tồn bất diệt',
			cta: 'Tìm hiểu thêm',
			image: PhungBg,
		},
	];

	let emblaApi: any;
	let options = { loop: true, dragFree: false, duration: 30 };
	let plugins = [Autoplay({ delay: 8000, stopOnInteraction: true, stopOnMouseEnter: true })];
	let currentSlide = 0;

	const skeletonProducts = Array.from({ length: 12 }, (_, i) => ({
		id: i,
		category: ['Painting', 'Sculpture', 'Print', 'Photography'][i % 4],
	}));

	let productsObserver: IntersectionObserver | null = null;

	function onInit(event: any) {
		emblaApi = event.detail;
		emblaApi.on('select', () => {
			currentSlide = emblaApi.selectedScrollSnap();
		});
	}

	function scrollPrev() {
		emblaApi?.scrollPrev();
	}

	function scrollNext() {
		emblaApi?.scrollNext();
	}

	onMount(() => {
		const productsSection = document.querySelector('.products-section');

		if (productsSection) {
			productsObserver = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							// Animate all product cards with Motion One
							const cards = productsSection.querySelectorAll<HTMLElement>('.product-card');

							animate(
								cards,
								{
									opacity: [0, 1],
									y: [40, 0],
									scale: [0.96, 1],
								},
								{
									duration: 0.6,
									delay: stagger(0.06),
									easing: [0.22, 1, 0.36, 1],
								},
							);

							// Run once
							productsObserver?.disconnect();
						}
					});
				},
				{
					threshold: 0.25,
				},
			);

			productsObserver.observe(productsSection);
		}
	});

	onDestroy(() => {
		productsObserver?.disconnect();
	});
</script>

<svelte:head>
	<title>Trang chủ Novus</title>
</svelte:head>

<!-- HERO SECTION -->
<section class="snap-section hero-section">
	<!-- Embla Carousel -->
	<div
		class="embla absolute inset-0 z-20"
		use:emblaCarouselSvelte={{ options, plugins }}
		onemblaInit={onInit}
	>
		<div class="embla__container flex h-full">
			{#each slides as slide, i}
				<div class="embla__slide h-full flex-[0_0_100%]">
					<!-- per-slide background -->
					<div
						class="absolute inset-0 z-0 transition-opacity duration-700 {i === currentSlide
							? 'opacity-100'
							: 'opacity-30'}"
					>
						<img
							src={slide.image}
							alt=""
							aria-hidden="true"
							class="h-full w-full object-cover"
							loading="eager"
						/>
						<div
							class="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
							aria-hidden="true"
						></div>
					</div>
					<div
						class="relative z-20 flex h-full flex-col items-center justify-center px-8 text-center text-white"
					>
						<!-- <span class="mb-6 text-sm tracking-[0.4em] uppercase opacity-70">
								{String(i + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
							</span> -->
						<h1
							class="font-comorant mb-8 text-5xl font-black drop-shadow-2xl md:text-7xl lg:text-8xl xl:text-9xl"
						>
							{slide.title}
						</h1>

						{#if slide.subtitle}
							<p class="font-raleway mb-12 text-xl font-medium opacity-90 md:text-2xl lg:text-3xl">
								{slide.subtitle}
							</p>
						{/if}
						<div class="flex-row">
							{#if slide.cta}
								<div class="flex gap-4">
									<button class="btn btn-lg btn-primary rounded-lg px-10 text-white">
										{slide.cta}
									</button>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Navigation -->
	<nav class="pointer-events-none absolute inset-0 z-50 flex items-center justify-between px-8">
		<button
			class="btn btn-circle btn-lg btn-ghost pointer-events-auto border-2 border-white/30 text-white backdrop-blur hover:bg-white/10"
			onclick={scrollPrev}
			aria-label="Previous"
		>
			<ArrowLeft size={24} />
		</button>
		<button
			class="btn btn-circle btn-lg btn-ghost pointer-events-auto border-2 border-white/30 text-white backdrop-blur hover:bg-white/10"
			onclick={scrollNext}
			aria-label="Next"
		>
			<ArrowRight size={24} />
		</button>
	</nav>

	<!-- Dots -->
	<div class="absolute bottom-12 left-25 z-50 flex -translate-x-1/2 gap-3 opacity-60">
		{#each slides as _, i}
			<button
				class="h-2 rounded-full backdrop-blur transition-all duration-300
                        {i === currentSlide ? 'w-10 bg-white/90' : 'w-2 bg-white/40'}"
				onclick={() => emblaApi?.scrollTo(i)}
				aria-label={`Go to slide ${i + 1}`}
			></button>
		{/each}
	</div>

	<!-- Scroll indicator -->
	<div class="absolute bottom-6 left-1/2 z-50 -translate-x-1/2 animate-bounce text-white/70">
		<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M19 14l-7 7m0 0l-7-7m7 7V3"
			/>
		</svg>
	</div>
</section>

<!-- PRODUCTS SECTION -->
<section class="snap-section products-section bg-gradient-to-br from-white via-slate-50 to-white">
	<div class="container mx-auto max-w-7xl px-4 py-24 sm:px-8 lg:px-12">
		<!-- Header -->
		<div class="mb-16 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
			<div>
				<h2 class="font-montserrat mb-4 text-4xl font-black text-gray-900 md:text-5xl lg:text-6xl">
					Sản phẩm mới
				</h2>
				<p class="max-w-2xl text-lg text-gray-600">
					Được chọn lọc từ những nghệ nhân có tay nghề lâu năm, vật liệu chất lượng cao, số lượng có
					hạn.
				</p>
			</div>
			<div class="flex items-center gap-2">
				<button class="btn btn-ghost btn-sm"><Grid size={20} /></button>
				<button class="btn btn-ghost btn-sm"><List size={20} /></button>
				<div class="relative">
					<input
						type="search"
						placeholder="Search..."
						class="input input-bordered input-sm w-48 pl-10"
					/>
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
				</div>
			</div>
		</div>

		<!-- Product Grid -->
		<div
			class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-8 xl:grid-cols-5"
		>
			{#each skeletonProducts as product}
				<article
					class="product-card card bg-base-100 rounded-lg shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
				>
					<figure
						class="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50"
					>
						<div class="shimmer absolute inset-0"></div>
						<div class="badge badge-primary badge-sm absolute top-4 left-4 font-semibold">
							{product.category}
						</div>
					</figure>
					<div class="card-body p-5">
						<h3 class="hover:text-primary text-lg font-semibold text-gray-900 transition-colors">
							Tượng rồng phong thuỷ
						</h3>
						<p class="line-clamp-2 text-sm text-gray-500">Đồng nguyên khối</p>
						<div class="mt-2 flex items-center justify-between">
							<span class="text-primary text-xl font-bold">$2,850</span>
							<div class="rating rating-sm">
								{#each Array(5) as _}
									<input type="radio" class="mask mask-star bg-warning" disabled />
								{/each}
							</div>
						</div>
						<button class="btn btn-primary btn-sm mt-3 w-full">Thêm vào giỏ</button>
					</div>
				</article>
			{/each}
		</div>

		<div class="mt-20 text-center">
			<button class="btn btn-outline btn-lg px-12 shadow-lg hover:shadow-xl"> Xem thêm </button>
		</div>
	</div>
</section>

<style>
	.snap-section {
		min-height: calc(100dvh - var(--header-height, 0px));
		scroll-snap-align: start;
		position: relative;
	}

	.hero-section {
		height: calc(75dvh - var(--header-height, 0px));
		min-height: 360px;
		overflow: hidden;
	}

	.products-section {
		overflow-y: auto;
	}

	/* Embla */
	.embla {
		width: 100%;
		height: 100%;
	}

	.embla__container {
		height: 100%;
	}

	.embla__slide {
		height: 100%;
		position: relative;
	}

	/* Initial state for Motion One */
	.product-card {
		opacity: 0;
		transform: translateY(40px) scale(0.96);
	}

	/* Shimmer effect */
	.shimmer {
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}

	@keyframes shimmer {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}

	:global(.platform-firefox) .snap-container {
		scroll-behavior: smooth;
	}

	@media (prefers-reduced-motion: reduce) {
		.product-card {
			opacity: 1 !important;
			transform: none !important;
		}
	}
</style>
