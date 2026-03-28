<script lang="ts">
	import { Upload, Sparkles, Loader2, User } from 'lucide-svelte';
	import ImageUploader from '$lib/components/ImageUploader.svelte';
	import AnalysisResult from '$lib/components/AnalysisResult.svelte';

	const { data } = $props();

	let imageFile: File | null = $state(null);
	let imagePreview: string | null = $state(null);
	let isAnalyzing = $state(false);
	let analysisData: { analysis: string; products: any[] } | null = $state(null);
	let error: string | null = $state(null);

	// Bazi profile from server
	const baziProfile = $derived(data.baziProfile);
	const user = $derived(data.user);

	// Extract Dụng Thần and Kỵ Thần for AI recommendations
	const dungThan = $derived(baziProfile?.limit_score?.dungThan ?? []);
	const hyThan = $derived(baziProfile?.limit_score?.hyThan ?? []);
	const kyThan = $derived(baziProfile?.limit_score?.kyThan ?? []);
	const hungThan = $derived(baziProfile?.limit_score?.hungThan ?? []);

	function handleImageSelected(file: File, preview: string) {
		console.log('🖼️ Image selected:', file.name, preview.substring(0, 50));
		imageFile = file;
		imagePreview = preview;
		analysisData = null;
		error = null;
	}

	async function analyzeImage() {
		if (!imageFile) return;

		isAnalyzing = true;
		error = null;

		try {
			const formData = new FormData();
			formData.append('file', imageFile);

			// Include Feng Shui profile if available (Dụng Thần / Kỵ Thần)
			if (baziProfile && baziProfile.limit_score) {
				const fengShuiProfile = {
					dung_than: dungThan, // Favorable elements (Dụng Thần)
					hy_than: hyThan, // Helpful elements (Hỷ Thần)
					ky_than: kyThan, // Unfavorable elements (Kỵ Thần)
					hung_than: hungThan, // Harmful elements (Hung Thần)
					day_master_element: baziProfile.day_master_element,
					day_master_status: baziProfile.day_master_status, // Vượng/Nhược
				};
				formData.append('feng_shui_profile', JSON.stringify(fengShuiProfile));
				console.log('📊 Including Feng Shui profile:', fengShuiProfile);
			}

			console.log('🚀 AI analysis (demo mode)...');

			// Demo stub: simulate AI analysis with canned response
			await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate processing delay

			analysisData = {
				analysis: `## 🏠 Phân Tích Demo
	
	Đây là bản demo của tính năng tư vấn AI.
	
	**Không gian phòng:** Phòng có thiết kế hiện đại, phù hợp trang trí tranh nghệ thuật.
	
	**Gợi ý phong thủy:**
	${
		baziProfile?.limit_score
			? `- Dụng Thần của bạn: **${dungThan.join(', ')}** → Nên chọn tranh có tông màu phù hợp.
	- Kỵ Thần: **${[...kyThan, ...hungThan].join(', ') || 'Không có'}** → Tránh các yếu tố này.`
			: '- Đăng nhập và tạo hồ sơ Bát Tự để nhận tư vấn cá nhân hóa.'
	}
	
	**Lưu ý:** Tính năng AI đầy đủ chỉ có trong phiên bản production với Ollama + Qdrant.`,
				products: [],
			};
		} catch (err) {
			console.error('❌ Analysis error:', err);
			error = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi kết nối AI service';
		} finally {
			isAnalyzing = false;
		}
	}

	function reset() {
		imageFile = null;
		imagePreview = null;
		analysisData = null;
		error = null;
	}
</script>

<svelte:head>
	<title>Tư Vấn AI - Novice</title>
</svelte:head>

<div class="bg-base-200 min-h-screen py-8">
	<div class="container mx-auto max-w-6xl px-4">
		<!-- Header -->
		<div class="mb-8 text-center">
			<h1 class="mb-2 flex items-center justify-center gap-2 text-4xl font-bold">
				<Sparkles class="text-primary h-8 w-8" />
				Tư Vấn AI
			</h1>
			<p class="text-base-content/70">
				Upload ảnh căn phòng của bạn để nhận gợi ý tranh và đồ trang trí phù hợp
			</p>

			<!-- Feng Shui Profile Status -->
			{#if baziProfile && baziProfile.limit_score}
				<div class="alert alert-success mx-auto mt-4 max-w-lg">
					<User class="h-5 w-5" />
					<div class="text-left">
						<div class="font-semibold">Đã kết nối hồ sơ Phong Thủy</div>
						<div class="text-sm opacity-80">
							<span class="font-medium">Dụng Thần:</span>
							{dungThan.join(', ') || 'Chưa xác định'} •
							<span class="font-medium">Kỵ Thần:</span>
							{[...kyThan, ...hungThan].join(', ') || 'Không có'}
						</div>
					</div>
				</div>
			{:else if user}
				<div class="alert alert-warning mx-auto mt-4 max-w-lg">
					<User class="h-5 w-5" />
					<div class="text-left">
						<div class="font-semibold">Chưa có hồ sơ Bát Tự</div>
						<a href="/bazi" class="text-sm underline"
							>Tạo hồ sơ để AI tư vấn theo Dụng Thần của bạn →</a
						>
					</div>
				</div>
			{:else}
				<div class="alert mx-auto mt-4 max-w-lg">
					<User class="h-5 w-5" />
					<div class="text-left">
						<div class="font-semibold">Đăng nhập để cá nhân hóa</div>
						<a href="/login" class="text-sm underline"
							>Đăng nhập và tạo hồ sơ Bát Tự để nhận tư vấn theo mệnh →</a
						>
					</div>
				</div>
			{/if}
		</div>

		<!-- Main Content -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Left: Image Upload -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title">
						<Upload class="h-5 w-5" />
						Upload Ảnh Phòng
					</h2>

					<ImageUploader onImageSelected={handleImageSelected} />

					{#if imagePreview}
						<div class="mt-4">
							<img src={imagePreview} alt="Preview" class="w-full rounded-lg" />
							<div class="mt-4 flex gap-2">
								<button
									class="btn btn-primary flex-1"
									onclick={analyzeImage}
									disabled={isAnalyzing}
								>
									{#if isAnalyzing}
										<Loader2 class="h-4 w-4 animate-spin" />
										Đang phân tích...
									{:else}
										<Sparkles class="h-4 w-4" />
										Phân Tích Ngay
									{/if}
								</button>
								<button class="btn btn-ghost" onclick={reset}>Chọn Ảnh Khác</button>
							</div>
						</div>
					{/if}

					{#if error}
						<div class="alert alert-error mt-4">
							<span>{error}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Right: Analysis Result -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title">Kết Quả Phân Tích</h2>

					{#if !analysisData && !isAnalyzing}
						<div class="text-base-content/50 flex h-64 flex-col items-center justify-center">
							<Sparkles class="mb-4 h-16 w-16" />
							<p>Upload ảnh và nhấn "Phân Tích" để nhận gợi ý từ AI</p>
						</div>
					{/if}

					{#if isAnalyzing}
						<div class="flex h-64 flex-col items-center justify-center">
							<Loader2 class="text-primary mb-4 h-12 w-12 animate-spin" />
							<p class="text-base-content/70">AI đang phân tích ảnh của bạn...</p>
						</div>
					{/if}

					{#if analysisData}
						<AnalysisResult data={analysisData} />
					{/if}
				</div>
			</div>
		</div>

		<!-- How It Works -->
		<div class="card bg-base-100 mt-6 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">Cách Hoạt Động</h2>
				<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
					<div class="flex flex-col items-center text-center">
						<div class="bg-primary/10 mb-2 flex h-12 w-12 items-center justify-center rounded-full">
							<span class="text-primary text-2xl font-bold">1</span>
						</div>
						<h3 class="font-semibold">Upload Ảnh</h3>
						<p class="text-base-content/70 text-sm">Chọn ảnh căn phòng cần tư vấn</p>
					</div>
					<div class="flex flex-col items-center text-center">
						<div class="bg-primary/10 mb-2 flex h-12 w-12 items-center justify-center rounded-full">
							<span class="text-primary text-2xl font-bold">2</span>
						</div>
						<h3 class="font-semibold">AI Phân Tích</h3>
						<p class="text-base-content/70 text-sm">
							Hệ thống AI phân tích phong cách và không gian
						</p>
					</div>
					<div class="flex flex-col items-center text-center">
						<div class="bg-primary/10 mb-2 flex h-12 w-12 items-center justify-center rounded-full">
							<span class="text-primary text-2xl font-bold">3</span>
						</div>
						<h3 class="font-semibold">Nhận Gợi Ý</h3>
						<p class="text-base-content/70 text-sm">Xem gợi ý tranh và đồ trang trí phù hợp</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
