<script lang="ts">
	import {
		Brain,
		Compass,
		Heart,
		Shield,
		Sparkles,
		Users,
		Eye,
		ArrowRight,
		Check,
		TrendingUp,
		Award,
		Zap,
		ShoppingBag,
	} from 'lucide-svelte';
	import YinyangBg from '$lib/assets/images/Yinyang.webp';
	import { onMount } from 'svelte';

	let isVisible = $state(false);
	let statsVisible = $state(false);

	onMount(() => {
		isVisible = true;

		// Animate stats when scrolled into view
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						statsVisible = true;
					}
				});
			},
			{ threshold: 0.3 },
		);

		const statsSection = document.querySelector('#stats-section');
		if (statsSection) observer.observe(statsSection);

		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>Về chúng tôi - Novus</title>
	<meta
		name="description"
		content="Novus kết hợp tinh hoa phong thủy truyền thống với công nghệ AI tiên tiến"
	/>
</svelte:head>

<div class="bg-base-100 min-h-screen overflow-x-hidden">
	<!-- Hero Section - Enhanced -->
	<div class="relative h-[70vh] min-h-[500px] w-full overflow-hidden md:h-[80vh] md:min-h-[600px]">
		<!-- Parallax Background -->
		<div class="absolute inset-0">
			<img
				src={YinyangBg}
				alt="Novus Vision"
				class="h-full w-full scale-105 object-cover transition-transform duration-[8000ms]"
				style="transform: translateY({isVisible ? '0' : '-5%'})"
			/>
			<div class="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80"></div>

			<!-- Animated overlay pattern -->
			<div class="absolute inset-0 opacity-10">
				<div
					class="absolute inset-0"
					style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"
				></div>
			</div>
		</div>

		<!-- Content -->
		<div
			class="relative container mx-auto flex h-full flex-col items-center justify-center px-4 text-center"
		>
			<div
				class="max-w-4xl space-y-4 md:space-y-6"
				style="opacity: {isVisible ? '1' : '0'}; transform: translateY({isVisible
					? '0'
					: '20px'}); transition: all 1s ease-out"
			>
				<!-- Badge -->
				<div
					class="bg-primary/20 border-primary/30 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm md:px-6 md:py-2.5 md:text-sm"
				>
					<Sparkles size={16} class="animate-pulse" />
					<span>Công nghệ AI tiên phong tại Việt Nam</span>
				</div>

				<h1
					class="font-montserrat text-3xl leading-tight font-black tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
				>
					Khoa học phong thuỷ &<br />
					Nghệ thuật đương đại
				</h1>

				<p
					class="mx-auto max-w-2xl text-base leading-relaxed font-light text-white/90 md:text-lg lg:text-xl"
				>
					Novus kết hợp tinh hoa mệnh lý học truyền thống với công nghệ AI tiên tiến, mang đến giải
					pháp nội thất hài hòa cho không gian sống của bạn.
				</p>

				<!-- CTA Buttons -->
				<div class="flex flex-col justify-center gap-3 pt-4 sm:flex-row md:gap-4 md:pt-6">
					<a
						href="/shop"
						class="btn btn-primary btn-lg shadow-primary/25 hover:shadow-primary/40 gap-2 text-base shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl md:text-lg"
					>
						Khám phá ngay
						<ArrowRight size={20} />
					</a>
					<a
						href="#mission"
						class="btn btn-outline btn-lg hover:text-base-content border-white text-base text-white transition-all hover:bg-white md:text-lg"
					>
						Tìm hiểu thêm
					</a>
				</div>
			</div>
		</div>

		<!-- Scroll indicator -->
		<div class="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce md:bottom-8">
			<div
				class="flex h-10 w-6 items-start justify-center rounded-full border-2 border-white/50 p-2"
			>
				<div class="h-3 w-1 animate-pulse rounded-full bg-white/70"></div>
			</div>
		</div>
	</div>

	<!-- Stats Section - New -->
	<section
		id="stats-section"
		class="from-primary/5 via-secondary/5 to-accent/5 border-base-200 border-y bg-gradient-to-br py-12 md:py-16"
	>
		<div class="container mx-auto max-w-6xl px-4">
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
				{#each [{ value: '5000+', label: 'Khách hàng tin dùng', icon: Users }, { value: '98%', label: 'Độ hài lòng', icon: Heart }, { value: '15000+', label: 'Sản phẩm phong thủy', icon: Sparkles }, { value: '24/7', label: 'Hỗ trợ AI', icon: Zap }] as stat, i}
					<div
						class="bg-base-100/80 border-base-200 hover:border-primary/30 group rounded-2xl border p-4 text-center backdrop-blur-sm transition-all hover:shadow-lg md:p-6"
						style="opacity: {statsVisible ? '1' : '0'}; transform: translateY({statsVisible
							? '0'
							: '20px'}); transition: all 0.6s ease-out {i * 0.1}s"
					>
						<svelte:component
							this={stat.icon}
							size={28}
							class="text-primary mx-auto mb-2 transition-transform group-hover:scale-110 md:mb-3"
						/>
						<div class="text-base-content mb-1 text-2xl font-black md:mb-2 md:text-3xl lg:text-4xl">
							{stat.value}
						</div>
						<div class="text-base-content/60 text-xs font-medium md:text-sm">{stat.label}</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Mission Section - Enhanced -->
	<section id="mission" class="py-16 md:py-24 lg:py-32">
		<div class="container mx-auto max-w-6xl px-4">
			<div class="grid grid-cols-1 items-center gap-8 md:gap-12 lg:grid-cols-2 lg:gap-16">
				<!-- Text Content -->
				<div class="space-y-4 md:space-y-6">
					<div
						class="text-primary inline-flex items-center gap-2 text-sm font-bold tracking-wider uppercase md:text-base"
					>
						<div class="bg-primary h-0.5 w-8 md:w-12"></div>
						<span>Sứ mệnh</span>
					</div>

					<h2
						class="font-montserrat text-3xl leading-tight font-bold text-gray-900 sm:text-4xl md:text-5xl"
					>
						Giải quyết bài toán <br />
						<span class="text-primary relative inline-block">
							"Chọn gì?"
							<svg
								class="absolute -bottom-2 left-0 w-full"
								height="8"
								viewBox="0 0 200 8"
								fill="none"
							>
								<path
									d="M1 5.5C50 1.5 150 1.5 199 5.5"
									stroke="currentColor"
									stroke-width="3"
									stroke-linecap="round"
								/>
							</svg>
						</span>
					</h2>

					<div class="space-y-4 text-base leading-relaxed text-gray-600 md:text-lg">
						<p class="flex items-start gap-3">
							<Check size={24} class="text-primary mt-1 shrink-0" />
							<span>
								Việc lựa chọn vật phẩm phong thủy vừa đẹp, vừa hợp nội thất, lại đúng mệnh gia chủ
								chưa bao giờ là điều dễ dàng.
							</span>
						</p>
						<p class="flex items-start gap-3">
							<Check size={24} class="text-primary mt-1 shrink-0" />
							<span>
								Tra cứu thủ công thì phức tạp, tìm thầy phong thủy thì tốn kém và mất thời gian.
							</span>
						</p>
						<div class="bg-primary/5 border-primary rounded-r-xl border-l-4 p-4 md:p-6">
							<p class="text-base-content font-semibold">
								<strong class="text-primary">Novus ra đời để thay đổi điều đó.</strong>
								Chúng tôi xây dựng một nền tảng nơi công nghệ giúp bạn tìm ra "Mảnh ghép hoàn hảo" cho
								ngôi nhà chỉ trong vài giây, dựa trên hàng ngàn năm tri thức phương Đông.
							</p>
						</div>
					</div>
				</div>

				<!-- Visual Cards -->
				<div class="grid grid-cols-2 gap-3 md:gap-4">
					<div class="space-y-3 md:space-y-4">
						<div
							class="from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40 group rounded-2xl border bg-gradient-to-br p-4 transition-all hover:shadow-xl md:rounded-3xl md:p-6 lg:p-8"
						>
							<div
								class="bg-primary/10 mb-3 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 md:mb-4 md:h-14 md:w-14 lg:h-16 lg:w-16"
							>
								<Compass size={28} class="text-primary md:h-8 md:w-8" />
							</div>
							<h3 class="mb-2 text-base font-bold md:text-lg lg:text-xl">Phương pháp chuẩn</h3>
							<p class="text-xs leading-relaxed text-gray-600 md:text-sm">
								Dựa trên bát tự & huyền không phi tinh
							</p>
						</div>

						<div
							class="from-secondary/10 to-secondary/5 border-secondary/20 hover:border-secondary/40 group rounded-2xl border bg-gradient-to-br p-4 transition-all hover:shadow-xl md:rounded-3xl md:p-6 lg:p-8"
						>
							<div
								class="bg-secondary/10 mb-3 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 md:mb-4 md:h-14 md:w-14 lg:h-16 lg:w-16"
							>
								<TrendingUp size={28} class="text-secondary md:h-8 md:w-8" />
							</div>
							<h3 class="mb-2 text-base font-bold md:text-lg lg:text-xl">Hiệu quả cao</h3>
							<p class="text-xs leading-relaxed text-gray-600 md:text-sm">
								Tư vấn chính xác trong vài giây
							</p>
						</div>
					</div>

					<div class="mt-8 space-y-3 md:mt-12 md:space-y-4">
						<div
							class="from-accent/10 to-accent/5 border-accent/20 hover:border-accent/40 group rounded-2xl border bg-gradient-to-br p-4 transition-all hover:shadow-xl md:rounded-3xl md:p-6 lg:p-8"
						>
							<div
								class="bg-accent/10 mb-3 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 md:mb-4 md:h-14 md:w-14 lg:h-16 lg:w-16"
							>
								<Brain size={28} class="text-accent md:h-8 md:w-8" />
							</div>
							<h3 class="mb-2 text-base font-bold md:text-lg lg:text-xl">AI thông minh</h3>
							<p class="text-xs leading-relaxed text-gray-600 md:text-sm">
								Phân tích hình ảnh & gợi ý tự động
							</p>
						</div>

						<div
							class="group rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 p-4 transition-all hover:border-yellow-500/40 hover:shadow-xl md:rounded-3xl md:p-6 lg:p-8"
						>
							<div
								class="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 transition-transform group-hover:scale-110 md:mb-4 md:h-14 md:w-14 lg:h-16 lg:w-16"
							>
								<Award size={28} class="text-yellow-500 md:h-8 md:w-8" />
							</div>
							<h3 class="mb-2 text-base font-bold md:text-lg lg:text-xl">Tin cậy</h3>
							<p class="text-xs leading-relaxed text-gray-600 md:text-sm">
								Được 5000+ gia chủ lựa chọn
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Technology Section - Enhanced -->
	<section class="from-base-100 to-base-200 bg-gradient-to-b py-16 md:py-24 lg:py-32">
		<div class="container mx-auto max-w-6xl px-4">
			<div class="mb-12 text-center md:mb-16">
				<div
					class="text-primary mb-4 inline-flex items-center gap-2 text-sm font-bold tracking-wider uppercase md:text-base"
				>
					<Sparkles size={20} />
					<span>Công nghệ</span>
				</div>
				<h2
					class="font-montserrat mb-4 text-3xl font-bold text-gray-900 sm:text-4xl md:mb-6 md:text-5xl"
				>
					Công nghệ lõi của Novus
				</h2>
				<p class="mx-auto max-w-2xl text-base text-gray-600 md:text-lg">
					Kết hợp hoàn hảo giữa trí tuệ nhân tạo và tri thức phương Đông
				</p>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6 lg:gap-8">
				{#each [{ icon: Users, color: 'blue', title: 'Phân tích Bát tự', desc: 'Hệ thống tự động tính toán Dụng thần, Hỷ thần từ ngày giờ sinh để xác định ngũ hành cần bổ khuyết.', features: ['Tính Thiên Can Địa Chi', 'Phân tích Ngũ hành', 'Xác định Hỷ thần'] }, { icon: Eye, color: 'purple', title: 'Thị giác máy tính', desc: 'AI (VLM) phân tích không gian nội thất qua ảnh/video để đề xuất vật phẩm hài hòa về thẩm mỹ.', features: ['Nhận diện không gian', 'Phân tích màu sắc', 'Gợi ý hài hòa'] }, { icon: Sparkles, color: 'green', title: 'Cá nhân hóa AI', desc: 'Không có hai lời khuyên giống nhau. Mọi đề xuất đều được tùy chỉnh riêng cho từng gia chủ và ngôi nhà.', features: ['Học sở thích cá nhân', 'Phân tích ngữ cảnh', 'Tối ưu liên tục'] }] as tech, i}
					<div
						class="group bg-base-100 border-base-200 rounded-2xl border p-6 shadow-md transition-all hover:shadow-2xl md:rounded-3xl md:p-8 hover:border-{tech.color}-200 hover:-translate-y-2"
						style="transition-delay: {i * 0.1}s"
					>
						<div
							class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 transition-transform group-hover:scale-110 group-hover:rotate-3 md:mb-6 md:h-16 md:w-16"
						>
							<svelte:component this={tech.icon} size={28} class="text-gray-600 md:h-8 md:w-8" />
						</div>

						<h3 class="mb-3 text-lg font-bold md:text-xl">{tech.title}</h3>
						<p class="mb-4 text-sm leading-relaxed text-gray-600 md:mb-6 md:text-base">
							{tech.desc}
						</p>

						<ul class="space-y-2">
							{#each tech.features as feature}
								<li class="flex items-center gap-2 text-xs text-gray-500 md:text-sm">
									<div class="z-50 size-1 rounded-full bg-blue-900"></div>
									{feature}
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Values Section - Enhanced -->
	<section class="bg-base-100 py-16 md:py-24 lg:py-32">
		<div class="container mx-auto max-w-6xl px-4">
			<div class="mb-12 text-center md:mb-16">
				<div
					class="text-primary mb-4 inline-flex items-center gap-2 text-sm font-bold tracking-wider uppercase md:text-base"
				>
					<Heart size={20} />
					<span>Giá trị</span>
				</div>
				<h2 class="font-montserrat text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl">
					Giá trị cốt lõi
				</h2>
			</div>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 lg:gap-12">
				{#each [{ icon: Shield, title: 'Chính trực & Khoa học', desc: 'Chúng tôi nói KHÔNG với mê tín và chiêu trò hù dọa. Phong thủy tại Novus là sự cân bằng năng lượng dựa trên khoa học.', gradient: 'from-primary/10 to-primary/5' }, { icon: Heart, title: 'Tận tâm với khách hàng', desc: 'Mọi sản phẩm đều được tuyển chọn kỹ càng. Chúng tôi đồng hành cùng bạn từ tư vấn đến khi vật phẩm an vị.', gradient: 'from-secondary/10 to-secondary/5' }, { icon: Brain, title: 'Tiên phong công nghệ', desc: 'Không ngừng đổi mới, ứng dụng những công nghệ tiên tiến để mang lại trải nghiệm tư vấn chính xác và nhanh chóng.', gradient: 'from-accent/10 to-accent/5' }] as value, i}
					<div
						class="group text-center transition-all hover:-translate-y-2"
						style="transition-delay: {i * 0.1}s"
					>
						<div
							class="bg-gradient-to-br {value.gradient} border-base-200 hover:border-primary/30 h-full rounded-2xl border p-6 transition-all hover:shadow-xl md:rounded-3xl md:p-8"
						>
							<div
								class="bg-base-100 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-6 md:mb-6 md:h-20 md:w-20"
							>
								<svelte:component
									this={value.icon}
									size={32}
									class="text-primary md:h-10 md:w-10"
									strokeWidth={1.5}
								/>
							</div>

							<h3 class="mb-3 text-lg font-bold md:mb-4 md:text-xl lg:text-2xl">{value.title}</h3>
							<p class="text-justify text-sm leading-relaxed text-gray-600 md:text-base">
								{value.desc}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- CTA Section - Enhanced -->
	<section class="relative overflow-hidden py-20 md:py-28 lg:py-32">
		<!-- Gradient Background -->
		<div class="from-primary via-primary/95 to-primary/90 absolute inset-0 bg-gradient-to-br"></div>

		<!-- Animated Pattern -->
		<div class="absolute inset-0 opacity-10">
			<div
				class="absolute inset-0"
				style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 60px 60px;"
			></div>
		</div>

		<!-- Floating shapes -->
		<div
			class="absolute top-10 left-10 h-32 w-32 animate-pulse rounded-full bg-white/10 blur-3xl"
		></div>
		<div
			class="absolute right-10 bottom-10 h-40 w-40 animate-pulse rounded-full bg-white/10 blur-3xl"
			style="animation-delay: 1s"
		></div>

		<!-- Content -->
		<div class="relative container mx-auto px-4">
			<div class="mx-auto max-w-4xl space-y-6 text-center text-white md:space-y-8">
				<div
					class="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold backdrop-blur-sm md:px-6 md:py-2.5 md:text-sm"
				>
					<Sparkles size={16} />
					<span>Bắt đầu hành trình của bạn</span>
				</div>

				<h2
					class="font-montserrat text-3xl leading-tight font-bold sm:text-4xl md:text-5xl lg:text-6xl"
				>
					Khám phá không gian<br class="hidden sm:block" />
					tốt nhất của bạn
				</h2>

				<p class="mx-auto text-base leading-relaxed text-white/90 md:text-lg lg:text-xl">
					Hãy để AI của Novus giúp bạn tìm ra vật phẩm phong thủy hoàn hảo ngay hôm nay.
				</p>

				<div class="flex flex-col justify-center gap-3 pt-4 sm:flex-row md:gap-4 md:pt-6">
					<a
						href="/shop"
						class="btn btn-lg text-primary gap-2 border-none bg-white text-base shadow-xl transition-all hover:-translate-y-1 hover:bg-gray-100 hover:shadow-2xl md:text-lg"
					>
						<ShoppingBag size={20} />
						Xem sản phẩm
					</a>
					<a
						href="/register"
						class="btn btn-lg btn-outline hover:text-primary gap-2 border-2 border-white text-base text-white transition-all hover:bg-white md:text-lg"
					>
						<Sparkles size={20} />
						Đăng ký tư vấn miễn phí
					</a>
				</div>

				<!-- Trust indicators -->
				<div
					class="flex flex-wrap items-center justify-center gap-4 pt-8 text-xs text-white/80 md:gap-8 md:pt-12 md:text-sm"
				>
					<div class="flex items-center gap-2">
						<Check size={16} class="text-white" />
						<span>Miễn phí tư vấn</span>
					</div>
					<div class="flex items-center gap-2">
						<Check size={16} class="text-white" />
						<span>Kết quả trong 30 giây</span>
					</div>
					<div class="flex items-center gap-2">
						<Check size={16} class="text-white" />
						<span>5000+ khách hàng tin dùng</span>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>

<style>
	/* Smooth animations */
	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Hide scrollbar for horizontal scroll */
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
</style>
