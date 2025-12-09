<script lang="ts">
	import Autoplay from 'embla-carousel-autoplay';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import {
		ArrowLeft,
		ArrowRight,
		ChevronLeft,
		ChevronRight,
		ShoppingCart,
		Star,
	} from 'lucide-svelte';
	import { animate, stagger } from 'motion';
	import { onDestroy, onMount } from 'svelte';

	// Background Images
	import LanBg from '$lib/assets/images/Lan.webp';
	import LongBg from '$lib/assets/images/Long.webp';
	import PhungBg from '$lib/assets/images/Phung.webp';
	import QuyBg from '$lib/assets/images/Quy.webp';

	// Title SVGs
	import LanTitle from '$lib/assets/titles/Lan.svg';
	import LongTitle from '$lib/assets/titles/Long.svg';
	import PhungTitle from '$lib/assets/titles/Phung.svg';
	import QuyTitle from '$lib/assets/titles/Quy.svg';

	// --- MAIN CAROUSEL CONFIG ---
	const slides = [
		{
			titleSvg: LongTitle,
			subtitle: 'Biểu tượng cho quyền lực tối cao, tài lộc và công danh',
			link: '/collection/long',
			image: LongBg,
		},
		{
			titleSvg: LanTitle,
			subtitle: 'Trí tuệ, đức hạnh, trấn trạch và giữ yên gia đạo.',
			link: '/collection/lan',
			image: LanBg,
		},
		{
			titleSvg: QuyTitle,
			subtitle: 'Trường thọ, chiêu tài và sức khỏe dồi dào',
			link: '/collection/quy',
			image: QuyBg,
		},
		{
			titleSvg: PhungTitle,
			subtitle: 'Phẩm hạnh cao quý, trường tồn bất diệt',
			link: '/collection/phung',
			image: PhungBg,
		},
	];

	let mainEmblaApi: any;
	let mainOptions = { loop: true, dragFree: false };
	let mainPlugins = [Autoplay({ delay: 8000, stopOnInteraction: true, stopOnMouseEnter: true })];
	let currentSlide = $state(0);

	function onMainInit(event: any) {
		mainEmblaApi = event.detail;
		mainEmblaApi.on('select', () => {
			currentSlide = mainEmblaApi.selectedScrollSnap();
		});
	}

	// --- SHARED PRODUCT DATA ---
	const bgImages = [LongBg, LanBg, QuyBg, PhungBg];
	const categories = ['Rồng', 'Kỳ Lân', 'Quy', 'Phượng'];
	const titles = [
		'Tượng Rồng Thiên Thanh',
		'Kỳ Lân Bạch Ngọc',
		'Quy Hóa Long Thọ',
		'Phượng Hoàng Lửa',
		'Rồng Vàng Cửu Long',
		'Lân Đá Trấn Trạch',
		'Quy Thần Thủy',
		'Phượng Vũ Hoàng Kim',
		'Rồng Phong Thủy',
		'Kỳ Lân Minh Châu',
		'Quy Trường Thọ',
		'Phượng Hoàng Bất Diệt',
		'Rồng Thăng Long',
		'Lân Chiêu Tài',
		'Quy Thiên Niên',
		'Phượng Hoàng Bất Tử',
	];

	const skeletonProducts = Array.from({ length: 16 }, (_, i) => ({
		id: i,
		title: titles[i],
		category: categories[i % 4],
		price: [
			2850, 1500, 3200, 4100, 2950, 1850, 3450, 3900, 2650, 1750, 3100, 4250, 2750, 1950, 3350,
			4050,
		][i],
		rating: [4.9, 4.8, 5.0, 4.7][i % 4],
		image: bgImages[i % 4],
	}));

	const productOptions = {
		align: 'start',
		loop: true,
		dragFree: false,
		containScroll: 'trimSnaps',
		slidesToScroll: 2,
	};

	// --- PRODUCT CAROUSEL 1 STATE ---
	let productEmblaApi1: any;
	let canScrollPrev1 = $state(false);
	let canScrollNext1 = $state(true);

	function updateProductScrollState1() {
		if (!productEmblaApi1) return;
		canScrollPrev1 = productEmblaApi1.canScrollPrev();
		canScrollNext1 = productEmblaApi1.canScrollNext();
	}

	// --- PRODUCT CAROUSEL 2 STATE ---
	let productEmblaApi2: any;
	let canScrollPrev2 = $state(false);
	let canScrollNext2 = $state(true);

	function updateProductScrollState2() {
		if (!productEmblaApi2) return;
		canScrollPrev2 = productEmblaApi2.canScrollPrev();
		canScrollNext2 = productEmblaApi2.canScrollNext();
	}

	// --- PRODUCT CAROUSEL 3 STATE ---
	let productEmblaApi3: any;
	let canScrollPrev3 = $state(false);
	let canScrollNext3 = $state(true);

	function updateProductScrollState3() {
		if (!productEmblaApi3) return;
		canScrollPrev3 = productEmblaApi3.canScrollPrev();
		canScrollNext3 = productEmblaApi3.canScrollNext();
	}

	// Simple fade-in for all product sections
	let productsObserver: IntersectionObserver | null = null;

	onMount(() => {
		const productSections = document.querySelectorAll('.products-section');

		if (productSections.length) {
			productsObserver = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							const cards = entry.target.querySelectorAll<HTMLElement>('.product-card');
							animate(
								cards,
								{ opacity: [0, 1], y: [30, 0], scale: [0.97, 1] },
								{
									duration: 0.5,
									delay: stagger(0.04),
									easing: [0.22, 1, 0.36, 1],
								},
							);
							productsObserver?.unobserve(entry.target);
						}
					});
				},
				{ threshold: 0.1 },
			);

			productSections.forEach((section) => productsObserver?.observe(section));
		}
	});

	onDestroy(() => {
		productsObserver?.disconnect();
		mainEmblaApi?.destroy();
		productEmblaApi1?.destroy();
		productEmblaApi2?.destroy();
		productEmblaApi3?.destroy();
	});
</script>

<svelte:head>
	<title>Trang chủ Novus</title>
</svelte:head>

<section class="snap-section hero-section relative">
	<div
		class="embla h-full w-full"
		use:emblaCarouselSvelte={{ options: mainOptions, plugins: mainPlugins }}
		onemblaInit={onMainInit}
	>
		<div class="embla__container flex h-full">
			{#each slides as slide, i}
				<a
					href={slide.link}
					class="embla__slide group relative h-full flex-[0_0_100%] cursor-pointer overflow-hidden"
					aria-label={`Xem bộ sưu tập ${slide.subtitle}`}
				>
					<div
						class="absolute inset-0 z-0 h-full w-full transition-transform duration-1000 group-hover:scale-105"
					>
						<enhanced:img
							src={slide.image}
							alt={slide.subtitle}
							class="h-full w-full object-cover transition-opacity duration-700 {i === currentSlide
								? 'opacity-100'
								: 'opacity-40'}"
							loading={i === 0 ? 'eager' : 'lazy'}
						/>
						<div
							class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10"
						></div>
					</div>

					<div
						class="relative z-20 flex h-full flex-col items-center px-6 text-center text-white md:px-8"
					>
						<div class="flex w-full flex-1 flex-col items-center justify-center">
							<div class="mb-6 w-full max-w-[240px] md:mb-8 md:max-w-[380px] lg:max-w-[480px]">
								<img
									src={slide.titleSvg}
									alt="Title"
									class="mx-auto h-auto w-full drop-shadow-2xl"
								/>
							</div>

							{#if slide.subtitle}
								<p
									class="font-raleway flex min-h-[3.5rem] max-w-2xl items-center justify-center text-base
                          font-medium text-white/90 md:min-h-[4rem] md:text-xl lg:text-2xl"
								>
									{slide.subtitle}
								</p>
							{/if}
						</div>

						<div
							class="mb-12 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0
                      group-hover:opacity-100 md:mb-16"
						>
							<span
								class="border-b border-white pb-1 text-xs font-bold tracking-widest uppercase md:text-sm"
							>
								Khám phá ngay
							</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>

	<!-- Navigation Arrows -->
	<div
		class="pointer-events-none absolute inset-0 z-30 flex items-center justify-between px-3 md:px-6"
	>
		<button
			class="btn btn-circle btn-md btn-ghost md:btn-lg pointer-events-auto border border-white/20 text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-white/20"
			onclick={() => mainEmblaApi?.scrollPrev()}
			aria-label="Slide trước"
		>
			<ArrowLeft size={20} class="md:hidden" />
			<ArrowLeft size={24} class="hidden md:block" />
		</button>
		<button
			class="btn btn-circle btn-md btn-ghost md:btn-lg pointer-events-auto border border-white/20 text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-white/20"
			onclick={() => mainEmblaApi?.scrollNext()}
			aria-label="Slide tiếp theo"
		>
			<ArrowRight size={20} class="md:hidden" />
			<ArrowRight size={24} class="hidden md:block" />
		</button>
	</div>

	<!-- Dots -->
	<div class="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 gap-2 md:bottom-12 md:gap-3">
		{#each slides as _, i}
			<button
				class="h-1 rounded-full transition-all duration-300 md:h-1.5 {i === currentSlide
					? 'w-8 bg-white md:w-12'
					: 'w-2 bg-white/40 hover:bg-white/60 md:w-3'}"
				onclick={() => mainEmblaApi?.scrollTo(i)}
				aria-label={`Đi tới slide ${i + 1}`}
			></button>
		{/each}
	</div>
</section>

<div class="snap-section">
	<!-- PRODUCTS CAROUSEL 1 -->
	<section class="products-section products-section-1 flex flex-col justify-center bg-gray-50">
		<div class="container mx-auto w-full max-w-[1600px] px-4 py-10 md:px-6 md:py-12 lg:px-8">
			<div
				class="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between md:gap-6"
			>
				<div>
					<h2 class="font-montserrat text-2xl font-black text-gray-900 md:text-4xl lg:text-5xl">
						Bộ sưu tập
					</h2>
					<p class="mt-1 max-w-xl text-sm text-gray-600 md:mt-2 md:text-base">
						Tuyệt tác phong thủy hội tụ tinh hoa đất trời.
					</p>
				</div>

				<div class="flex gap-2">
					<button
						onclick={() => {
							productEmblaApi1?.scrollPrev();
							updateProductScrollState1();
						}}
						disabled={!canScrollPrev1}
						class="btn btn-circle btn-sm btn-outline md:btn-md border-gray-300 hover:border-black hover:bg-black hover:text-white disabled:opacity-30"
						aria-label="Sản phẩm trước"
					>
						<ChevronLeft size={18} class="md:hidden" />
						<ChevronLeft size={22} class="hidden md:block" />
					</button>
					<button
						onclick={() => {
							productEmblaApi1?.scrollNext();
							updateProductScrollState1();
						}}
						disabled={!canScrollNext1}
						class="btn btn-circle btn-sm btn-outline md:btn-md border-gray-300 hover:border-black hover:bg-black hover:text-white disabled:opacity-30"
						aria-label="Sản phẩm tiếp theo"
					>
						<ChevronRight size={18} class="md:hidden" />
						<ChevronRight size={22} class="hidden md:block" />
					</button>
				</div>
			</div>

			<div
				class="embla overflow-hidden"
				use:emblaCarouselSvelte={{ options: productOptions }}
				onemblaInit={(event) => {
					productEmblaApi1 = event.detail;
					productEmblaApi1.on('select', updateProductScrollState1);
					updateProductScrollState1();
				}}
			>
				<div
					class="embla__container flex touch-pan-y gap-3 py-3 pl-2 md:gap-4 md:py-4 md:pl-4 lg:gap-5"
				>
					{#each skeletonProducts as product}
						<div
							class="product-card min-w-0 flex-[0_0_70%] sm:flex-[0_0_45%] md:flex-[0_0_30%] lg:flex-[0_0_22%] xl:flex-[0_0_18%]"
						>
							<article
								class="group relative h-full overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-lg md:rounded-2xl"
							>
								<figure class="relative aspect-[3/4] overflow-hidden">
									<enhanced:img
										src={product.image}
										alt={product.title}
										class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
										loading="lazy"
									/>
									<div
										class="badge badge-sm badge-neutral md:badge-md absolute top-2 left-2 border-none bg-black/70 text-[10px] text-white backdrop-blur-md md:top-3 md:left-3 md:text-xs"
									>
										{product.category}
									</div>

									<div
										class="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent p-2 transition-transform duration-300 group-hover:translate-y-0 md:p-3"
									>
										<button
											class="btn btn-primary btn-xs md:btn-sm w-full shadow-lg"
											aria-label={`Thêm ${product.title} vào giỏ`}
										>
											<ShoppingCart size={14} class="md:hidden" />
											<ShoppingCart size={16} class="hidden md:block" />
											<span class="text-[10px] md:text-xs">Thêm vào giỏ</span>
										</button>
									</div>
								</figure>

								<div class="p-3 md:p-4">
									<h3
										class="group-hover:text-primary line-clamp-2 text-sm font-bold text-gray-900 transition-colors md:text-base"
									>
										{product.title}
									</h3>
									<div class="mt-2 flex items-center justify-between">
										<span class="text-primary text-base font-semibold md:text-lg"
											>${product.price}</span
										>
										<div class="flex items-center gap-1">
											<Star size={12} class="fill-orange-400 text-orange-400 md:hidden" />
											<Star size={14} class="hidden fill-orange-400 text-orange-400 md:block" />
											<span class="text-[10px] text-gray-600 md:text-xs">{product.rating}</span>
										</div>
									</div>
								</div>
							</article>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- PRODUCTS CAROUSEL 2 -->
	<section class="products-section products-section-2 flex flex-col justify-center bg-white">
		<div class="container mx-auto w-full max-w-[1600px] px-4 py-10 md:px-6 md:py-12 lg:px-8">
			<div
				class="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between md:gap-6"
			>
				<div>
					<h2 class="font-montserrat text-2xl font-black text-gray-900 md:text-4xl lg:text-5xl">
						Mới ra mắt
					</h2>
					<p class="mt-1 max-w-xl text-sm text-gray-600 md:mt-2 md:text-base">
						Những thiết kế phong thủy mới nhất, dẫn đầu xu hướng.
					</p>
				</div>

				<div class="flex gap-2">
					<button
						onclick={() => {
							productEmblaApi2?.scrollPrev();
							updateProductScrollState2();
						}}
						disabled={!canScrollPrev2}
						class="btn btn-circle btn-sm btn-outline md:btn-md border-gray-300 hover:border-black hover:bg-black hover:text-white disabled:opacity-30"
						aria-label="Sản phẩm trước"
					>
						<ChevronLeft size={18} class="md:hidden" />
						<ChevronLeft size={22} class="hidden md:block" />
					</button>
					<button
						onclick={() => {
							productEmblaApi2?.scrollNext();
							updateProductScrollState2();
						}}
						disabled={!canScrollNext2}
						class="btn btn-circle btn-sm btn-outline md:btn-md border-gray-300 hover:border-black hover:bg-black hover:text-white disabled:opacity-30"
						aria-label="Sản phẩm tiếp theo"
					>
						<ChevronRight size={18} class="md:hidden" />
						<ChevronRight size={22} class="hidden md:block" />
					</button>
				</div>
			</div>

			<div
				class="embla overflow-hidden"
				use:emblaCarouselSvelte={{ options: productOptions }}
				onemblaInit={(event) => {
					productEmblaApi2 = event.detail;
					productEmblaApi2.on('select', updateProductScrollState2);
					updateProductScrollState2();
				}}
			>
				<div
					class="embla__container flex touch-pan-y gap-3 py-3 pl-2 md:gap-4 md:py-4 md:pl-4 lg:gap-5"
				>
					{#each skeletonProducts as product}
						<div
							class="product-card min-w-0 flex-[0_0_70%] sm:flex-[0_0_45%] md:flex-[0_0_30%] lg:flex-[0_0_22%] xl:flex-[0_0_18%]"
						>
							<article
								class="group relative h-full overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-lg md:rounded-2xl"
							>
								<figure class="relative aspect-[3/4] overflow-hidden">
									<enhanced:img
										src={product.image}
										alt={product.title}
										class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
										loading="lazy"
									/>
									<div
										class="badge badge-sm badge-neutral md:badge-md absolute top-2 left-2 border-none bg-black/70 text-[10px] text-white backdrop-blur-md md:top-3 md:left-3 md:text-xs"
									>
										{product.category}
									</div>

									<div
										class="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent p-2 transition-transform duration-300 group-hover:translate-y-0 md:p-3"
									>
										<button
											class="btn btn-primary btn-xs md:btn-sm w-full shadow-lg"
											aria-label={`Thêm ${product.title} vào giỏ`}
										>
											<ShoppingCart size={14} class="md:hidden" />
											<ShoppingCart size={16} class="hidden md:block" />
											<span class="text-[10px] md:text-xs">Thêm vào giỏ</span>
										</button>
									</div>
								</figure>

								<div class="p-3 md:p-4">
									<h3
										class="group-hover:text-primary line-clamp-2 text-sm font-bold text-gray-900 transition-colors md:text-base"
									>
										{product.title}
									</h3>
									<div class="mt-2 flex items-center justify-between">
										<span class="text-primary text-base font-semibold md:text-lg"
											>${product.price}</span
										>
										<div class="flex items-center gap-1">
											<Star size={12} class="fill-orange-400 text-orange-400 md:hidden" />
											<Star size={14} class="hidden fill-orange-400 text-orange-400 md:block" />
											<span class="text-[10px] text-gray-600 md:text-xs">{product.rating}</span>
										</div>
									</div>
								</div>
							</article>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- PRODUCTS CAROUSEL 3 -->
	<section class="products-section products-section-3 flex flex-col justify-center bg-gray-50">
		<div class="container mx-auto w-full max-w-[1600px] px-4 py-10 md:px-6 md:py-12 lg:px-8">
			<div
				class="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between md:gap-6"
			>
				<div>
					<h2 class="font-montserrat text-2xl font-black text-gray-900 md:text-4xl lg:text-5xl">
						Bán chạy nhất
					</h2>
					<p class="mt-1 max-w-xl text-sm text-gray-600 md:mt-2 md:text-base">
						Những tác phẩm được khách hàng yêu thích và lựa chọn nhiều nhất.
					</p>
				</div>

				<div class="flex gap-2">
					<button
						onclick={() => {
							productEmblaApi3?.scrollPrev();
							updateProductScrollState3();
						}}
						disabled={!canScrollPrev3}
						class="btn btn-circle btn-sm btn-outline md:btn-md border-gray-300 hover:border-black hover:bg-black hover:text-white disabled:opacity-30"
						aria-label="Sản phẩm trước"
					>
						<ChevronLeft size={18} class="md:hidden" />
						<ChevronLeft size={22} class="hidden md:block" />
					</button>
					<button
						onclick={() => {
							productEmblaApi3?.scrollNext();
							updateProductScrollState3();
						}}
						disabled={!canScrollNext3}
						class="btn btn-circle btn-sm btn-outline md:btn-md border-gray-300 hover:border-black hover:bg-black hover:text-white disabled:opacity-30"
						aria-label="Sản phẩm tiếp theo"
					>
						<ChevronRight size={18} class="md:hidden" />
						<ChevronRight size={22} class="hidden md:block" />
					</button>
				</div>
			</div>

			<div
				class="embla overflow-hidden"
				use:emblaCarouselSvelte={{ options: productOptions }}
				onemblaInit={(event) => {
					productEmblaApi3 = event.detail;
					productEmblaApi3.on('select', updateProductScrollState3);
					updateProductScrollState3();
				}}
			>
				<div
					class="embla__container flex touch-pan-y gap-3 py-3 pl-2 md:gap-4 md:py-4 md:pl-4 lg:gap-5"
				>
					{#each skeletonProducts as product}
						<div
							class="product-card min-w-0 flex-[0_0_70%] sm:flex-[0_0_45%] md:flex-[0_0_30%] lg:flex-[0_0_22%] xl:flex-[0_0_18%]"
						>
							<article
								class="group relative h-full overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-lg md:rounded-2xl"
							>
								<figure class="relative aspect-[3/4] overflow-hidden">
									<enhanced:img
										src={product.image}
										alt={product.title}
										class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
										loading="lazy"
									/>
									<div
										class="badge badge-sm badge-neutral md:badge-md absolute top-2 left-2 border-none bg-black/70 text-[10px] text-white backdrop-blur-md md:top-3 md:left-3 md:text-xs"
									>
										{product.category}
									</div>

									<div
										class="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent p-2 transition-transform duration-300 group-hover:translate-y-0 md:p-3"
									>
										<button
											class="btn btn-primary btn-xs md:btn-sm w-full shadow-lg"
											aria-label={`Thêm ${product.title} vào giỏ`}
										>
											<ShoppingCart size={14} class="md:hidden" />
											<ShoppingCart size={16} class="hidden md:block" />
											<span class="text-[10px] md:text-xs">Thêm vào giỏ</span>
										</button>
									</div>
								</figure>

								<div class="p-3 md:p-4">
									<h3
										class="group-hover:text-primary line-clamp-2 text-sm font-bold text-gray-900 transition-colors md:text-base"
									>
										{product.title}
									</h3>
									<div class="mt-2 flex items-center justify-between">
										<span class="text-primary text-base font-semibold md:text-lg"
											>${product.price}</span
										>
										<div class="flex items-center gap-1">
											<Star size={12} class="fill-orange-400 text-orange-400 md:hidden" />
											<Star size={14} class="hidden fill-orange-400 text-orange-400 md:block" />
											<span class="text-[10px] text-gray-600 md:text-xs">{product.rating}</span>
										</div>
									</div>
								</div>
							</article>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>
</div>

<style>
	.snap-section {
		scroll-snap-align: start;
		width: 100%;
	}

	.hero-section {
		height: 75dvh;
		min-height: 500px;
	}

	.products-section {
		min-height: 50vh;
	}

	.product-card {
		opacity: 0;
	}
</style>
