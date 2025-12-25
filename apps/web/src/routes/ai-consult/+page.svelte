<script lang="ts">
	import { Upload, Sparkles, Loader2 } from 'lucide-svelte';
	import ImageUploader from '$lib/components/ImageUploader.svelte';
	import AnalysisResult from '$lib/components/AnalysisResult.svelte';

	let imageFile: File | null = $state(null);
	let imagePreview: string | null = $state(null);
	let isAnalyzing = $state(false);
	let analysisData: { analysis: string; products: any[] } | null = $state(null);
	let error: string | null = $state(null);

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

			console.log('🚀 Sending image to AI service...');

			const response = await fetch('https://api.novus.io.vn/analyze', {
				method: 'POST',
				body: formData,
			});

			console.log('📡 Response status:', response.status);

			if (!response.ok) {
				const errorText = await response.text();
				console.error('❌ Error response:', errorText);
				throw new Error(`Lỗi ${response.status}: ${errorText}`);
			}

			const data = await response.json();
			console.log('✅ Received data:', data);

			analysisData = data;
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
	<title>Tư Vấn AI - L'Artelier</title>
</svelte:head>

<div class="bg-base-200 min-h-screen py-8">
	<div class="container mx-auto max-w-6xl px-4">
		<!-- Header -->
		<div class="mb-8 text-center">
			<h1 class="mb-2 flex items-center justify-center gap-2 text-4xl font-bold">
				<Sparkles class="text-primary h-8 w-8" />
				Tư Vấn AI Phong Thủy
			</h1>
			<p class="text-base-content/70">
				Upload ảnh căn phòng của bạn để nhận gợi ý tranh và đồ trang trí phù hợp
			</p>
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
