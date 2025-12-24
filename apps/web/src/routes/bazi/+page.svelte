<!-- src/routes/bazi/+page.svelte -->
<script lang="ts">
	import {
		Calendar,
		Info,
		Save,
		Sparkles,
		User,
		Activity,
		TrendingUp,
		AlertTriangle,
		CheckCircle2,
		XCircle,
		ArrowRight,
		Search,
		Share2,
		Printer,
		ChevronDown,
		ChevronUp,
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { toastStore } from '$lib/toastStore';

	const { data, form } = $props();

	// ============================================================
	// TYPE DEFINITIONS
	// ============================================================
	interface EnergyModification {
		reason: string;
		valueChange: number;
		factor?: number;
	}

	interface EnergyNode {
		id: string;
		name: string;
		element: string;
		source: 'Year' | 'Month' | 'Day' | 'Hour';
		type: 'Stem' | 'HiddenStem';
		baseScore: number;
		currentScore: number;
		lifeCycleStage: string;
		isBlocked: boolean;
		isCombined?: boolean;
		transformTo?: string;
		modifications: EnergyModification[];
	}

	interface LimitScoreProfile {
		dungThan: string[];
		hyThan: string[];
		kyThan: string[];
		hungThan: string[];
		scores: Record<string, number>;
	}

	interface CenterAnalysis {
		dayMasterScore: number;
		partyScore: number;
		enemyScore: number;
		diffScore: number;
		isVwang: boolean;
		isStrongVwang: boolean;
		isWeakVwang: boolean;
	}

	type InteractionType = 'TamHoi' | 'TamHop' | 'LucHop' | 'LucXung' | 'CanHop';

	type TenGod =
		| 'TyKien'
		| 'KiepTai'
		| 'ThucThan'
		| 'ThuongQuan'
		| 'ChinhTai'
		| 'ThienTai'
		| 'ChinhQuan'
		| 'ThatSat'
		| 'ChinhAn'
		| 'ThienAn';

	interface Interaction {
		type: InteractionType;
		participants: string[];
		result: string;
		score?: number;
		description?: string;
	}

	interface BaziProfileUI extends Omit<
		App.BaziProfile,
		'center_analysis' | 'energy_flow' | 'limit_score' | 'interactions'
	> {
		center_analysis?: CenterAnalysis;
		energy_flow?: EnergyNode[];
		limit_score?: LimitScoreProfile;
		interactions?: Interaction[];
		analysis_reason?: string;
		year_stem?: string;
		year_branch?: string;
		month_stem?: string;
		month_branch?: string;
		day_stem?: string;
		day_branch?: string;
		hour_stem?: string;
		hour_branch?: string;
	}

	type ElementName = 'Mộc' | 'Hỏa' | 'Thổ' | 'Kim' | 'Thủy';

	interface ElementStyle {
		name: string;
		color: string;
		text: string;
		border: string;
		bgSoft: string;
		bgGradient: string;
	}

	// ============================================================
	// CONSTANTS
	// ============================================================
	const ELEMENT_DETAILS: Record<ElementName, ElementStyle> = {
		Mộc: {
			name: 'Mộc',
			color: 'bg-green-600',
			text: 'text-green-600',
			border: 'border-green-200',
			bgSoft: 'bg-green-50',
			bgGradient: 'from-green-500/10 to-green-500/5',
		},
		Hỏa: {
			name: 'Hỏa',
			color: 'bg-red-600',
			text: 'text-red-600',
			border: 'border-red-200',
			bgSoft: 'bg-red-50',
			bgGradient: 'from-red-500/10 to-red-500/5',
		},
		Thổ: {
			name: 'Thổ',
			color: 'bg-yellow-600',
			text: 'text-yellow-600',
			border: 'border-yellow-200',
			bgSoft: 'bg-yellow-50',
			bgGradient: 'from-yellow-500/10 to-yellow-500/5',
		},
		Kim: {
			name: 'Kim',
			color: 'bg-slate-500',
			text: 'text-slate-600',
			border: 'border-slate-200',
			bgSoft: 'bg-slate-100',
			bgGradient: 'from-slate-500/10 to-slate-500/5',
		},
		Thủy: {
			name: 'Thủy',
			color: 'bg-blue-600',
			text: 'text-blue-600',
			border: 'border-blue-200',
			bgSoft: 'bg-blue-50',
			bgGradient: 'from-blue-500/10 to-blue-500/5',
		},
	} as const;

	const DEFAULT_ELEMENT_STYLE: ElementStyle = {
		name: '',
		color: 'bg-gray-500',
		text: 'text-gray-600',
		border: 'border-gray-200',
		bgSoft: 'bg-gray-50',
		bgGradient: 'from-gray-500/10 to-gray-500/5',
	};

	const SOURCE_MAP: Record<string, string> = {
		Year: 'Năm',
		Month: 'Tháng',
		Day: 'Ngày',
		Hour: 'Giờ',
	} as const;

	const PILLAR_ORDER: Array<'Hour' | 'Day' | 'Month' | 'Year'> = ['Hour', 'Day', 'Month', 'Year'];

	const TEN_GOD_NAMES: Record<TenGod, { name: string; short: string; color: string }> = {
		TyKien: { name: 'Tỷ Kiên', short: 'Tỷ', color: 'text-blue-600' },
		KiepTai: { name: 'Kiếp Tài', short: 'Kiếp', color: 'text-blue-500' },
		ThucThan: { name: 'Thực Thần', short: 'Thực', color: 'text-orange-600' },
		ThuongQuan: { name: 'Thương Quan', short: 'Thương', color: 'text-orange-500' },
		ChinhTai: { name: 'Chính Tài', short: 'Tài', color: 'text-yellow-600' },
		ThienTai: { name: 'Thiên Tài', short: 'Thiên Tài', color: 'text-yellow-500' },
		ChinhQuan: { name: 'Chính Quan', short: 'Quan', color: 'text-purple-600' },
		ThatSat: { name: 'Thất Sát', short: 'Sát', color: 'text-purple-500' },
		ChinhAn: { name: 'Chính Ấn', short: 'Ấn', color: 'text-green-600' },
		ThienAn: { name: 'Thiên Ấn', short: 'Thiên Ấn', color: 'text-green-500' },
	} as const;

	const LIFE_CYCLE_NAMES: Record<string, { name: string; strength: number }> = {
		TruongSinh: { name: 'Trường Sinh', strength: 6 },
		MocDuc: { name: 'Mộc Dục', strength: 7 },
		QuanDoi: { name: 'Quan Đới', strength: 8 },
		LamQuan: { name: 'Lâm Quan', strength: 9 },
		DeVuong: { name: 'Đế Vượng', strength: 10 },
		Suy: { name: 'Suy', strength: 5 },
		Benh: { name: 'Bệnh', strength: 4 },
		Tu: { name: 'Tử', strength: 3 },
		Mo: { name: 'Mộ', strength: 3 },
		Tuyet: { name: 'Tuyệt', strength: 3 },
		Thai: { name: 'Thai', strength: 4 },
		Duong: { name: 'Dưỡng', strength: 4 },
	} as const;

	const INTERACTION_TYPE_LABELS: Record<
		InteractionType,
		{ name: string; desc: string; color: string }
	> = {
		TamHoi: { name: 'Tam Hội', desc: 'Phương hội cục', color: 'badge-primary' },
		TamHop: { name: 'Tam Hợp', desc: 'Tam hợp cục', color: 'badge-secondary' },
		LucHop: { name: 'Lục Hợp', desc: 'Lục hợp', color: 'badge-accent' },
		LucXung: { name: 'Lục Xung', desc: 'Xung khắc', color: 'badge-error' },
		CanHop: { name: 'Can Hợp', desc: 'Thiên can hợp', color: 'badge-info' },
	} as const;

	function getInteractionResultDisplay(interaction: Interaction): {
		text: string;
		variant: string;
	} {
		if (interaction.result === 'Clash') {
			return { text: 'Xung', variant: 'text-error' };
		}
		if (interaction.result === 'Bind') {
			return { text: 'Trói', variant: 'text-warning' };
		}
		// It's an element transformation
		return { text: `Hóa ${interaction.result}`, variant: 'text-success' };
	}

	// ============================================================
	// UTILITY FUNCTIONS
	// ============================================================
	function getElementStyle(el: string): ElementStyle {
		return ELEMENT_DETAILS[el as ElementName] ?? { ...DEFAULT_ELEMENT_STYLE, name: el };
	}

	function formatScore(val: number): string {
		return val.toFixed(2);
	}

	function formatSign(val: number): string {
		return val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
	}

	function padZero(num: number | undefined, length = 2): string {
		return String(num ?? 0).padStart(length, '0');
	}

	function shouldShowNode(node: EnergyNode): boolean {
		if (node.source === 'Day' && node.type === 'Stem') return true;
		return !node.isBlocked || node.currentScore > 0.01 || node.modifications.length > 0;
	}

	function formatBirthDate(profile: BaziProfileUI): string {
		const { birth_day, birth_month, birth_year, birth_hour, birth_minute } = profile;
		if (!birth_day || !birth_month || !birth_year) return '';
		return `${padZero(birth_day)}/${padZero(birth_month)}/${birth_year} - ${padZero(birth_hour)}:${padZero(birth_minute)}`;
	}

	function scrollToElement(id: string): void {
		if (browser) {
			document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
		}
	}

	function focusElement(id: string): void {
		if (browser) {
			(document.getElementById(id) as HTMLElement)?.focus();
		}
	}

	// ============================================================
	// STATE
	// ============================================================
	let loading = $state(false);
	let baziProfile = $state<BaziProfileUI | null>((data.baziProfile as BaziProfileUI) ?? null);
	let auditSearchTerm = $state('');
	let isAuditExpanded = $state(false);
	let showEnergyTable = $state(true);

	// Form state (grouped for cleaner management)
	let formData = $state({
		profile_name: `${data.user?.first_name ?? ''} ${data.user?.last_name ?? ''}`.trim(),
		gender: 'male',
		birth_date: '',
		birth_time: '',
	});

	// ============================================================
	// DERIVED STATE
	// ============================================================
	const formattedBirthDate = $derived(baziProfile ? formatBirthDate(baziProfile) : '');

	const auditLogs = $derived(baziProfile?.analysis_reason?.split('\n').filter(Boolean) ?? []);

	const filteredAuditLogs = $derived(
		auditSearchTerm
			? auditLogs.filter((log) => log.toLowerCase().includes(auditSearchTerm.toLowerCase()))
			: auditLogs,
	);

	const isDayMasterStrong = $derived(baziProfile?.center_analysis?.isVwang ?? false);

	const todayISO = $derived(new Date().toISOString().split('T')[0]);

	const visibleEnergyNodes = $derived(baziProfile?.energy_flow?.filter(shouldShowNode) ?? []);

	// Group energy nodes by pillar position for the new chart
	const pillarEnergyData = $derived.by(() => {
		if (!baziProfile?.energy_flow) return null;

		const nodes = baziProfile.energy_flow;
		const pillars: Record<
			string,
			{
				stem: EnergyNode | null;
				hiddenStems: EnergyNode[];
				stemName: string;
				branchName: string;
			}
		> = {};

		for (const pos of PILLAR_ORDER) {
			const stem = nodes.find((n) => n.source === pos && n.type === 'Stem') || null;
			const hiddenStems = nodes
				.filter((n) => n.source === pos && n.type === 'HiddenStem')
				.sort((a, b) => b.baseScore - a.baseScore);

			// Get stem and branch names from profile
			const stemName =
				pos === 'Year'
					? baziProfile.year_stem
					: pos === 'Month'
						? baziProfile.month_stem
						: pos === 'Day'
							? baziProfile.day_stem
							: baziProfile.hour_stem;
			const branchName =
				pos === 'Year'
					? baziProfile.year_branch
					: pos === 'Month'
						? baziProfile.month_branch
						: pos === 'Day'
							? baziProfile.day_branch
							: baziProfile.hour_branch;

			pillars[pos] = {
				stem,
				hiddenStems,
				stemName: stemName ?? '',
				branchName: branchName ?? '',
			};
		}

		return pillars;
	});

	function getLifeCycleDisplay(stage: string): { name: string; strength: number } {
		return LIFE_CYCLE_NAMES[stage] ?? { name: stage, strength: 5 };
	}

	function getStrengthColor(strength: number): string {
		if (strength >= 9) return 'text-success';
		if (strength >= 7) return 'text-info';
		if (strength >= 5) return 'text-warning';
		return 'text-error';
	}

	function getScoreBarWidth(score: number, maxScore: number = 10): number {
		return Math.min((score / maxScore) * 100, 100);
	}

	const balancePercentages = $derived.by(() => {
		const ca = baziProfile?.center_analysis;
		if (!ca) return { party: 50, enemy: 50 };
		const total = ca.partyScore + ca.enemyScore;
		const party = total ? (ca.partyScore / total) * 100 : 50;
		return { party, enemy: 100 - party };
	});

	// ============================================================
	// ACTIONS
	// ============================================================
	async function handleShare(): Promise<void> {
		if (!browser || !baziProfile) return;

		const shareData = {
			title: `Lá Số Bát Tự - ${baziProfile.profile_name}`,
			text: `Thân ${baziProfile.day_master_status} - ${formattedBirthDate}`,
			url: window.location.href,
		};

		if (navigator.canShare?.(shareData)) {
			try {
				await navigator.share(shareData);
			} catch (err) {
				if ((err as Error).name !== 'AbortError') {
					copyToClipboard();
				}
			}
		} else {
			copyToClipboard();
		}
	}

	function copyToClipboard(): void {
		if (!browser) return;
		navigator.clipboard.writeText(window.location.href).then(() => {
			toastStore.trigger({
				message: 'Đã sao chép liên kết!',
				background: 'variant-filled-success',
			});
		});
	}

	function handlePrint(): void {
		if (browser) window.print();
	}

	// ============================================================
	// EFFECTS
	// ============================================================
	// Sync form data when profile changes
	$effect(() => {
		if (baziProfile) {
			const { birth_year, birth_month, birth_day, birth_hour, birth_minute } = baziProfile;
			formData.birth_date = `${birth_year}-${padZero(birth_month)}-${padZero(birth_day)}`;
			formData.birth_time = `${padZero(birth_hour)}:${padZero(birth_minute)}`;
			formData.gender = baziProfile.gender ?? 'male';
			formData.profile_name = baziProfile.profile_name || formData.profile_name;
		}
	});

	// Handle form submission response
	$effect(() => {
		if (form?.success && form.baziProfile) {
			baziProfile = form.baziProfile as BaziProfileUI;
			toastStore.trigger({
				message: 'Phân tích thành công!',
				background: 'variant-filled-success',
			});
			setTimeout(() => scrollToElement('results-top'), 100);
		} else if (form?.message) {
			toastStore.trigger({
				message: form.message,
				background: 'variant-filled-error',
			});
		}
	});

	// Keyboard shortcuts
	$effect(() => {
		if (!browser) return;

		function handleKeydown(e: KeyboardEvent): void {
			if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
				e.preventDefault();
				handlePrint();
			}
		}

		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});
</script>

<!-- ============================================================ -->
<!-- SNIPPETS (Reusable Template Fragments) -->
<!-- ============================================================ -->

{#snippet pillarCard(
	title: string,
	stem: string | undefined,
	branch: string | undefined,
	subtitle: string,
	isDay = false,
)}
	<article
		class="pillar-card group relative overflow-hidden rounded-xl border p-3 text-center transition-all duration-300 sm:p-4
			{isDay
			? 'border-primary from-primary/10 to-primary/5 ring-primary/30 bg-gradient-to-br shadow-lg ring-2'
			: 'border-base-200 bg-base-100/50 hover:border-primary/20 hover:-translate-y-1 hover:shadow-md'}"
		aria-label="{title}: {stem ?? 'Chưa có'} - {branch ?? 'Chưa có'}"
	>
		{#if isDay}
			<div
				class="bg-primary/10 absolute -top-6 -right-6 h-16 w-16 animate-pulse rounded-full"
				aria-hidden="true"
			></div>
		{/if}

		<div class="relative">
			<header
				class="mb-2 flex items-center justify-center gap-1 text-[10px] font-bold tracking-wider uppercase opacity-60"
			>
				{title}
				{#if isDay}
					<span
						class="bg-primary inline-block h-1.5 w-1.5 animate-pulse rounded-full"
						aria-hidden="true"
					></span>
				{/if}
			</header>

			<div
				class="font-heading flex flex-col items-center justify-center gap-1 text-2xl font-black transition-all sm:text-3xl"
			>
				<span
					class="transition-transform group-hover:scale-110 {isDay
						? 'text-primary text-3xl sm:text-4xl'
						: ''}"
				>
					{stem ?? '-'}
				</span>
				<span class="text-xl opacity-80 sm:text-2xl">{branch ?? '-'}</span>
			</div>

			<footer class="mt-3 text-[10px] font-medium tracking-wide uppercase opacity-50">
				{subtitle}
			</footer>
		</div>
	</article>
{/snippet}

{#snippet elementTag(element: string)}
	{@const style = getElementStyle(element)}
	<span
		class="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[10px] font-bold transition-all hover:scale-105 {style.bgSoft} {style.text} {style.border}"
		role="img"
		aria-label="Ngũ hành {element}"
	>
		{element}
	</span>
{/snippet}

{#snippet statCard(
	title: string,
	value: number,
	description: string,
	variant: 'success' | 'error' | 'warning' | 'neutral' = 'neutral',
	showSign = false,
)}
	{@const colorMap = {
		success: 'text-success',
		error: 'text-error',
		warning: 'text-warning',
		neutral: 'text-base-content',
	}}
	{@const displayValue = showSign ? formatSign(value) : formatScore(value)}
	<div class="stats border-base-200 border shadow">
		<div class="stat p-3 sm:p-4">
			<div class="stat-title text-xs">{title}</div>
			<div class="stat-value text-xl sm:text-2xl {colorMap[variant]}">{displayValue}</div>
			<div class="stat-desc text-[9px]">{description}</div>
		</div>
	</div>
{/snippet}

{#snippet loadingSkeleton()}
	<div class="animate-pulse space-y-6" aria-busy="true" aria-label="Đang tải...">
		<div class="card border-base-200 bg-base-100 border">
			<div class="card-body p-5">
				<div class="bg-base-200 mb-4 h-6 w-48 rounded"></div>
				<div class="grid grid-cols-4 gap-4">
					{#each { length: 4 } as _}
						<div class="bg-base-200 h-32 rounded-xl"></div>
					{/each}
				</div>
			</div>
		</div>
		<div class="bg-base-200 h-64 rounded-xl"></div>
		<div class="bg-base-200 h-96 rounded-xl"></div>
	</div>
{/snippet}

{#snippet emptyState()}
	<div class="flex flex-col items-center justify-center py-16 text-center">
		<Sparkles class="text-base-300 mb-4 h-20 w-20 animate-pulse" aria-hidden="true" />
		<h2 class="text-2xl font-bold">Chưa có dữ liệu</h2>
		<p class="text-base-content/60 mt-2 text-sm">
			Vui lòng nhập thông tin ngày giờ sinh bên dưới để bắt đầu.
		</p>
		<button class="btn btn-primary mt-6 gap-2" onclick={() => focusElement('profile_name')}>
			<Sparkles class="h-4 w-4" aria-hidden="true" />
			Bắt đầu ngay
		</button>
	</div>
{/snippet}

<!-- ============================================================ -->
<!-- HEAD -->
<!-- ============================================================ -->
<svelte:head>
	<title>Lá Số Tứ Trụ - {baziProfile?.profile_name || 'Bát Tự Tử Bình'}</title>
	<meta name="description" content="Phân tích lá số Bát tự Tử Bình và xác định Dụng thần" />
</svelte:head>

<!-- ============================================================ -->
<!-- MAIN LAYOUT -->
<!-- ============================================================ -->
<div class="from-base-200/50 to-base-100 min-h-screen bg-gradient-to-b pb-24">
	<div class="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6">
		<!-- ==================== STICKY HEADER ==================== -->
		<header
			class="border-base-200 bg-base-100/95 sticky top-0 z-20 mb-6 rounded-lg border shadow-sm backdrop-blur-sm print:hidden"
		>
			<div class="px-4 py-4 sm:px-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Sparkles class="text-primary h-6 w-6" aria-hidden="true" />
						<h1 class="font-heading text-base-content text-xl font-black sm:text-2xl">
							Bát Tự Tử Bình
						</h1>
					</div>

					{#if baziProfile}
						<nav class="flex gap-2" aria-label="Hành động">
							<button
								class="btn btn-ghost btn-sm gap-2"
								onclick={handleShare}
								aria-label="Chia sẻ kết quả"
							>
								<Share2 class="h-4 w-4" aria-hidden="true" />
								<span class="hidden sm:inline">Chia sẻ</span>
							</button>
							<button
								class="btn btn-ghost btn-sm gap-2"
								onclick={handlePrint}
								aria-label="In hoặc lưu PDF (Ctrl+P)"
							>
								<Printer class="h-4 w-4" aria-hidden="true" />
								<span class="hidden sm:inline">In</span>
							</button>
							<button
								class="btn btn-primary btn-sm gap-2"
								onclick={() => scrollToElement('bazi-form')}
							>
								<User class="h-4 w-4" aria-hidden="true" />
								<span class="hidden sm:inline">Nhập lại</span>
							</button>
						</nav>
					{/if}
				</div>

				{#if !baziProfile}
					<p class="text-base-content/70 mx-auto mt-2 max-w-2xl px-2 text-xs sm:text-sm">
						Nhập thông tin ngày giờ sinh để lập lá số Bát tự Tử Bình và xác định Dụng thần.
					</p>
				{/if}
			</div>
		</header>

		<div id="results-top"></div>

		<!-- ==================== MAIN CONTENT ==================== -->
		{#if loading}
			{@render loadingSkeleton()}
		{:else if baziProfile}
			<main class="grid grid-cols-1 gap-6 lg:grid-cols-12">
				<!-- ========== LEFT COLUMN: Main Chart & Analysis ========== -->
				<div class="space-y-6 lg:col-span-8">
					<!-- Four Pillars Card -->
					<section
						class="card border-base-200 bg-base-100 border shadow-sm transition-all hover:shadow-md"
						aria-labelledby="pillars-heading"
					>
						<div class="card-body p-5">
							<header class="mb-6 flex flex-wrap items-center justify-between gap-4">
								<div>
									<h2 id="pillars-heading" class="flex items-center gap-2 text-xl font-bold">
										{baziProfile.profile_name}
										<span class="badge badge-sm">
											{baziProfile.gender === 'male' ? 'Nam' : 'Nữ'}
										</span>
									</h2>
									<div class="mt-1 flex items-center gap-2 text-xs opacity-60">
										<Calendar class="h-3 w-3" aria-hidden="true" />
										<time>{formattedBirthDate}</time>
									</div>
								</div>
								<div class="text-right">
									<div
										class="badge badge-lg font-bold {isDayMasterStrong
											? 'badge-success text-white'
											: 'badge-warning'}"
									>
										Thân {baziProfile.day_master_status}
									</div>
									<div class="mt-1 font-mono text-[10px] opacity-60">
										{baziProfile.structure_name}
									</div>
								</div>
							</header>

							<div class="grid grid-cols-4 gap-2 sm:gap-4" role="list" aria-label="Tứ trụ">
								{@render pillarCard(
									'Giờ',
									baziProfile.hour_stem,
									baziProfile.hour_branch,
									'Con cái',
								)}
								{@render pillarCard(
									'Ngày',
									baziProfile.day_stem,
									baziProfile.day_branch,
									'Nhật Chủ',
									true,
								)}
								{@render pillarCard(
									'Tháng',
									baziProfile.month_stem,
									baziProfile.month_branch,
									'Sự nghiệp',
								)}
								{@render pillarCard(
									'Năm',
									baziProfile.year_stem,
									baziProfile.year_branch,
									'Tổ tiên',
								)}
							</div>
						</div>
					</section>

					<!-- Quick Stats -->
					{#if baziProfile.center_analysis}
						{@const ca = baziProfile.center_analysis}
						<section class="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Thống kê nhanh">
							{@render statCard(
								'Nhật Chủ',
								ca.dayMasterScore,
								isDayMasterStrong ? 'Vượng' : 'Yếu',
								isDayMasterStrong ? 'success' : 'warning',
							)}
							{@render statCard('Phe Ta', ca.partyScore, 'Ấn + Tỷ', 'success')}
							{@render statCard('Phe Địch', ca.enemyScore, 'Tài + Quan + Thực', 'error')}
							{@render statCard(
								'Hiệu Số',
								ca.diffScore,
								'Độ lệch',
								ca.diffScore >= 0 ? 'success' : 'error',
								true,
							)}
						</section>
					{/if}

					<!-- Interactions (Combinations & Clashes) -->
					{#if baziProfile.interactions && baziProfile.interactions.length > 0}
						<section
							class="card border-base-200 bg-base-100 border shadow-sm"
							aria-labelledby="interactions-heading"
						>
							<div class="card-body p-5">
								<h3
									id="interactions-heading"
									class="mb-4 flex items-center gap-2 text-base font-bold"
								>
									<Share2 class="text-secondary h-4 w-4" aria-hidden="true" />
									Tương Tác Hợp/Xung ({baziProfile.interactions.length})
								</h3>

								<div class="grid gap-3 sm:grid-cols-2">
									{#each baziProfile.interactions as interaction}
										{@const typeInfo = INTERACTION_TYPE_LABELS[interaction.type]}
										{@const resultDisplay = getInteractionResultDisplay(interaction)}
										<div
											class="border-base-200 bg-base-50 flex items-center justify-between rounded-lg border p-3 transition-all hover:shadow-sm"
										>
											<div class="flex items-center gap-3">
												<span class="badge {typeInfo.color} badge-sm font-bold">
													{typeInfo.name}
												</span>
												<div>
													<div class="text-sm font-bold">
														{interaction.participants.join(' - ')}
													</div>
													<div class="text-[10px] opacity-60">{typeInfo.desc}</div>
												</div>
											</div>
											<div class="text-right">
												<div class="text-sm font-bold {resultDisplay.variant}">
													{resultDisplay.text}
												</div>
												{#if interaction.score}
													<div class="text-[10px] opacity-60">
														+{formatScore(interaction.score)} điểm
													</div>
												{/if}
											</div>
										</div>
									{/each}
								</div>

								<p class="mt-3 text-[11px] italic opacity-60">
									* Hợp Hóa tạo thêm năng lượng ngũ hành mới. Xung làm suy giảm lực lượng hai bên.
									Trói giảm lực nhưng không hóa.
								</p>
							</div>
						</section>
					{/if}

					<!-- Center Analysis Balance -->
					{#if baziProfile.center_analysis}
						{@const ca = baziProfile.center_analysis}
						<section
							class="card border-base-200 bg-base-100 border shadow-sm"
							aria-labelledby="balance-heading"
						>
							<div class="card-body p-5">
								<h3 id="balance-heading" class="mb-4 flex items-center gap-2 text-base font-bold">
									<TrendingUp class="text-primary h-4 w-4" aria-hidden="true" />
									Cân Bằng Vùng Tâm (Nội Bộ)
								</h3>

								<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
									<div class="flex-1 space-y-2">
										<div
											class="flex justify-between text-[10px] font-bold tracking-wider uppercase"
										>
											<span class="text-success">Phe Ta: {formatScore(ca.partyScore)}</span>
											<span class="text-error">Phe Địch: {formatScore(ca.enemyScore)}</span>
										</div>

										<div
											class="bg-base-200 flex h-5 w-full overflow-hidden rounded-full shadow-inner"
											role="progressbar"
											aria-valuenow={balancePercentages.party}
											aria-valuemin={0}
											aria-valuemax={100}
											aria-label="Tỷ lệ Phe Ta so với Phe Địch"
										>
											<div
												class="bg-success h-full transition-all duration-700 ease-out"
												style="width: {balancePercentages.party}%"
											></div>
											<div
												class="bg-error h-full transition-all duration-700 ease-out"
												style="width: {balancePercentages.enemy}%"
											></div>
										</div>

										<div class="flex justify-between text-[9px] opacity-50">
											<span>{balancePercentages.party.toFixed(1)}%</span>
											<span>{balancePercentages.enemy.toFixed(1)}%</span>
										</div>
									</div>

									<div
										class="border-base-200 bg-base-200/50 flex min-w-[90px] flex-col items-center justify-center rounded-lg border p-3"
									>
										<span class="text-[9px] font-bold uppercase opacity-50">Hiệu Số</span>
										<span
											class="font-mono text-3xl font-black {ca.diffScore >= 0
												? 'text-success'
												: 'text-error'}"
										>
											{formatSign(ca.diffScore)}
										</span>
									</div>
								</div>

								<p class="mt-3 text-[11px] italic opacity-60">
									* Hiệu số dương > 5.0 thường là Thân Vượng. Điểm số dựa trên độ vượng tại Lệnh
									tháng và dòng chảy vào Vùng tâm.
								</p>
							</div>
						</section>
					{/if}

					<!-- Energy Flow Table -->
					{#if baziProfile.energy_flow && visibleEnergyNodes.length > 0}
						<section
							class="card border-base-200 bg-base-100 overflow-hidden border shadow-sm"
							aria-labelledby="energy-heading"
						>
							<div class="card-body p-0">
								<!-- Card Header -->
								<header
									class="border-base-200 bg-base-100 flex items-center justify-between border-b px-5 py-4"
								>
									<h3 id="energy-heading" class="flex items-center gap-2 text-base font-bold">
										<Activity class="text-secondary h-5 w-5" aria-hidden="true" />
										Dòng Chảy Năng Lượng
									</h3>
									<div class="flex items-center gap-3">
										<span class="badge badge-ghost badge-sm font-mono">
											{visibleEnergyNodes.length} thần
										</span>
										<button
											class="btn btn-ghost btn-sm gap-1 print:hidden"
											onclick={() => (showEnergyTable = !showEnergyTable)}
											aria-expanded={showEnergyTable}
											aria-controls="energy-table"
										>
											{#if showEnergyTable}
												<ChevronUp class="h-4 w-4" aria-hidden="true" />
												<span class="text-xs">Thu gọn</span>
											{:else}
												<ChevronDown class="h-4 w-4" aria-hidden="true" />
												<span class="text-xs">Mở rộng</span>
											{/if}
										</button>
									</div>
								</header>

								{#if showEnergyTable}
									<!-- Scrollable Table Container -->
									<div id="energy-table" class="max-h-[500px] overflow-auto">
										<table class="table-pin-rows table-sm table w-full">
											<thead>
												<tr class="bg-base-200 text-xs">
													<th class="bg-base-200 w-16 py-3 font-bold">Trụ</th>
													<th class="bg-base-200 w-24 py-3 font-bold">Thần</th>
													<th class="bg-base-200 w-16 py-3 font-bold">Hành</th>
													<th class="bg-base-200 w-20 py-3 font-bold">Vòng Sinh</th>
													<th class="bg-base-200 w-28 py-3 font-bold">Điểm Lực</th>
													<th class="bg-base-200 py-3 font-bold">Biến Động</th>
												</tr>
											</thead>
											<tbody>
												{#each PILLAR_ORDER as pillarPos}
													{@const pillarNodes = visibleEnergyNodes.filter(
														(n) => n.source === pillarPos,
													)}
													{#each pillarNodes as node, nodeIdx (node.id)}
														{@const elStyle = getElementStyle(node.element)}
														{@const lifeCycle = getLifeCycleDisplay(node.lifeCycleStage)}
														{@const scoreDiff = node.currentScore - node.baseScore}
														{@const isFirstInPillar = nodeIdx === 0}
														{@const isDayMaster = node.source === 'Day' && node.type === 'Stem'}
														{@const significantMods = node.modifications.filter(
															(m) => Math.abs(m.valueChange) > 0.01,
														)}
														<tr
															class="group transition-colors
															{isDayMaster ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-base-200/30'}
															{isFirstInPillar && nodeIdx > 0 ? 'border-base-300 border-t-2' : ''}"
														>
															<!-- Pillar Column -->
															<td class="py-3">
																{#if isFirstInPillar}
																	<div class="flex flex-col items-center gap-1">
																		<span
																			class="badge badge-sm font-bold
																			{pillarPos === 'Day' ? 'badge-primary' : 'badge-ghost'}"
																		>
																			{SOURCE_MAP[pillarPos]}
																		</span>
																		{#if pillarPos === 'Day'}
																			<span class="text-primary text-[8px] font-medium"
																				>Nhật Chủ</span
																			>
																		{/if}
																	</div>
																{/if}
															</td>

															<!-- Name Column -->
															<td class="py-3">
																<div class="flex items-center gap-2">
																	<span
																		class="text-base font-bold {elStyle.text}
																		{isDayMaster ? 'text-lg' : ''}"
																	>
																		{node.name}
																	</span>
																	{#if node.type === 'HiddenStem'}
																		<span class="badge badge-xs badge-outline opacity-60">Tàng</span
																		>
																	{/if}
																	{#if isDayMaster}
																		<span class="badge badge-primary badge-xs">Chủ</span>
																	{/if}
																	{#if node.isBlocked}
																		<span class="badge badge-error badge-xs gap-0.5">
																			<XCircle class="h-2.5 w-2.5" />
																			Tuyệt
																		</span>
																	{/if}
																</div>
															</td>

															<!-- Element Column -->
															<td class="py-3">
																<div class="flex items-center gap-1.5">
																	<span
																		class="inline-block h-3 w-3 rounded-full {elStyle.color}"
																		aria-hidden="true"
																	></span>
																	<span class="font-medium {elStyle.text}">
																		{node.transformTo || node.element}
																	</span>
																	{#if node.transformTo}
																		<Sparkles class="h-3 w-3 text-purple-500" />
																	{/if}
																</div>
															</td>

															<!-- Life Cycle Column -->
															<td class="py-3">
																<span
																	class="badge badge-sm {lifeCycle.strength >= 8
																		? 'badge-success'
																		: lifeCycle.strength >= 5
																			? 'badge-warning'
																			: 'badge-error'}"
																>
																	{lifeCycle.name}
																</span>
															</td>

															<!-- Score Column -->
															<td class="py-3">
																<div class="flex min-w-[100px] flex-col gap-1">
																	<div class="flex items-center justify-between text-xs">
																		<span
																			class="font-mono font-bold {node.currentScore >=
																			node.baseScore
																				? 'text-success'
																				: 'text-warning'}"
																		>
																			{formatScore(node.currentScore)}
																		</span>
																		{#if Math.abs(scoreDiff) > 0.01}
																			<span
																				class="font-mono text-[10px] {scoreDiff > 0
																					? 'text-success'
																					: 'text-error'}"
																			>
																				({formatSign(scoreDiff)})
																			</span>
																		{/if}
																	</div>
																	<div class="bg-base-300 h-2 w-full overflow-hidden rounded-full">
																		<div
																			class="h-full rounded-full transition-all duration-500
																			{node.currentScore >= node.baseScore ? 'bg-success' : 'bg-warning'}"
																			style="width: {getScoreBarWidth(node.currentScore)}%"
																		></div>
																	</div>
																	<div class="flex justify-between text-[9px] opacity-40">
																		<span>Gốc: {formatScore(node.baseScore)}</span>
																		<span>{Math.round(getScoreBarWidth(node.currentScore))}%</span>
																	</div>
																</div>
															</td>

															<!-- Modifications Column -->
															<td class="py-3">
																{#if significantMods.length > 0}
																	<div class="flex max-w-[280px] flex-col gap-1">
																		{#each significantMods.slice(0, 3) as mod}
																			<div class="flex items-center gap-1.5 text-[11px]">
																				<span
																					class="inline-flex w-12 items-center justify-center rounded px-1 py-0.5 font-mono font-bold
																					{mod.valueChange > 0 ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}"
																				>
																					{formatSign(mod.valueChange)}
																				</span>
																				<ArrowRight class="h-3 w-3 flex-shrink-0 opacity-30" />
																				<span class="truncate opacity-70">{mod.reason}</span>
																			</div>
																		{/each}
																		{#if significantMods.length > 3}
																			<span class="text-[10px] italic opacity-50">
																				+{significantMods.length - 3} biến động khác...
																			</span>
																		{/if}
																	</div>
																{:else}
																	<span class="text-[10px] italic opacity-30">Không đổi</span>
																{/if}
															</td>
														</tr>
													{/each}
												{/each}
											</tbody>
										</table>
									</div>

									<!-- Summary Footer -->
									<footer class="border-base-200 bg-base-50 border-t px-5 py-3">
										<div class="flex flex-wrap items-center justify-between gap-4 text-xs">
											<div class="flex items-center gap-4">
												<div class="flex items-center gap-2">
													<span class="bg-success inline-block h-2.5 w-2.5 rounded-full"></span>
													<span class="opacity-60">Điểm tăng</span>
												</div>
												<div class="flex items-center gap-2">
													<span class="bg-warning inline-block h-2.5 w-2.5 rounded-full"></span>
													<span class="opacity-60">Điểm giảm</span>
												</div>
												<div class="flex items-center gap-2">
													<span class="badge badge-error badge-xs">Tuyệt</span>
													<span class="opacity-60">Khí tuyệt</span>
												</div>
											</div>
											<p class="text-[10px] italic opacity-50">
												Điểm lực thể hiện sức mạnh của mỗi Thần trong lá số.
											</p>
										</div>
									</footer>
								{/if}
							</div>
						</section>
					{/if}
				</div>

				<!-- ========== RIGHT COLUMN: Sidebar ========== -->
				<aside class="space-y-6 lg:col-span-4">
					<!-- Limit Scores -->
					{#if baziProfile.limit_score}
						{@const ls = baziProfile.limit_score}
						<section
							class="card border-base-200 bg-base-100 border shadow-lg"
							aria-labelledby="limit-heading"
						>
							<div class="card-body p-5">
								<h3 id="limit-heading" class="mb-4 flex items-center gap-2 text-base font-bold">
									<AlertTriangle class="text-warning h-4 w-4" aria-hidden="true" />
									Hệ Thống Điểm Hạn
								</h3>

								<div class="space-y-4">
									<!-- Dụng Thần -->
									<div class="border-success/20 bg-success/10 rounded-lg border p-3">
										<div
											class="text-success mb-2 flex items-center gap-1 text-xs font-bold uppercase"
										>
											<CheckCircle2 class="h-3 w-3" aria-hidden="true" />
											Dụng Thần (-1.0)
										</div>
										<div class="flex flex-wrap gap-1" role="list">
											{#each ls.dungThan as el}
												{@render elementTag(el)}
											{/each}
											{#if ls.dungThan.length === 0}
												<span class="text-[10px] opacity-40">Không có</span>
											{/if}
										</div>
									</div>

									<!-- Hỷ Thần -->
									<div class="border-info/20 bg-info/10 rounded-lg border p-3">
										<div class="text-info mb-2 flex items-center gap-1 text-xs font-bold uppercase">
											<Info class="h-3 w-3" aria-hidden="true" />
											Hỷ Thần (-0.5)
										</div>
										<div class="flex flex-wrap gap-1" role="list">
											{#if ls.hyThan.length > 0}
												{#each ls.hyThan as el}
													{@render elementTag(el)}
												{/each}
											{:else}
												<span class="text-[10px] opacity-40">Không có</span>
											{/if}
										</div>
									</div>

									<!-- Kỵ / Hung Thần -->
									<div class="border-error/20 bg-error/10 rounded-lg border p-3">
										<div
											class="text-error mb-2 flex items-center gap-1 text-xs font-bold uppercase"
										>
											<XCircle class="h-3 w-3" aria-hidden="true" />
											Kỵ / Hung Thần (+0.5 ~ +1.0)
										</div>
										<div class="flex flex-wrap gap-1" role="list">
											{#each [...ls.kyThan, ...ls.hungThan] as el}
												{@render elementTag(el)}
											{/each}
											{#if ls.kyThan.length === 0 && ls.hungThan.length === 0}
												<span class="text-[10px] opacity-40">Không có</span>
											{/if}
										</div>
									</div>
								</div>

								<div class="divider my-2 text-[10px] opacity-30">Tổng Hợp</div>

								<div
									class="grid grid-cols-5 gap-1 text-center"
									role="list"
									aria-label="Điểm theo ngũ hành"
								>
									{#each Object.entries(ls.scores) as [el, sc]}
										<div class="border-base-200 bg-base-50 rounded border p-1.5">
											<div class="text-[9px] font-bold opacity-60">{el}</div>
											<div
												class="font-mono text-xs font-bold {sc > 0
													? 'text-error'
													: sc < 0
														? 'text-success'
														: 'opacity-30'}"
											>
												{sc > 0 ? '+' : ''}{sc}
											</div>
										</div>
									{/each}
								</div>
							</div>
						</section>
					{/if}

					<!-- Audit Log -->
					<section
						class="card border-base-200 bg-base-100 flex flex-col border shadow-sm"
						aria-labelledby="audit-heading"
					>
						<header
							class="border-base-200 bg-base-200/50 flex items-center justify-between border-b px-4 py-2"
						>
							<span id="audit-heading" class="text-xs font-bold uppercase opacity-60">
								Nhật ký phân tích
							</span>
							<button
								class="btn btn-ghost btn-xs print:hidden"
								onclick={() => (isAuditExpanded = !isAuditExpanded)}
								aria-expanded={isAuditExpanded}
								aria-controls="audit-content"
							>
								{isAuditExpanded ? 'Thu gọn' : 'Mở rộng'}
							</button>
						</header>

						{#if isAuditExpanded}
							<div class="border-base-200 border-b p-3">
								<label class="relative block">
									<span class="sr-only">Tìm kiếm trong log</span>
									<Search
										class="absolute top-1/2 left-3 h-3 w-3 -translate-y-1/2 opacity-50"
										aria-hidden="true"
									/>
									<input
										type="search"
										placeholder="Tìm kiếm trong log..."
										class="input input-bordered input-sm w-full pl-9"
										bind:value={auditSearchTerm}
									/>
								</label>
							</div>
						{/if}

						<div
							id="audit-content"
							class="flex-1 space-y-1.5 overflow-y-auto p-4 font-mono text-[10px] {isAuditExpanded
								? 'max-h-[600px]'
								: 'max-h-[300px]'}"
							role="log"
							aria-live="polite"
						>
							{#each filteredAuditLogs as log, i (i)}
								{@const isConclusion = log.includes('KẾT LUẬN')}
								{@const isHeader = log.includes('>>')}
								{@const isHighlighted =
									auditSearchTerm && log.toLowerCase().includes(auditSearchTerm.toLowerCase())}
								<div
									class="transition-opacity
										{isConclusion
										? 'border-primary bg-primary/10 text-primary rounded-lg border-l-4 p-2 font-bold'
										: ''}
										{isHeader ? 'text-secondary mt-2 font-semibold' : 'opacity-70 hover:opacity-100'}
										{isHighlighted ? 'bg-warning/20' : ''}"
								>
									{log}
								</div>
							{/each}
							{#if filteredAuditLogs.length === 0}
								<div class="py-8 text-center opacity-50">
									{auditSearchTerm ? 'Không tìm thấy kết quả' : 'Không có log'}
								</div>
							{/if}
						</div>
					</section>

					<!-- Action Buttons -->
					<div class="flex flex-col gap-2 print:hidden">
						<button
							class="btn btn-outline w-full gap-2"
							onclick={() => scrollToElement('bazi-form')}
						>
							<User class="h-4 w-4" aria-hidden="true" />
							Nhập lại thông tin
						</button>
						<div class="flex gap-2">
							<button class="btn btn-outline flex-1 gap-2" onclick={handlePrint}>
								<Printer class="h-4 w-4" aria-hidden="true" />
								In/Xuất
							</button>
							<button class="btn btn-outline flex-1 gap-2" onclick={handleShare}>
								<Share2 class="h-4 w-4" aria-hidden="true" />
								Chia sẻ
							</button>
						</div>
					</div>
				</aside>
			</main>
		{:else}
			{@render emptyState()}
		{/if}

		<!-- ==================== INPUT FORM ==================== -->
		<section
			id="bazi-form"
			class="card border-base-200 bg-base-100 mx-auto mt-12 max-w-2xl border shadow-xl"
			aria-labelledby="form-heading"
		>
			<div class="card-body">
				<h3 id="form-heading" class="card-title border-base-200 mb-4 border-b pb-3 text-lg">
					<Calendar class="text-primary h-5 w-5" aria-hidden="true" />
					Nhập Thông Tin (Dương Lịch)
				</h3>

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
					class="space-y-4"
				>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<!-- Name -->
						<div class="form-control">
							<label class="label text-xs font-bold" for="profile_name">
								<span class="label-text">
									Họ và tên <span class="text-error" aria-hidden="true">*</span>
								</span>
							</label>
							<input
								id="profile_name"
								name="profile_name"
								type="text"
								class="input input-bordered"
								bind:value={formData.profile_name}
								required
								minlength={2}
								maxlength={100}
								placeholder="Nhập họ tên..."
								autocomplete="name"
							/>
						</div>

						<!-- Gender -->
						<fieldset class="form-control">
							<legend class="label text-xs font-bold">
								<span class="label-text">
									Giới tính <span class="text-error" aria-hidden="true">*</span>
								</span>
							</legend>
							<div class="join w-full">
								<input
									class="btn join-item flex-1"
									type="radio"
									name="gender"
									value="male"
									aria-label="Nam"
									bind:group={formData.gender}
								/>
								<input
									class="btn join-item flex-1"
									type="radio"
									name="gender"
									value="female"
									aria-label="Nữ"
									bind:group={formData.gender}
								/>
							</div>
						</fieldset>

						<!-- Birth Date -->
						<div class="form-control">
							<label class="label text-xs font-bold" for="birth_date">
								<span class="label-text">
									Ngày sinh <span class="text-error" aria-hidden="true">*</span>
								</span>
							</label>
							<input
								id="birth_date"
								name="birth_date"
								type="date"
								max={todayISO}
								min="1900-01-01"
								class="input input-bordered"
								bind:value={formData.birth_date}
								required
							/>
						</div>

						<!-- Birth Time -->
						<div class="form-control">
							<label class="label text-xs font-bold" for="birth_time">
								<span class="label-text">
									Giờ sinh <span class="text-error" aria-hidden="true">*</span>
								</span>
							</label>
							<input
								id="birth_time"
								name="birth_time"
								type="time"
								class="input input-bordered"
								bind:value={formData.birth_time}
								required
							/>
						</div>
					</div>

					<div class="flex justify-end pt-4">
						<button
							type="submit"
							class="btn btn-primary w-full gap-2 md:w-auto"
							disabled={loading}
							aria-busy={loading}
						>
							{#if loading}
								<span class="loading loading-spinner" aria-hidden="true"></span>
								Đang tính toán...
							{:else}
								<Save class="h-4 w-4" aria-hidden="true" />
								Phân Tích & Lưu
							{/if}
						</button>
					</div>
				</form>
			</div>
		</section>

		<!-- ==================== FOOTER ==================== -->
		<footer
			class="text-base-content/50 mt-8 px-2 pb-6 text-center text-[10px] leading-relaxed sm:text-xs"
		>
			<p class="mb-2">Kết quả chỉ mang tính chất tham khảo, không phải là luận đoán chuyên môn.</p>
			<p>
				Hệ thống tính toán tham khảo phương pháp của sách Trích Thiên tuỷ bình chú, Dự đoán theo tứ
				trụ (Triệu Vĩ Hoa), đặc biệt là
				<a
					href="https://lyso.vn/tu-tru/vulong-tu-tru-cho-tat-ca-moi-nguoi-t38496/"
					class="hover:text-base-content underline transition-colors"
					target="_blank"
					rel="noopener noreferrer"
				>
					các bài viết của tác giả VuLong
				</a>
			</p>
		</footer>
	</div>
</div>

<!-- ============================================================ -->
<!-- STYLES -->
<!-- ============================================================ -->
<style>
	/* Pillar card transition */
	.pillar-card {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Screen reader only utility */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* Print styles */
	@media print {
		:global(header),
		:global(.print\:hidden) {
			display: none !important;
		}

		:global(.card) {
			page-break-inside: avoid;
			box-shadow: none !important;
			border: 1px solid #e5e7eb !important;
		}

		:global(body) {
			font-size: 12px;
		}

		:global(.badge) {
			border: 1px solid currentColor;
		}
	}
</style>
