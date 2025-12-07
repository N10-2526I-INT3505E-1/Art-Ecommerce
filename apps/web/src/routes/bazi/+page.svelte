<!-- src/routes/bazi/+page.svelte -->
<script lang="ts">
	import {
		Calendar,
		Heart,
		Info,
		Save,
		Scale,
		Shield,
		ShieldX,
		Sparkles,
		User,
		VenetianMask,
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { toastStore } from '$lib/toastStore';

	let { data, form } = $props();

	// --- STATE MANAGEMENT ---
	let loading = $state(false);
	let showHelp = $state(false);
	let baziProfile = $state<App.BaziProfile | null>(data.baziProfile);

	// Constants for display
	const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
	const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

	const ELEMENT_DETAILS = {
		Mộc: { name: 'Mộc', color: 'bg-green-700', text: 'text-green-700' },
		Hỏa: { name: 'Hỏa', color: 'bg-red-600', text: 'text-red-600' },
		Thổ: { name: 'Thổ', color: 'bg-yellow-700', text: 'text-yellow-700' },
		Kim: { name: 'Kim', color: 'bg-gray-500', text: 'text-gray-500' },
		Thủy: { name: 'Thủy', color: 'bg-blue-700', text: 'text-blue-700' },
	} as const;

	const TEN_GODS_DETAILS = {
		TyKiep: { name: 'Tỷ Kiếp', desc: 'Bạn bè, anh em, cái tôi' },
		KieuAn: { name: 'Kiêu Ấn', desc: 'Học hành, danh tiếng, mẹ' },
		ThucThuong: { name: 'Thực Thương', desc: 'Sáng tạo, con cái, lời nói' },
		TaiTinh: { name: 'Tài Tinh', desc: 'Tiền bạc, cha, vợ' },
		QuanSat: { name: 'Quan Sát', desc: 'Quyền lực, công việc, chồng' },
	} as const;

	// --- FORM STATE ---
	let birth_date = $state('');
	let birth_time = $state('');
	let gender = $state('');
	let profile_name = $state(`${data.user.first_name} ${data.user.last_name}`);

	// --- DERIVED STATE ---
	let formattedBirthDate = $derived(
		baziProfile
			? `${baziProfile.birth_day}/${baziProfile.birth_month}/${baziProfile.birth_year} - ${String(baziProfile.birth_hour).padStart(2, '0')}:${String(baziProfile.birth_minute ?? 0).padStart(2, '0')}`
			: '',
	);

	let dayMasterDisplay = $derived(
		baziProfile ? `${CAN[baziProfile.day_stem]} ${CHI[baziProfile.day_branch]}` : '',
	);

	let maxElementScore = $derived(
		baziProfile?.element_scores
			? Math.max(...Object.values(baziProfile.element_scores as Record<string, number>))
			: 0,
	);

	let isDayMasterStrong = $derived(
		baziProfile?.day_master_status?.includes('Vượng') ||
			baziProfile?.day_master_status?.includes('Cường'),
	);

	// --- EFFECTS ---
	$effect(() => {
		if (baziProfile) {
			birth_date = `${baziProfile.birth_year}-${String(baziProfile.birth_month).padStart(2, '0')}-${String(baziProfile.birth_day).padStart(2, '0')}`;
			birth_time = `${String(baziProfile.birth_hour).padStart(2, '0')}:${String(baziProfile.birth_minute ?? 0).padStart(2, '0')}`;
			gender = baziProfile.gender || '';
			profile_name = baziProfile.profile_name || `${data.user.first_name} ${data.user.last_name}`;
		}
	});

	$effect(() => {
		if (form?.success) {
			baziProfile = form.baziProfile;
			toastStore.trigger({
				message: 'Lưu lá số Bát Tự thành công!',
				background: 'variant-filled-success',
			});
		} else if (form?.message) {
			toastStore.trigger({
				message: form.message,
				background: 'variant-filled-error',
			});
		}
	});
</script>

{#snippet pillarCard(
	title: string,
	stem: number,
	branch: number,
	subtitle: string,
	isHighlighted = false,
)}
	<div
		class="rounded-lg p-3 text-center backdrop-blur-sm transition-all
        {isHighlighted
			? 'bg-accent/30 border-accent hover:shadow-accent/50 order-first border-2 shadow-lg md:order-none'
			: 'border border-white/20 bg-white/10 hover:bg-white/15'}
        sm:rounded-xl sm:p-4 md:p-5"
	>
		<p
			class="mb-1.5 text-[10px] font-semibold tracking-wider uppercase sm:mb-2 sm:text-xs"
			class:opacity-80={!isHighlighted}
			class:opacity-90={isHighlighted}
		>
			{title}
			{isHighlighted ? '⭐' : ''}
		</p>
		<p
			class="font-heading text-xl leading-tight font-bold sm:text-2xl md:text-3xl"
			class:text-accent-content={isHighlighted}
		>
			{CAN[stem]}<br />{CHI[branch]}
		</p>
		<p
			class="mt-1.5 text-[9px] sm:mt-2 sm:text-[10px] md:text-xs"
			class:opacity-70={!isHighlighted}
			class:opacity-90={isHighlighted}
			class:font-semibold={isHighlighted}
		>
			{subtitle}
		</p>
	</div>
{/snippet}

{#snippet elementBar(elementName: keyof typeof ELEMENT_DETAILS, score: number)}
	{@const detail = ELEMENT_DETAILS[elementName]}
	{@const widthPercent = maxElementScore > 0 ? (score / maxElementScore) * 100 : 0}
	<div class="flex items-center gap-2 sm:gap-3">
		<span class="w-10 shrink-0 text-xs font-medium sm:w-12 sm:text-sm {detail.text}"
			>{detail.name}</span
		>
		<div class="bg-base-200 w-full rounded-full">
			<div
				class="rounded-full {detail.color} p-0.5 text-center text-[9px] font-medium text-white transition-all duration-500 sm:p-1 sm:text-[10px]"
				style="width: {widthPercent}%; min-width: {score > 0 ? '1.75rem' : '0'}"
			>
				{score.toFixed(1)}
			</div>
		</div>
	</div>
{/snippet}

<svelte:head>
	<title>Lá Số Bát Tự - Art Ecommerce</title>
</svelte:head>

<div class="from-base-200 to-base-100 min-h-screen bg-gradient-to-b">
	<div class="w-full px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-10 lg:px-12">
		<div class="mx-auto max-w-4xl space-y-4 sm:space-y-6 md:space-y-8">
			<!-- Header -->
			<header class="text-center">
				<div class="mb-2 inline-flex items-center gap-2">
					<Sparkles class="text-primary h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
					<h1 class="font-heading text-base-content text-2xl font-bold sm:text-3xl md:text-4xl">
						Lá Số Bát Tự Của Bạn
					</h1>
				</div>
				<p class="text-base-content/70 mx-auto mt-2 max-w-2xl px-2 text-xs sm:text-sm md:text-base">
					Nhập thông tin ngày giờ sinh để khám phá Tứ Trụ và Nhật Chủ trong hệ thống Bát Tự.
				</p>
			</header>

			<!-- Bazi Chart Display -->
			{#if baziProfile}
				<div
					class="card border-primary/20 from-primary/90 to-secondary/90 text-primary-content border bg-gradient-to-br shadow-xl"
				>
					<div class="card-body p-4 sm:p-5 md:p-8">
						<!-- Profile Header -->
						<div class="mb-4 sm:mb-6">
							<h2 class="mb-1 text-xl font-bold sm:text-2xl md:text-3xl">
								{baziProfile.profile_name}
							</h2>
							<p
								class="text-primary-content/80 flex items-center gap-2 text-xs sm:text-sm md:text-base"
							>
								<Calendar class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
								{formattedBirthDate}
							</p>
							<p class="text-primary-content/90 mt-2 text-xs font-medium sm:text-sm">
								Nhật Chủ: <span class="text-sm font-bold sm:text-base md:text-lg">
									{dayMasterDisplay}
								</span>
							</p>
						</div>

						<!-- Four Pillars Grid -->
						<div class="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:gap-4">
							{@render pillarCard(
								'Trụ Giờ',
								baziProfile.hour_stem,
								baziProfile.hour_branch,
								'Tự thân',
							)}
							{@render pillarCard(
								'Trụ Ngày',
								baziProfile.day_stem,
								baziProfile.day_branch,
								'Nhật Chủ',
								true,
							)}
							{@render pillarCard(
								'Trụ Tháng',
								baziProfile.month_stem,
								baziProfile.month_branch,
								'Gia đạo',
							)}
							{@render pillarCard(
								'Trụ Năm',
								baziProfile.year_stem,
								baziProfile.year_branch,
								'Tổ tiên',
							)}
						</div>

						<!-- Quick Guide Toggle -->
						<button
							type="button"
							onclick={() => (showHelp = !showHelp)}
							class="btn btn-ghost btn-sm text-primary-content/80 hover:text-primary-content mt-3 gap-1.5 self-start text-xs sm:mt-4 sm:gap-2 sm:text-sm"
						>
							<Info class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
							{showHelp ? 'Ẩn' : 'Xem'} giải thích nhanh
						</button>

						{#if showHelp}
							<div
								class="text-primary-content/90 mt-3 space-y-1.5 rounded-lg bg-black/20 p-3 text-xs leading-relaxed sm:space-y-2 sm:p-4 sm:text-sm"
							>
								<p><strong>• Trụ Năm:</strong> Đại diện cho tổ tiên, môi trường sớm (0-16 tuổi)</p>
								<p><strong>• Trụ Tháng:</strong> Gia đạo, cha mẹ, sự nghiệp (17-32 tuổi)</p>
								<p>
									<strong>• Trụ Ngày (Nhật Chủ):</strong> Bản thân, vợ/chồng, cốt lõi tính cách
								</p>
								<p>
									<strong>• Trụ Giờ:</strong> Con cái, tuổi già, kết quả cuộc đời (sau 48 tuổi)
								</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- ANALYSIS PANEL -->
				<div class="card border-base-200 bg-base-100 border shadow-md">
					<div class="card-body gap-4 p-4 sm:gap-6 sm:p-5 md:p-8">
						<div>
							<h3
								class="font-heading text-base-content flex items-center gap-2 text-lg font-semibold sm:text-xl md:text-2xl"
							>
								<Scale class="h-4 w-4 sm:h-5 sm:w-5" />
								Luận Giải Sơ Bộ
							</h3>
							<p class="text-base-content/60 mt-1 text-xs sm:text-sm">
								Phân tích cường nhược của Nhật Chủ và các yếu tố ngũ hành.
							</p>
						</div>

						<!-- Status & Gods -->
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
							<!-- Day Master Status & Strength -->
							<div class="bg-base-200 flex flex-col justify-between rounded-lg p-3 sm:p-4">
								<div>
									<div
										class="text-base-content/60 text-[10px] font-semibold tracking-wide uppercase sm:text-xs"
									>
										Trạng thái Nhật Chủ
									</div>
									<div
										class="mt-1 text-base font-bold sm:text-lg {isDayMasterStrong
											? 'text-success'
											: 'text-warning'}"
									>
										{baziProfile.day_master_status || 'Chưa xác định'}
									</div>
									{#if baziProfile.structure_name}
										<div class="text-base-content/70 mt-1 text-[10px] sm:text-xs">
											{baziProfile.structure_name}
											{baziProfile.structure_type ? `(${baziProfile.structure_type})` : ''}
										</div>
									{/if}
								</div>

								<!-- Power Balance Bar -->
								{#if baziProfile.party_score != null && baziProfile.enemy_score != null}
									<div class="mt-3 sm:mt-4">
										<div
											class="text-base-content/60 mb-1 flex justify-between text-[9px] font-bold uppercase sm:text-[10px]"
										>
											<span>Phe Ta ({(baziProfile.percentage_self ?? 0).toFixed(1)}%)</span>
											<span
												>Phe Địch ({(100 - (baziProfile.percentage_self ?? 0)).toFixed(1)}%)</span
											>
										</div>
										<div class="bg-base-300 flex h-2 w-full overflow-hidden rounded-full">
											<div
												class="bg-success transition-all duration-500"
												style="width: {baziProfile.percentage_self}%"
											></div>
											<div
												class="bg-error transition-all duration-500"
												style="width: {100 - (baziProfile.percentage_self ?? 0)}%"
											></div>
										</div>
										<div class="mt-1 flex justify-between text-[9px] opacity-70 sm:text-[10px]">
											<span>{baziProfile.party_score.toFixed(1)} điểm</span>
											<span>{baziProfile.enemy_score.toFixed(1)} điểm</span>
										</div>
									</div>
								{/if}
							</div>

							<!-- Favorable Gods Summary -->
							<div class="bg-base-200 rounded-lg p-3 sm:p-4">
								<div
									class="text-base-content/60 text-[10px] font-semibold tracking-wide uppercase sm:text-xs"
								>
									Tổng Quan Ngũ Hành
								</div>
								<div class="mt-2 flex flex-wrap gap-1.5 text-xs sm:gap-2">
									{#if baziProfile.favorable_elements?.dung_than?.length}
										<span
											class="badge badge-success gap-1 p-2 font-bold text-white sm:gap-1.5 sm:p-3"
										>
											<Shield class="h-3 w-3" />
											Dụng: {baziProfile.favorable_elements.dung_than.join(', ')}
										</span>
									{/if}
									{#if baziProfile.favorable_elements?.hy_than?.length}
										<span class="badge badge-info gap-1 p-2 font-bold text-white sm:gap-1.5 sm:p-3">
											<Heart class="h-3 w-3" />
											Hỷ: {baziProfile.favorable_elements.hy_than.join(', ')}
										</span>
									{/if}
									{#if baziProfile.favorable_elements?.ky_than?.length}
										<span
											class="badge badge-error gap-1 p-2 font-bold text-white sm:gap-1.5 sm:p-3"
										>
											<ShieldX class="h-3 w-3" />
											Kỵ: {baziProfile.favorable_elements.ky_than.join(', ')}
										</span>
									{/if}
								</div>
							</div>
						</div>

						<!-- Element Scores & God Scores -->
						<div class="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
							{#if baziProfile.element_scores}
								<div class="space-y-2 sm:space-y-3">
									<h4
										class="text-base-content/60 text-xs font-semibold tracking-wide uppercase sm:text-sm"
									>
										Ngũ Hành (Năng Lượng Gốc)
									</h4>
									<div class="space-y-1.5 sm:space-y-2">
										{#each Object.keys(ELEMENT_DETAILS) as elementKey}
											{@const score = (baziProfile.element_scores as Record)[elementKey] || 0}
											{@render elementBar(elementKey as keyof typeof ELEMENT_DETAILS, score)}
										{/each}
									</div>
								</div>
							{/if}

							{#if baziProfile.god_scores}
								<div class="space-y-2 sm:space-y-3">
									<h4
										class="text-base-content/60 text-xs font-semibold tracking-wide uppercase sm:text-sm"
									>
										Thập Thần (Năng Lượng Xã Hội)
									</h4>
									<div class="space-y-1.5 sm:space-y-2">
										{#each Object.entries(baziProfile.god_scores) as [godKey, score]}
											{@const detail = TEN_GODS_DETAILS[godKey as keyof typeof TEN_GODS_DETAILS]}
											{#if detail}
												<div class="flex items-center justify-between gap-2 text-xs sm:text-sm">
													<div class="flex min-w-0 flex-col">
														<span class="truncate font-medium">{detail.name}</span>
														<span class="text-[9px] opacity-70 sm:text-[10px]">{detail.desc}</span>
													</div>
													<div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
														<progress
															class="progress progress-primary w-16 sm:w-24"
															value={score}
															max={maxElementScore}
														></progress>
														<span class="w-6 text-right font-mono text-[10px] sm:w-8 sm:text-xs"
															>{score.toFixed(0)}</span
														>
													</div>
												</div>
											{/if}
										{/each}
									</div>
								</div>
							{/if}
						</div>

						<!-- Interactions -->
						{#if baziProfile.interactions && (baziProfile.interactions.tamHoi || baziProfile.interactions.sanHe || baziProfile.interactions.lucXung?.length)}
							<div class="bg-base-200/50 rounded-lg p-3 sm:p-4">
								<h4
									class="text-base-content/60 mb-2 text-xs font-semibold tracking-wide uppercase sm:text-sm"
								>
									Cục Diện Địa Chi
								</h4>
								<div class="flex flex-wrap gap-1.5 text-xs sm:gap-2 sm:text-sm">
									{#if baziProfile.interactions.tamHoi}
										<span
											class="badge badge-primary badge-outline gap-1 p-2 font-medium sm:gap-1.5 sm:p-3"
										>
											<Sparkles class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
											Tam Hội {baziProfile.interactions.tamHoi}
										</span>
									{/if}
									{#if baziProfile.interactions.sanHe}
										<span
											class="badge badge-secondary badge-outline gap-1 p-2 font-medium sm:gap-1.5 sm:p-3"
										>
											<Sparkles class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
											Tam Hợp {baziProfile.interactions.sanHe}
										</span>
									{/if}
									{#if baziProfile.interactions.lucXung?.length}
										<span
											class="badge badge-error badge-outline gap-1 p-2 font-medium sm:gap-1.5 sm:p-3"
										>
											<ShieldX class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
											Có Lục Xung
										</span>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Shen Sha (Thần Sát) -->
						{#if baziProfile.shen_sha && baziProfile.shen_sha.length > 0}
							<div>
								<h4
									class="text-base-content/60 mb-2 text-xs font-semibold tracking-wide uppercase sm:mb-3 sm:text-sm"
								>
									Thần Sát & Sao
								</h4>
								<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
									{#each baziProfile.shen_sha as sha}
										<div
											class="bg-base-200 text-base-content/80 flex items-center gap-2 rounded-lg px-3 py-2 text-xs sm:gap-3 sm:px-4 sm:py-3 sm:text-sm"
										>
											<Sparkles class="text-warning h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
											<span>{sha}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Analysis Reason -->
						{#if baziProfile.analysis_reason}
							<div class="alert alert-info p-3 shadow-sm sm:p-4">
								<Info class="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
								<div class="flex min-w-0 flex-col gap-1">
									<h4 class="text-sm font-bold sm:text-base">Luận Giải Chi Tiết</h4>
									<span class="text-xs leading-relaxed sm:text-sm"
										>{baziProfile.analysis_reason}</span
									>
								</div>
							</div>
						{/if}

						<!-- Step-by-Step Calculation Details -->
						<div class="collapse-arrow bg-base-200 border-base-300 collapse border">
							<input type="checkbox" />
							<div
								class="collapse-title text-base-content/80 text-xs font-medium tracking-wide uppercase sm:text-sm"
							>
								Xem chi tiết các bước tính toán
							</div>
							<div class="collapse-content space-y-4 text-xs sm:space-y-6 sm:text-sm">
								<!-- Step 1: Pillars -->
								<div>
									<h5 class="text-primary mb-2 text-xs font-bold uppercase sm:text-sm">
										Bước 1: Lập Trụ (An Sao)
									</h5>
									<p class="text-xs opacity-80 sm:text-sm">
										Hệ thống chuyển đổi ngày giờ sinh dương lịch sang hệ Can Chi dựa trên Lịch Tiết
										Khí (Solar Terms).
									</p>
									<div
										class="bg-base-100 mt-2 grid grid-cols-4 gap-1.5 rounded-lg p-2 text-center text-[10px] sm:gap-2 sm:p-3 sm:text-xs"
									>
										<div>
											<div class="font-bold opacity-70">Năm</div>
											<div class="font-medium">
												{CAN[baziProfile.year_stem]}
												{CHI[baziProfile.year_branch]}
											</div>
										</div>
										<div>
											<div class="font-bold opacity-70">Tháng</div>
											<div class="font-medium">
												{CAN[baziProfile.month_stem]}
												{CHI[baziProfile.month_branch]}
											</div>
										</div>
										<div>
											<div class="font-bold opacity-70">Ngày</div>
											<div class="font-medium">
												{CAN[baziProfile.day_stem]}
												{CHI[baziProfile.day_branch]}
											</div>
										</div>
										<div>
											<div class="font-bold opacity-70">Giờ</div>
											<div class="font-medium">
												{CAN[baziProfile.hour_stem]}
												{CHI[baziProfile.hour_branch]}
											</div>
										</div>
									</div>
								</div>

								<!-- Step 2: Shen Sha -->
								<div>
									<h5 class="text-primary mb-2 text-xs font-bold uppercase sm:text-sm">
										Bước 2: Tính Thần Sát
									</h5>
									<p class="text-xs opacity-80 sm:text-sm">
										Quét các tổ hợp Can Chi để tìm các "ngôi sao" chiếu mệnh (Thần Sát).
									</p>
									<div class="bg-base-100 mt-2 rounded-lg p-2 text-[10px] sm:p-3 sm:text-xs">
										{#if baziProfile.shen_sha && baziProfile.shen_sha.length > 0}
											<ul class="grid grid-cols-1 gap-1 sm:grid-cols-2">
												{#each baziProfile.shen_sha as sha}
													<li class="flex items-start gap-1.5 sm:gap-2">
														<span class="text-warning">★</span>
														<span>{sha}</span>
													</li>
												{/each}
											</ul>
										{:else}
											<p class="italic opacity-60">
												Không tìm thấy thần sát đặc biệt trong lá số này.
											</p>
										{/if}
									</div>
								</div>

								<!-- Step 3: Branch Interactions -->
								<div>
									<h5 class="text-primary mb-2 text-xs font-bold uppercase sm:text-sm">
										Bước 3: Tương Tác Địa Chi
									</h5>
									<p class="text-xs opacity-80 sm:text-sm">
										Phân tích các mối quan hệ Hợp (hóa cục) và Xung (phá cục) giữa 4 địa chi.
									</p>
									<div class="bg-base-100 mt-2 rounded-lg p-2 text-[10px] sm:p-3 sm:text-xs">
										{#if baziProfile.interactions}
											<ul class="space-y-1">
												{#if baziProfile.interactions.tamHoi}
													<li class="text-success font-medium">
														• Tam Hội {baziProfile.interactions.tamHoi}: Lực lượng ngũ hành mạnh
														nhất, tụ khí về phương.
													</li>
												{/if}
												{#if baziProfile.interactions.sanHe}
													<li class="text-info font-medium">
														• Tam Hợp {baziProfile.interactions.sanHe}: Sự liên kết bền vững, tạo
														cục diện mạnh.
													</li>
												{/if}
												{#if baziProfile.interactions.lucXung && baziProfile.interactions.lucXung.length > 0}
													<li class="text-error font-medium">
														• Lục Xung: Có sự xung đột năng lượng giữa các trụ (Gây giảm lực, bất
														ổn).
													</li>
												{/if}
												{#if !baziProfile.interactions.tamHoi && !baziProfile.interactions.sanHe && (!baziProfile.interactions.lucXung || baziProfile.interactions.lucXung.length === 0)}
													<li class="italic opacity-70">
														Các địa chi ở trạng thái tĩnh, không có tương tác mạnh (Hợp/Xung).
													</li>
												{/if}
											</ul>
										{:else}
											<p class="italic opacity-60">Chưa có dữ liệu tương tác.</p>
										{/if}
									</div>
								</div>

								<!-- Step 4: Quantitative Scoring -->
								<div>
									<h5 class="text-primary mb-2 text-xs font-bold uppercase sm:text-sm">
										Bước 4: Tính Điểm Ngũ Hành (Vùng Tâm)
									</h5>
									<p class="text-xs opacity-80 sm:text-sm">
										Chi tiết điểm số từng thành phần (Can/Chi) sau khi nhân hệ số vị trí và tương
										tác.
									</p>

									<!-- Detailed Score Table -->
									{#if baziProfile.score_details && baziProfile.score_details.length > 0}
										<div class="bg-base-100 border-base-300 mt-2 overflow-x-auto rounded-lg border">
											<table class="table-xs sm:table-sm table w-full">
												<thead>
													<tr class="bg-base-200">
														<th class="text-[10px] sm:text-xs">Nguồn</th>
														<th class="text-[10px] sm:text-xs">Hành</th>
														<th class="text-right text-[10px] sm:text-xs">Điểm</th>
														<th class="text-[10px] sm:text-xs">Ghi chú</th>
													</tr>
												</thead>
												<tbody>
													{#each baziProfile.score_details as detail}
														<tr class="hover:bg-base-200/50">
															<td class="text-[10px] font-medium sm:text-xs">{detail.source}</td>
															<td>
																<span
																	class="badge badge-sm badge-outline text-[9px] sm:text-[10px] {ELEMENT_DETAILS[
																		detail.element as keyof typeof ELEMENT_DETAILS
																	]?.text}"
																>
																	{detail.element}
																</span>
															</td>
															<td class="text-right font-mono text-[10px] sm:text-xs"
																>{detail.score.toFixed(1)}</td
															>
															<td class="text-[9px] opacity-70 sm:text-[10px]">{detail.notes}</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									{/if}

									<!-- Total Summary -->
									{#if baziProfile.element_scores}
										<div class="mt-2 sm:mt-3">
											<div class="mb-1 text-[10px] font-bold uppercase opacity-70 sm:text-xs">
												Tổng Điểm:
											</div>
											<div class="grid grid-cols-5 gap-1 text-[10px] sm:text-xs">
												{#each Object.entries(baziProfile.element_scores) as [el, score]}
													<div
														class="bg-base-100 border-base-300 flex flex-col items-center justify-center rounded border p-1.5 sm:p-2"
													>
														<div class="font-bold">{el}</div>
														<div class="text-primary font-mono">{Number(score).toFixed(1)}</div>
													</div>
												{/each}
											</div>
										</div>
									{/if}
								</div>

								<!-- Step 5: Structure -->
								<div>
									<h5 class="text-primary mb-2 text-xs font-bold uppercase sm:text-sm">
										Bước 5: Xác định Cách Cục
									</h5>
									<p class="text-xs opacity-80 sm:text-sm">
										Dựa trên điểm số và cấu trúc, lá số được phân loại vào nhóm Chính Cách hoặc
										Ngoại Cách.
									</p>
									<div class="bg-base-100 mt-2 rounded-lg p-2 sm:p-3">
										<p class="text-primary text-xs font-bold sm:text-sm">
											{baziProfile.structure_name || 'Chưa xác định'}
										</p>
										<p class="text-[10px] opacity-70 sm:text-xs">
											Loại: {baziProfile.structure_type || 'N/A'}
										</p>
									</div>
								</div>

								<!-- Step 6: Day Master & Favorable Elements -->
								<div>
									<h5 class="text-primary mb-2 text-xs font-bold uppercase sm:text-sm">
										Bước 6: Luận Cường Nhược & Dụng Thần
									</h5>
									<p class="text-xs opacity-80 sm:text-sm">
										Tổng hợp toàn bộ dữ liệu để xác định trạng thái Nhật Chủ và tìm giải pháp cân
										bằng (Dụng Thần).
									</p>
									<div
										class="bg-base-100 mt-2 space-y-1.5 rounded-lg p-2 text-[10px] sm:space-y-2 sm:p-3 sm:text-xs"
									>
										<div>
											<span class="font-bold opacity-70">Trạng thái Nhật Chủ:</span>
											<span
												class="ml-1 font-bold uppercase {isDayMasterStrong
													? 'text-success'
													: 'text-warning'}"
											>
												{baziProfile.day_master_status}
											</span>
										</div>
										<div class="border-base-300 border-l-2 pl-2 italic opacity-80">
											"{baziProfile.analysis_reason}"
										</div>
										<div class="divider my-1 opacity-50"></div>
										<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
											<div class="bg-success/10 rounded p-2">
												<div
													class="text-success text-[9px] font-bold tracking-wider uppercase sm:text-[10px]"
												>
													Dụng Thần (Tốt nhất)
												</div>
												<div class="text-base font-medium sm:text-lg">
													{baziProfile.favorable_elements?.dung_than?.join(', ') || '---'}
												</div>
												<div class="text-[9px] opacity-70 sm:text-[10px]">
													Thuốc chữa bệnh của lá số
												</div>
											</div>
											<div class="bg-info/10 rounded p-2">
												<div
													class="text-info text-[9px] font-bold tracking-wider uppercase sm:text-[10px]"
												>
													Hỷ Thần (Tốt nhì)
												</div>
												<div class="text-base font-medium sm:text-lg">
													{baziProfile.favorable_elements?.hy_than?.join(', ') || '---'}
												</div>
												<div class="text-[9px] opacity-70 sm:text-[10px]">
													Sinh trợ cho Dụng thần
												</div>
											</div>
											<div class="bg-error/10 rounded p-2">
												<div
													class="text-error text-[9px] font-bold tracking-wider uppercase sm:text-[10px]"
												>
													Kỵ Thần (Xấu nhất)
												</div>
												<div class="text-base font-medium sm:text-lg">
													{baziProfile.favorable_elements?.ky_than?.join(', ') || '---'}
												</div>
												<div class="text-[9px] opacity-70 sm:text-[10px]">Khắc phá Dụng thần</div>
											</div>
											<div class="bg-warning/10 rounded p-2">
												<div
													class="text-warning text-[9px] font-bold tracking-wider uppercase sm:text-[10px]"
												>
													Cừu Thần (Xấu nhì)
												</div>
												<div class="text-base font-medium sm:text-lg">
													{baziProfile.favorable_elements?.cuu_than?.join(', ') || '---'}
												</div>
												<div class="text-[9px] opacity-70 sm:text-[10px]">
													Sinh Kỵ thần, khắc Hỷ thần
												</div>
											</div>
											<div class="bg-base-300/30 rounded p-2">
												<div
													class="text-base-content/60 text-[9px] font-bold tracking-wider uppercase sm:text-[10px]"
												>
													Nhàn Thần (Trung tính)
												</div>
												<div class="text-base font-medium sm:text-lg">
													{baziProfile.favorable_elements?.nhan_than?.join(', ') || '---'}
												</div>
												<div class="text-[9px] opacity-70 sm:text-[10px]">Ít ảnh hưởng tốt/xấu</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			{:else}
				<!-- Empty State -->
				<div class="card border-base-300 bg-base-100 border-2 border-dashed shadow-sm">
					<div class="card-body items-center p-6 text-center sm:p-8 md:p-12">
						<div
							class="bg-primary/10 mb-3 flex h-14 w-14 items-center justify-center rounded-full sm:mb-4 sm:h-16 sm:w-16 md:h-20 md:w-20"
						>
							<Sparkles class="text-primary h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10" />
						</div>
						<h3 class="text-base-content mb-2 text-lg font-bold sm:text-xl md:text-2xl">
							Chưa Có Lá Số Bát Tự
						</h3>
						<p class="text-base-content/70 mb-4 max-w-md px-2 text-xs sm:text-sm md:text-base">
							Điền đầy đủ thông tin ngày giờ sinh bên dưới để hệ thống tự động tính toán và hiển thị
							lá số Tứ Trụ của bạn.
						</p>
						<button
							type="button"
							onclick={() => document.getElementById('profile_name')?.focus()}
							class="btn btn-primary btn-sm gap-1.5 text-xs sm:gap-2 sm:text-sm"
						>
							<Calendar class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
							Bắt đầu nhập thông tin
						</button>
					</div>
				</div>
			{/if}

			<!-- Input Form -->
			<div class="card border-base-200 bg-base-100 border shadow-md">
				<div class="card-body gap-4 p-4 sm:gap-6 sm:p-5 md:p-8">
					<div>
						<h3 class="font-heading text-base-content text-lg font-semibold sm:text-xl md:text-2xl">
							{baziProfile ? 'Cập Nhật Thông Tin Sinh' : 'Nhập Thông Tin Sinh Của Bạn'}
						</h3>
						<p class="text-base-content/60 mt-1 text-xs sm:text-sm">
							Thông tin này sẽ được dùng để tính toán Tứ Trụ và Nhật Chủ.
						</p>
					</div>

					<form
						method="POST"
						action="?/saveBazi"
						use:enhance={() => {
							loading = true;
							return async ({ update }) => {
								await update({ reset: false });
								loading = false;
							};
						}}
						class="space-y-4 sm:space-y-6"
					>
						<!-- Section: Basic Info -->
						<div class="space-y-3 sm:space-y-4">
							<h4
								class="text-base-content/80 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase sm:gap-2 sm:text-sm"
							>
								<User class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
								Thông Tin Cơ Bản
							</h4>

							<div class="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
								<div class="form-control w-full">
									<label class="label pb-1" for="profile_name">
										<span class="label-text text-xs font-medium sm:text-sm">Tên hồ sơ</span>
									</label>
									<input
										id="profile_name"
										name="profile_name"
										type="text"
										class="input input-bordered focus:input-primary w-full text-sm sm:text-base"
										placeholder="Nhập tên của bạn"
										bind:value={profile_name}
										required
									/>
									<label class="label pt-1">
										<span class="label-text-alt text-base-content/60 text-[10px] sm:text-xs"
											>Tên để nhận diện lá số này</span
										>
									</label>
								</div>

								<div class="form-control w-full">
									<label class="label pb-1" for="gender">
										<span class="label-text text-xs font-medium sm:text-sm">Giới tính</span>
									</label>
									<div class="join w-full">
										<input
											class="btn join-item flex-1 text-xs sm:text-sm"
											class:btn-primary={gender === 'male'}
											class:btn-outline={gender !== 'male'}
											type="radio"
											name="gender"
											value="male"
											aria-label="Nam"
											bind:group={gender}
											required
										/>
										<input
											class="btn join-item flex-1 text-xs sm:text-sm"
											class:btn-primary={gender === 'female'}
											class:btn-outline={gender !== 'female'}
											type="radio"
											name="gender"
											value="female"
											aria-label="Nữ"
											bind:group={gender}
											required
										/>
									</div>
									<label class="label pt-1">
										<span class="label-text-alt text-base-content/60 text-[10px] sm:text-xs"
											>Cần thiết cho phân tích Vận</span
										>
									</label>
								</div>
							</div>
						</div>

						<div class="divider my-1 sm:my-2"></div>

						<!-- Section: Date & Time -->
						<div class="space-y-3 sm:space-y-4">
							<h4
								class="text-base-content/80 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase sm:gap-2 sm:text-sm"
							>
								<Calendar class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
								Ngày Giờ Sinh (Dương Lịch)
							</h4>

							<div class="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
								<div class="form-control w-full">
									<label class="label pb-1" for="birth_date">
										<span class="label-text text-xs font-medium sm:text-sm">Ngày sinh</span>
										<span class="label-text-alt text-error text-xs">*</span>
									</label>
									<input
										id="birth_date"
										name="birth_date"
										type="date"
										max={new Date().toISOString().split('T')[0]}
										class="input input-bordered focus:input-primary w-full text-sm sm:text-base"
										bind:value={birth_date}
										required
									/>
									<label class="label pt-1">
										<span class="label-text-alt text-base-content/60 text-[10px] sm:text-xs"
											>Chọn ngày tháng năm sinh</span
										>
									</label>
								</div>

								<div class="form-control w-full">
									<label class="label pb-1" for="birth_time">
										<span class="label-text text-xs font-medium sm:text-sm">Giờ sinh</span>
										<span class="label-text-alt text-error text-xs">*</span>
									</label>
									<input
										id="birth_time"
										name="birth_time"
										type="time"
										class="input input-bordered focus:input-primary w-full text-sm sm:text-base"
										bind:value={birth_time}
										required
									/>
									<label class="label pt-1">
										<span class="label-text-alt text-base-content/60 text-[10px] sm:text-xs"
											>Giờ địa phương khi sinh</span
										>
									</label>
								</div>
							</div>

							<div class="alert alert-info p-3 shadow-sm">
								<Info class="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
								<span class="text-xs leading-relaxed sm:text-sm">
									<strong>Lưu ý:</strong> Sử dụng ngày giờ theo dương lịch (lịch Gregorian). Giờ sinh
									rất quan trọng cho độ chính xác của Trụ Giờ.
								</span>
							</div>
						</div>

						<div class="divider my-1 sm:my-2"></div>

						<!-- Actions -->
						<div
							class="flex flex-col items-stretch justify-between gap-3 pt-2 sm:flex-row sm:items-center sm:gap-4"
						>
							{#if loading}
								<div class="text-base-content/70 flex items-center gap-2 sm:gap-3">
									<span class="loading loading-spinner loading-sm"></span>
									<span class="text-xs sm:text-sm">Đang vẽ lá số Bát Tự cho bạn...</span>
								</div>
							{:else}
								<div class="hidden sm:block"></div>
							{/if}

							<button
								type="submit"
								class="btn btn-primary min-h-[2.5rem] min-w-full gap-1.5 text-xs shadow-lg sm:min-h-[3rem] sm:min-w-[160px] sm:gap-2 sm:text-sm"
								class:btn-disabled={loading}
								disabled={loading}
							>
								{#if loading}
									<span class="loading loading-spinner loading-sm"></span>
									Đang tính...
								{:else}
									<Save class="h-4 w-4 sm:h-5 sm:w-5" />
									{baziProfile ? 'Cập nhật lá số' : 'Tạo lá số'}
								{/if}
							</button>
						</div>
					</form>
				</div>
			</div>

			<!-- Footer Note -->
			<div
				class="text-base-content/50 px-2 pb-6 text-center text-[10px] leading-relaxed sm:text-xs"
			>
				<p class="mb-1">
					Kết quả chỉ mang tính chất tham khảo, không phải là luận đoán chuyên môn.
				</p>
				<p>
					Hệ thống tính toán tham khảo phương pháp của sách Trích Thiên tuỷ bình chú, Dự đoán theo
					tứ trụ (Triệu Vĩ Hoa), đặc biêt là <a
						href="https://lyso.vn/tu-tru/vulong-tu-tru-cho-tat-ca-moi-nguoi-t38496/"
						class="hover:text-base-content underline"
						target="_blank"
						rel="noopener noreferrer"
					>
						các bài viết của tác giả VuLong</a
					>
				</p>
			</div>
		</div>
	</div>
</div>
