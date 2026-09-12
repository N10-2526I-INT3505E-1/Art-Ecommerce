<!-- src/routes/bazi/+page.svelte -->
<script lang="ts">
	import {
		Activity,
		AlertTriangle,
		ArrowRight,
		Award,
		Calendar,
		Check,
		CheckCircle2,
		ChevronDown,
		ChevronRight,
		ChevronUp,
		Clock,
		Coins,
		Compass,
		Copy,
		Droplets,
		FileText,
		Flame,
		Info,
		Layers,
		Lock,
		MapPin,
		Maximize2,
		Mountain,
		Printer,
		RefreshCw,
		Save,
		Scale,
		Search,
		Share2,
		Shield,
		ShieldAlert,
		Sparkles,
		Star,
		Trees,
		TrendingUp,
		User,
		X,
		XCircle,
		Zap,
	} from 'lucide-svelte';
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { toastStore, showToast } from '$lib/toastStore';

	const { data, form } = $props();

	// ============================================================
	// TYPE DEFINITIONS (VULONG ENGINE v4)
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
		type: 'Stem' | 'Branch';
		branchOwner?: string;
		mainStem?: string;
		baseScore: number;
		currentScore: number;
		lifeCycleStage: string;
		isBlocked: boolean;
		isActionLocked: boolean;
		isCombined?: boolean;
		transformTo?: string;
		modifications: EnergyModification[];
	}

	interface LimitScoreProfile {
		pattern: string;
		dungThan: string[];
		hyThan: string[];
		kyThan: string[];
		hungThan: string[];
		scores: Record<string, number>;
	}

	interface CenterAnalysis {
		dayMasterScore: number;
		selfElement: string;
		elementScores: Record<string, number>;
		locScore: number;
		partyScore: number;
		enemyScore: number;
		maxEnemyElement: string;
		maxEnemyScore: number;
		diffScore: number;
		isVwang: boolean;
		isStrongVwang: boolean;
		isWeakVwang: boolean;
	}

	type InteractionType = 'TamHoi' | 'TamHop' | 'LucHop' | 'LucXung' | 'CanHop';

	interface Interaction {
		type: InteractionType;
		participants: string[];
		result: string;
		score?: number;
		description?: string;
	}

	export type AuditLogItemType =
		| 'init'
		| 'interaction'
		| 'overcome'
		| 'strike'
		| 'flow'
		| 'decay'
		| 'center'
		| 'structure'
		| 'pattern'
		| 'dungthan'
		| 'shensha'
		| 'conclusion';

	export type AuditLogLevel =
		| 'info'
		| 'success'
		| 'good'
		| 'warning'
		| 'error'
		| 'danger'
		| 'accent'
		| 'neutral';

	export interface AuditLogItem {
		type: AuditLogItemType;
		level: AuditLogLevel;
		title: string;
		content: string;
		tag?: string;
		pillar?: string;
		scoreChange?: number;
		currentScore?: number;
		metadata?: Record<string, any>;
	}

	export interface AuditLogSection {
		step: number;
		name: string;
		badge: string;
		description?: string;
		items: AuditLogItem[];
	}

	interface BaziProfileUI {
		id?: string;
		user_id?: string;
		profile_name: string;
		gender: 'male' | 'female';
		birth_day: number;
		birth_month: number;
		birth_year: number;
		birth_hour: number;
		birth_minute: number;
		longitude?: number | null;
		timezone_offset?: number | null;

		year_stem?: string;
		year_branch?: string;
		month_stem?: string;
		month_branch?: string;
		day_stem?: string;
		day_branch?: string;
		hour_stem?: string;
		hour_branch?: string;

		day_master_status?: string | null;
		structure_type?: string | null;
		structure_name?: string | null;
		analysis_reason?: string | null;
		shen_sha?: string[] | null;

		center_analysis?: CenterAnalysis;
		energy_flow?: EnergyNode[];
		limit_score?: LimitScoreProfile;
		interactions?: Interaction[];
		score_details?: AuditLogSection[] | null;
	}

	type ElementName = 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ';

	interface ElementStyle {
		name: ElementName;
		color: string;
		text: string;
		border: string;
		bgSoft: string;
		bgGradient: string;
		hex: string;
	}

	// ============================================================
	// CONSTANTS & CITY PRESETS
	// ============================================================
	const CITY_PRESETS = [
		{ name: 'Hà Nội (105.85°Đ)', longitude: 105.85 },
		{ name: 'TP. Hồ Chí Minh (106.63°Đ)', longitude: 106.63 },
		{ name: 'Đà Nẵng (108.20°Đ)', longitude: 108.2 },
		{ name: 'Hải Phòng (106.68°Đ)', longitude: 106.68 },
		{ name: 'Cần Thơ (105.78°Đ)', longitude: 105.78 },
		{ name: 'Huế (107.59°Đ)', longitude: 107.59 },
		{ name: 'Nha Trang (109.19°Đ)', longitude: 109.19 },
		{ name: 'Khác / Tùy chỉnh', longitude: 0 },
	] as const;

	const ELEMENT_DETAILS: Record<ElementName, ElementStyle> = {
		Kim: {
			name: 'Kim',
			color: 'bg-slate-500',
			text: 'text-slate-600 dark:text-slate-300',
			border: 'border-slate-300 dark:border-slate-600',
			bgSoft: 'bg-slate-100 dark:bg-slate-800/80',
			bgGradient: 'from-slate-500/20 to-slate-400/5',
			hex: '#64748b',
		},
		Mộc: {
			name: 'Mộc',
			color: 'bg-emerald-600',
			text: 'text-emerald-700 dark:text-emerald-300',
			border: 'border-emerald-300 dark:border-emerald-700',
			bgSoft: 'bg-emerald-50 dark:bg-emerald-950/40',
			bgGradient: 'from-emerald-600/20 to-emerald-500/5',
			hex: '#059669',
		},
		Thủy: {
			name: 'Thủy',
			color: 'bg-sky-600',
			text: 'text-sky-700 dark:text-sky-300',
			border: 'border-sky-300 dark:border-sky-700',
			bgSoft: 'bg-sky-50 dark:bg-sky-950/40',
			bgGradient: 'from-sky-600/20 to-sky-500/5',
			hex: '#0284c7',
		},
		Hỏa: {
			name: 'Hỏa',
			color: 'bg-rose-600',
			text: 'text-rose-700 dark:text-rose-300',
			border: 'border-rose-300 dark:border-rose-700',
			bgSoft: 'bg-rose-50 dark:bg-rose-950/40',
			bgGradient: 'from-rose-600/20 to-rose-500/5',
			hex: '#e11d48',
		},
		Thổ: {
			name: 'Thổ',
			color: 'bg-amber-600',
			text: 'text-amber-800 dark:text-amber-300',
			border: 'border-amber-300 dark:border-amber-700',
			bgSoft: 'bg-amber-50 dark:bg-amber-950/40',
			bgGradient: 'from-amber-600/20 to-amber-500/5',
			hex: '#d97706',
		},
	};

	const DEFAULT_ELEMENT_STYLE: ElementStyle = {
		name: 'Kim',
		color: 'bg-gray-500',
		text: 'text-gray-600 dark:text-gray-400',
		border: 'border-gray-200 dark:border-gray-700',
		bgSoft: 'bg-gray-50 dark:bg-gray-900',
		bgGradient: 'from-gray-500/10 to-gray-500/5',
		hex: '#6b7280',
	};

	const SOURCE_MAP: Record<string, string> = {
		Year: 'Năm',
		Month: 'Tháng',
		Day: 'Ngày',
		Hour: 'Giờ',
	};

	const PILLAR_ORDER: Array<'Hour' | 'Day' | 'Month' | 'Year'> = ['Hour', 'Day', 'Month', 'Year'];

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
	};

	const INTERACTION_TYPE_LABELS: Record<
		InteractionType,
		{ name: string; desc: string; color: string }
	> = {
		TamHoi: { name: 'Tam Hội', desc: 'Phương hội tam chi, khí thế toàn cục cực vượng', color: 'badge-primary' },
		TamHop: { name: 'Tam Hợp', desc: 'Tam hợp cục, kết nối biến chuyển ngũ hành mới', color: 'badge-secondary' },
		LucHop: { name: 'Lục Hợp', desc: 'Lục hợp tương thân, gắn kết chặt chẽ', color: 'badge-accent' },
		LucXung: { name: 'Lục Xung', desc: 'Xung đối trực diện, suy giảm khí lực 2 bên', color: 'badge-error' },
		CanHop: { name: 'Can Hợp', desc: 'Thiên can tương hợp hữu tình', color: 'badge-info' },
	};

	const SHEN_SHA_CONFIG: Record<
		string,
		{ title: string; desc: string; badge: string; iconBg: string; textClass: string }
	> = {
		'Thiên Ất Quý Nhân': {
			title: 'Thiên Ất Quý Nhân',
			desc: 'Đệ nhất Cát Thần, giải trừ hoạn nạn, gặp nguy hóa an, được quý nhân nâng đỡ.',
			badge: 'badge-warning',
			iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
			textClass: 'text-amber-700 dark:text-amber-300',
		},
		'Văn Xương': {
			title: 'Văn Xương Quý Nhân',
			desc: 'Chủ về trí tuệ mẫn tiệp, văn chương cái thế, thi cử đỗ đạt, công danh rực rỡ.',
			badge: 'badge-info',
			iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
			textClass: 'text-sky-700 dark:text-sky-300',
		},
		'Dịch Mã': {
			title: 'Dịch Mã',
			desc: 'Chủ về sự năng động, đi xa, xuất ngoại, thăng tiến chức vụ và biến đổi nhanh nhẹn.',
			badge: 'badge-success',
			iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
			textClass: 'text-emerald-700 dark:text-emerald-300',
		},
		'Đào Hoa': {
			title: 'Đào Hoa / Hàm Trì',
			desc: 'Chủ về sức hút cá nhân, phong thái tao nhã, tình cảm duyên dáng và tài hoa nghệ thuật.',
			badge: 'badge-secondary',
			iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
			textClass: 'text-rose-700 dark:text-rose-300',
		},
	};

	// ============================================================
	// UTILITIES
	// ============================================================
	function getElementStyle(el: string): ElementStyle {
		return ELEMENT_DETAILS[el as ElementName] ?? { ...DEFAULT_ELEMENT_STYLE, name: el as any };
	}

	function formatScore(val: number | undefined | null): string {
		return (val ?? 0).toFixed(2);
	}

	function formatSign(val: number | undefined | null): string {
		const num = val ?? 0;
		return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
	}

	function padZero(num: number | undefined, length = 2): string {
		return String(num ?? 0).padStart(length, '0');
	}

	function formatBirthDate(profile: BaziProfileUI): string {
		const { birth_day, birth_month, birth_year, birth_hour, birth_minute } = profile;
		if (!birth_day || !birth_month || !birth_year) return '';
		return `${padZero(birth_day)}/${padZero(birth_month)}/${birth_year} lúc ${padZero(birth_hour)}:${padZero(birth_minute)}`;
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

	function getShenShaDetails(rawName: string) {
		for (const [key, conf] of Object.entries(SHEN_SHA_CONFIG)) {
			if (rawName.includes(key)) {
				return { ...conf, fullName: rawName };
			}
		}
		return {
			title: rawName,
			desc: 'Thần sát tương trợ cát hung cho lá số.',
			badge: 'badge-ghost',
			iconBg: 'bg-primary/10 text-primary',
			textClass: 'text-base-content',
			fullName: rawName,
		};
	}

	function getLevelBadgeClass(level: AuditLogLevel): { badge: string; bg: string; text: string; label: string } {
		switch (level) {
			case 'good':
			case 'success':
				return {
					badge: 'badge-success',
					bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
					text: 'text-emerald-700 dark:text-emerald-300',
					label: 'Cát Lợi',
				};
			case 'danger':
			case 'error':
				return {
					badge: 'badge-error',
					bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
					text: 'text-rose-700 dark:text-rose-300',
					label: 'Hung Sát / Khóa',
				};
			case 'warning':
				return {
					badge: 'badge-warning',
					bg: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20',
					text: 'text-amber-700 dark:text-amber-300',
					label: 'Kỵ / Hao',
				};
			case 'accent':
				return {
					badge: 'badge-secondary',
					bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
					text: 'text-purple-700 dark:text-purple-300',
					label: 'Trọng Tâm',
				};
			case 'neutral':
				return {
					badge: 'badge-ghost',
					bg: 'bg-base-200 text-base-content/70 border-base-300',
					text: 'text-base-content/70',
					label: 'Bình Hòa',
				};
			case 'info':
			default:
				return {
					badge: 'badge-info',
					bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
					text: 'text-sky-700 dark:text-sky-300',
					label: 'Thông Tin',
				};
		}
	}

	function getStepBadgeColor(step: number): string {
		switch (step) {
			case 1:
				return 'badge-neutral';
			case 2:
				return 'badge-secondary';
			case 3:
				return 'badge-error';
			case 4:
				return 'badge-success';
			case 5:
				return 'badge-primary';
			case 6:
				return 'badge-accent';
			case 7:
				return 'badge-warning';
			case 8:
				return 'badge-info';
			default:
				return 'badge-ghost';
		}
	}

	function parseRawLogsToSections(logs: string[]): AuditLogSection[] {
		const stepDefinitions: Record<number, { name: string; badge: string; desc: string }> = {
			1: {
				name: 'Khởi Tạo 8 Chữ & Điểm Lệnh Tháng',
				badge: 'Khởi Tạo',
				desc: 'Xác định 8 chữ chính và trạng thái 12 cung Trường Sinh tại Lệnh Tháng',
			},
			2: {
				name: 'Tương Tác Hóa Hợp, Trói & Xung',
				badge: 'Hóa Hợp',
				desc: 'Xét Tam Hội, Tam Hợp, Bán Hợp, Lục Hợp, Lục Xung và Can Hợp',
			},
			3: {
				name: 'Vật Lý Khoảng Cách - Khắc Toàn Lưới',
				badge: 'Khắc Sát',
				desc: 'Sát thương ngũ hành theo khoảng cách và khóa hành động theo nguyên lý Vũ Long',
			},
			4: {
				name: 'Dòng Chảy Can Chi Nội Bộ',
				badge: 'Tương Sinh',
				desc: 'Can Chi cùng trụ tương sinh, chuyển giao năng lượng nội bộ',
			},
			5: {
				name: 'Hội Tụ Vùng Tâm & Cường Nhược',
				badge: 'Vùng Tâm',
				desc: 'Hệ số suy hao khoảng cách, điểm Đắc Địa Lộc/Kình, và so sánh Thân vs Kẻ thù',
			},
			6: {
				name: 'Xác Định Cách Cục',
				badge: 'Cách Cục',
				desc: 'Phân loại Nội Cách hoặc Ngoại Cách (Tòng Cách) dựa trên thế lực toàn cục',
			},
			7: {
				name: 'Định Dụng Thần 5 Mẫu Vũ Long',
				badge: 'Dụng Thần',
				desc: 'Lựa chọn Dụng Thần, Hỷ Thần, Kỵ Thần, Hung Thần và bảng ma trận điểm hạn',
			},
			8: {
				name: 'Thần Sát Cát Hung',
				badge: 'Thần Sát',
				desc: 'Tra cứu Thiên Ất Quý Nhân, Văn Xương, Dịch Mã, Đào Hoa',
			},
		};

		const sections: AuditLogSection[] = [1, 2, 3, 4, 5, 6, 7, 8].map((step) => ({
			step,
			name: stepDefinitions[step].name,
			badge: stepDefinitions[step].badge,
			description: stepDefinitions[step].desc,
			items: [],
		}));

		let currentStep = 1;

		for (const rawLine of logs) {
			const line = rawLine.trim();
			if (!line) continue;

			if (line.includes('KHỞI TẠO 8 CHỮ')) currentStep = 1;
			else if (line.includes('BƯỚC 2') || line.includes('TƯƠNG TÁC HÓA HỢP')) currentStep = 2;
			else if (line.includes('BƯỚC 3') || line.includes('VẬT LÝ KHOẢNG CÁCH')) currentStep = 3;
			else if (line.includes('BƯỚC 4') || line.includes('DÒNG CHẢY NỘI BỘ')) currentStep = 4;
			else if (line.includes('BƯỚC 5') || line.includes('TẬP TRUNG VÙNG TÂM') || line.includes('VÙNG TÂM'))
				currentStep = 5;
			else if (line.includes('BƯỚC 6') || line.includes('XÁC ĐỊNH CÁCH CỤC')) currentStep = 6;
			else if (line.includes('BƯỚC 7') || line.includes('ĐỊNH DỤNG THẦN')) currentStep = 7;
			else if (line.includes('BƯỚC 8') || line.includes('THẦN SÁT')) currentStep = 8;

			if (line.startsWith('---') || line.startsWith('===') || line.includes('BẮT ĐẦU PHÂN TÍCH')) continue;

			const sec = sections[currentStep - 1];
			if (!sec) continue;

			let level: AuditLogLevel = 'info';
			let type: AuditLogItemType = 'init';
			let tag = sec.badge;
			let title = line;
			let content = '';
			let scoreChange: number | undefined;

			if (currentStep === 1) {
				type = 'init';
				level = 'info';
				if (line.includes('Trụ')) {
					const parts = line.replace(/^\*\s*/, '').split(':');
					title = parts[0] ? parts[0].trim() : line;
					content = parts.slice(1).join(':').trim();
				}
			} else if (currentStep === 2) {
				type = 'interaction';
				level = line.includes('Xung') ? 'warning' : 'accent';
				const parts = line.replace(/^\*\s*/, '').split(':');
				title = parts[0] ? parts[0].trim() : 'Tương tác';
				content = parts.slice(1).join(':').trim();
			} else if (currentStep === 3) {
				type = 'strike';
				if (line.includes('BỊ KHÓA') || line.includes('Khí tuyệt')) {
					level = 'danger';
					title = 'Khóa Hành Động';
					content = line.replace(/^\*\s*/, '');
				} else {
					level = 'warning';
					title = 'Khắc Sát Khoảng Cách';
					content = line.replace(/^\*\s*/, '');
				}
			} else if (currentStep === 4) {
				type = 'flow';
				level = 'good';
				title = 'Can Chi Tương Sinh';
				content = line.replace(/^\*\s*/, '');
			} else if (currentStep === 5) {
				type = 'center';
				if (line.startsWith('>>') || line.includes('KẾT LUẬN')) {
					level = 'accent';
					title = 'Kết Luận Cường Nhược';
					content = line.replace(/^>>\s*/, '');
				} else {
					level = 'info';
					title = 'Điểm Vùng Tâm';
					content = line.replace(/^\*\s*/, '');
				}
			} else if (currentStep === 6) {
				type = 'structure';
				level = 'accent';
				title = 'Cách Cục Mệnh';
				content = line.replace(/^(=>|>>|\*)\s*/, '');
			} else if (currentStep === 7) {
				type = 'dungthan';
				if (line.includes('Dụng Thần (-1.0)')) {
					level = 'good';
					tag = 'Dụng Thần';
					title = 'Dụng Thần Cốt Lõi';
					content = line;
					scoreChange = -1.0;
				} else if (line.includes('Hỷ Thần (-0.5)')) {
					level = 'good';
					tag = 'Hỷ Thần';
					title = 'Hỷ Thần Trợ Vận';
					content = line;
					scoreChange = -0.5;
				} else if (line.includes('Kỵ Thần (+0.5)')) {
					level = 'warning';
					tag = 'Kỵ Thần';
					title = 'Kỵ Thần Hao Tổn';
					content = line;
					scoreChange = 0.5;
				} else if (line.includes('Hung Thần (+1.0)')) {
					level = 'danger';
					tag = 'Hung Thần';
					title = 'Hung Thần Công Phá';
					content = line;
					scoreChange = 1.0;
				} else if (line.includes('DỤNG THẦN CHÍNH')) {
					level = 'accent';
					tag = 'Định Danh';
					title = 'Dụng Thần Đắc Lực Nhất';
					content = line.replace(/^>>\s*/, '');
				} else {
					level = 'info';
					title = 'Quy Tắc Định Dụng';
					content = line;
				}
			} else if (currentStep === 8) {
				type = 'shensha';
				level = line.includes('Quý Nhân') || line.includes('Văn Xương') ? 'good' : 'accent';
				tag = 'Thần Sát';
				title = line.replace(/^\*\s*/, '');
				content = 'Thần sát phù trợ chiếu mệnh';
			}

			sec.items.push({
				type,
				level,
				title: title || line,
				content: content || line,
				tag,
				scoreChange,
			});
		}

		return sections;
	}

	// ============================================================
	// STATE (SVELTE 5 RUNES)
	// ============================================================
	let loading = $state(false);
	let baziProfile = $state<BaziProfileUI | null>((data.baziProfile as BaziProfileUI) ?? null);
	let auditSearchTerm = $state('');
	let isAuditExpanded = $state(false);
	let showEnergyTable = $state(true);
	let selectedCityIdx = $state(0);
	let customLongitude = $state('105.85');

	// Structured Audit Logs state
	let showAuditModal = $state(false);
	let auditActiveStep = $state<number | 'all'>('all');
	let auditLevelFilter = $state<string>('all');
	let isRawLogMode = $state(false);
	let copiedLog = $state(false);
	let expandedSteps = $state<Record<number, boolean>>({
		1: false,
		2: false,
		3: true,
		4: false,
		5: true,
		6: true,
		7: true,
		8: false,
	});

	function toggleStep(step: number) {
		expandedSteps[step] = !expandedSteps[step];
	}

	function expandAllSteps() {
		expandedSteps = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true };
	}

	function collapseAllSteps() {
		expandedSteps = { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false };
	}

	function copyAllLogs() {
		if (!browser) return;
		const text = baziProfile?.analysis_reason || auditLogs.join('\n');
		navigator.clipboard.writeText(text).then(() => {
			copiedLog = true;
			showToast({ message: 'Đã sao chép toàn bộ nhật ký luận đoán!', type: 'success' });
			setTimeout(() => {
				copiedLog = false;
			}, 2500);
		});
	}

	// Form state
	let formData = $state({
		profile_name: `${data.user?.first_name ?? ''} ${data.user?.last_name ?? ''}`.trim() || 'Người dùng',
		gender: 'male',
		birth_date: '',
		birth_time: '',
		longitude: 105.85,
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

	const auditSections = $derived.by<AuditLogSection[]>(() => {
		if (
			baziProfile?.score_details &&
			Array.isArray(baziProfile.score_details) &&
			baziProfile.score_details.length > 0
		) {
			return baziProfile.score_details;
		}
		if (auditLogs.length > 0) {
			return parseRawLogsToSections(auditLogs);
		}
		return [];
	});

	const totalAuditItemsCount = $derived(
		auditSections.reduce((sum, s) => sum + (s.items?.length ?? 0), 0),
	);

	const filteredSections = $derived.by(() => {
		return auditSections
			.filter((sec) => auditActiveStep === 'all' || sec.step === auditActiveStep)
			.map((sec) => {
				const filteredItems = sec.items.filter((item) => {
					if (auditLevelFilter !== 'all' && item.level !== auditLevelFilter) {
						return false;
					}
					if (auditSearchTerm.trim()) {
						const q = auditSearchTerm.toLowerCase();
						const matchTitle = item.title?.toLowerCase().includes(q);
						const matchContent = item.content?.toLowerCase().includes(q);
						const matchTag = item.tag?.toLowerCase().includes(q);
						const matchPillar = item.pillar?.toLowerCase().includes(q);
						return matchTitle || matchContent || matchTag || matchPillar;
					}
					return true;
				});

				return {
					...sec,
					items: filteredItems,
				};
			})
			.filter((sec) => sec.items.length > 0 || !auditSearchTerm.trim());
	});

	const isDayMasterStrong = $derived(baziProfile?.center_analysis?.isVwang ?? false);
	const todayISO = $derived(new Date().toISOString().split('T')[0]);

	// Group energy nodes by pillar position for clean 8-character breakdown
	const pillarEnergyData = $derived.by(() => {
		if (!baziProfile?.energy_flow) return null;
		const nodes = baziProfile.energy_flow;
		const pillars: Record<
			string,
			{
				stem: EnergyNode | null;
				branch: EnergyNode | null;
				stemName: string;
				branchName: string;
			}
		> = {};

		for (const pos of PILLAR_ORDER) {
			const stem = nodes.find((n) => n.source === pos && n.type === 'Stem') || null;
			const branch = nodes.find((n) => n.source === pos && n.type === 'Branch') || null;

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
				branch,
				stemName: stemName ?? stem?.name ?? '',
				branchName: branchName ?? branch?.name ?? '',
			};
		}

		return pillars;
	});

	// 5-Element distribution in Center Zone
	const centerElementStats = $derived.by(() => {
		const ca = baziProfile?.center_analysis;
		if (!ca?.elementScores) return [];

		const scores = ca.elementScores;
		const total = Object.values(scores).reduce((acc, v) => acc + v, 0);

		return (['Mộc', 'Hỏa', 'Thổ', 'Kim', 'Thủy'] as ElementName[]).map((el) => {
			const score = scores[el] ?? 0;
			const pct = total > 0 ? (score / total) * 100 : 0;
			const isSelf = el === ca.selfElement;
			const isEnemy = el === ca.maxEnemyElement;

			return {
				element: el,
				score,
				percentage: pct,
				isSelf,
				isEnemy,
				style: getElementStyle(el),
			};
		});
	});

	// Vu Long Power Ratio: Thân vs Kẻ Thù Mạnh Nhất
	const vuLongComparison = $derived.by(() => {
		const ca = baziProfile?.center_analysis;
		if (!ca) return null;

		const party = ca.partyScore;
		const enemy = ca.maxEnemyScore;
		const total = party + enemy;
		const partyPct = total > 0 ? (party / total) * 100 : 50;
		const enemyPct = total > 0 ? (enemy / total) * 100 : 50;

		return {
			party,
			enemy,
			partyPct,
			enemyPct,
			diff: ca.diffScore,
			isVwang: ca.isVwang,
			locScore: ca.locScore,
			selfElement: ca.selfElement,
			maxEnemyElement: ca.maxEnemyElement,
		};
	});

	// ============================================================
	// ACTIONS & EFFECTS
	// ============================================================
	async function handleShare(): Promise<void> {
		if (!browser || !baziProfile) return;

		const shareData = {
			title: `Lá Số Bát Tự - ${baziProfile.profile_name}`,
			text: `Thân ${baziProfile.day_master_status} (${baziProfile.structure_name || ''}) - ${formattedBirthDate}`,
			url: window.location.href,
		};

		if (navigator.canShare?.(shareData)) {
			try {
				await navigator.share(shareData);
			} catch (err) {
				if ((err as Error).name !== 'AbortError') copyToClipboard();
			}
		} else {
			copyToClipboard();
		}
	}

	function copyToClipboard(): void {
		if (!browser) return;
		navigator.clipboard.writeText(window.location.href).then(() => {
			toastStore.trigger({
				message: 'Đã sao chép liên kết lá số!',
				background: 'variant-filled-success',
			});
		});
	}

	function handlePrint(): void {
		if (browser) window.print();
	}

	function onCityChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		const idx = parseInt(select.value, 10);
		selectedCityIdx = idx;
		if (idx < CITY_PRESETS.length - 1) {
			const lon = CITY_PRESETS[idx].longitude;
			customLongitude = lon.toString();
			formData.longitude = lon;
		}
	}

	function onCustomLongitudeChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const val = parseFloat(input.value);
		if (!isNaN(val) && val >= -180 && val <= 180) {
			formData.longitude = val;
		}
	}

	// Initialize / sync form state
	$effect(() => {
		if (baziProfile) {
			const { birth_year, birth_month, birth_day, birth_hour, birth_minute, longitude } = baziProfile;
			formData.birth_date = `${birth_year}-${padZero(birth_month)}-${padZero(birth_day)}`;
			formData.birth_time = `${padZero(birth_hour)}:${padZero(birth_minute)}`;
			formData.gender = baziProfile.gender ?? 'male';
			formData.profile_name = baziProfile.profile_name || formData.profile_name;
			if (longitude) {
				formData.longitude = longitude;
				customLongitude = longitude.toString();
				const matchIdx = CITY_PRESETS.findIndex((c) => Math.abs(c.longitude - longitude) < 0.05);
				selectedCityIdx = matchIdx !== -1 ? matchIdx : CITY_PRESETS.length - 1;
			}
		}
	});

	// Handle response from form submission
	$effect(() => {
		if (form?.success && form.baziProfile) {
			baziProfile = form.baziProfile as BaziProfileUI;
			toastStore.trigger({
				message: 'Lập lá số Bát Tự Vũ Long thành công!',
				background: 'variant-filled-success',
			});
			setTimeout(() => scrollToElement('bazi-overview'), 150);
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
		function handleKeydown(e: KeyboardEvent) {
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
<!-- SNIPPETS -->
<!-- ============================================================ -->

{#snippet elementBadge(element: string, size: 'sm' | 'md' = 'sm')}
	{@const style = getElementStyle(element)}
	<span
		class="inline-flex items-center gap-1 font-bold rounded border tracking-wider uppercase {style.bgSoft} {style.text} {style.border} {size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}"
	>
		{#if element === 'Kim'}
			<Coins class="h-3 w-3" />
		{:else if element === 'Mộc'}
			<Trees class="h-3 w-3" />
		{:else if element === 'Thủy'}
			<Droplets class="h-3 w-3" />
		{:else if element === 'Hỏa'}
			<Flame class="h-3 w-3" />
		{:else if element === 'Thổ'}
			<Mountain class="h-3 w-3" />
		{/if}
		{element}
	</span>
{/snippet}

{#snippet pillarCard(
	pos: 'Hour' | 'Day' | 'Month' | 'Year',
	title: string,
	subtitle: string,
	stemNode: EnergyNode | null,
	branchNode: EnergyNode | null,
	stemName: string,
	branchName: string,
	isDay = false,
)}
	{@const stemStage = stemNode ? LIFE_CYCLE_NAMES[stemNode.lifeCycleStage]?.name ?? stemNode.lifeCycleStage : '-'}
	{@const branchStage = branchNode ? LIFE_CYCLE_NAMES[branchNode.lifeCycleStage]?.name ?? branchNode.lifeCycleStage : '-'}
	{@const stemEl = stemNode?.transformTo || stemNode?.element || ''}
	{@const branchEl = branchNode?.transformTo || branchNode?.element || ''}
	{@const stemStyle = getElementStyle(stemEl)}
	{@const branchStyle = getElementStyle(branchEl)}

	<article
		class="relative overflow-hidden rounded-2xl border transition-all duration-300 group flex flex-col justify-between
		{isDay
			? 'border-primary/60 bg-gradient-to-b from-primary/10 via-base-100 to-base-100 ring-2 ring-primary/40 shadow-lg'
			: 'border-base-200/80 bg-base-100/80 hover:border-primary/30 hover:shadow-md'}"
	>
		{#if isDay}
			<div class="absolute -top-10 -right-10 w-24 h-24 bg-primary/15 rounded-full blur-xl pointer-events-none"></div>
			<div class="absolute top-2 right-2 flex items-center gap-1 bg-primary text-primary-content text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
				<Star class="w-2.5 h-2.5 fill-current" />
				Nhật Chủ
			</div>
		{/if}

		<!-- Pillar Header -->
		<header class="px-3 pt-3 pb-2 border-b border-base-200/60 flex items-center justify-between text-xs">
			<span class="font-bold tracking-wider uppercase opacity-70 text-[11px]">{title}</span>
			<span class="text-[10px] opacity-50 italic">{subtitle}</span>
		</header>

		<!-- Characters Box -->
		<div class="p-4 space-y-4 text-center">
			<!-- Thiên Can (Stem) -->
			<div class="p-2.5 rounded-xl border transition-transform group-hover:scale-[1.02] {stemStyle.bgSoft} {stemStyle.border}">
				<div class="flex items-center justify-between text-[10px] font-semibold opacity-60 mb-1">
					<span>Thiên Can</span>
					<span class="font-mono">{stemNode ? formatScore(stemNode.currentScore) : ''}</span>
				</div>
				<div class="font-heading text-3xl font-black {stemStyle.text} tracking-tight">
					{stemName || stemNode?.name || '-'}
				</div>
				<div class="mt-1.5 flex items-center justify-center gap-1.5 flex-wrap">
					{@render elementBadge(stemEl || 'Kim', 'sm')}
					<span class="text-[10px] font-medium opacity-75 badge badge-ghost badge-xs">{stemStage}</span>
				</div>
			</div>

			<!-- Địa Chi (Branch) -->
			<div class="p-2.5 rounded-xl border transition-transform group-hover:scale-[1.02] {branchStyle.bgSoft} {branchStyle.border}">
				<div class="flex items-center justify-between text-[10px] font-semibold opacity-60 mb-1">
					<span>Địa Chi</span>
					<span class="font-mono">{branchNode ? formatScore(branchNode.currentScore) : ''}</span>
				</div>
				<div class="font-heading text-3xl font-black {branchStyle.text} tracking-tight">
					{branchName || branchNode?.name || '-'}
				</div>
				<div class="mt-1.5 flex items-center justify-center gap-1.5 flex-wrap">
					{@render elementBadge(branchEl || 'Kim', 'sm')}
					{#if branchNode?.mainStem}
						<span class="text-[10px] font-bold text-primary badge badge-outline badge-xs">
							Khí: {branchNode.mainStem}
						</span>
					{/if}
					<span class="text-[10px] font-medium opacity-75 badge badge-ghost badge-xs">{branchStage}</span>
				</div>
			</div>
		</div>

		<!-- Pillar Footer Status -->
		<footer class="px-3 py-2 bg-base-200/40 border-t border-base-200/60 text-[10px] flex items-center justify-between">
			<span class="opacity-60">Lực Trụ:</span>
			<span class="font-mono font-bold text-primary">
				{formatScore((stemNode?.currentScore ?? 0) + (branchNode?.currentScore ?? 0))} đv
			</span>
		</footer>
	</article>
{/snippet}

<!-- ============================================================ -->
<!-- MAIN PAGE -->
<!-- ============================================================ -->

<svelte:head>
	<title>Lá Số Tứ Trụ Bát Tự - {baziProfile?.profile_name || 'Vũ Long Định Lượng'}</title>
	<meta
		name="description"
		content="Phân tích lá số Bát Tự Tử Bình định lượng cao cấp theo phương pháp học giả Vũ Long & Trích Thiên Tủy."
	/>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-base-200/40 via-base-100 to-base-200/60 pb-28 text-base-content antialiased">
	<div class="mx-auto w-full max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
		<!-- ==================== HEADER BAR ==================== -->
		<header class="sticky top-2 z-30 mb-8 rounded-2xl border border-base-200/80 bg-base-100/90 shadow-md backdrop-blur-md print:hidden">
			<div class="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 sm:px-7">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-primary/20 text-primary ring-1 ring-primary/30">
						<Compass class="h-6 w-6 animate-spin-slow" />
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h1 class="font-heading text-lg font-black tracking-tight sm:text-2xl">Bát Tự Tử Bình</h1>
							<span class="badge badge-primary badge-outline badge-xs uppercase tracking-wider">Vũ Long v4</span>
						</div>
						<p class="text-[11px] opacity-60">Mô hình Định lượng Vật lý Năng lượng & Trích Thiên Tủy</p>
					</div>
				</div>

				{#if baziProfile}
					<nav class="flex items-center gap-2" aria-label="Công cụ">
						<button class="btn btn-ghost btn-sm gap-1.5" onclick={handleShare} title="Chia sẻ liên kết">
							<Share2 class="h-4 w-4" />
							<span class="hidden sm:inline text-xs">Chia sẻ</span>
						</button>
						<button class="btn btn-ghost btn-sm gap-1.5" onclick={handlePrint} title="In hoặc xuất PDF (Ctrl+P)">
							<Printer class="h-4 w-4" />
							<span class="hidden sm:inline text-xs">Xuất PDF</span>
						</button>
						<button class="btn btn-primary btn-sm gap-1.5 shadow-sm" onclick={() => scrollToElement('bazi-form')}>
							<RefreshCw class="h-4 w-4" />
							<span>Lập lá số mới</span>
						</button>
					</nav>
				{/if}
			</div>
		</header>

		<!-- ==================== CONTENT BODY ==================== -->
		{#if baziProfile}
			<main class="space-y-8" id="bazi-overview">
				<!-- ========== SECTION 1: PROFILE HERO & SUMMARY BANNER ========== -->
				<section class="card border border-base-200/80 bg-base-100 shadow-sm overflow-hidden">
					<div class="relative p-6 sm:p-8">
						<!-- Ambient Oriental Glow -->
						<div class="absolute top-0 right-0 h-64 w-64 bg-primary/10 rounded-full blur-3xl -z-0 pointer-events-none"></div>

						<div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
							<div>
								<div class="flex items-center gap-3">
									<h2 class="font-heading text-2xl sm:text-3xl font-black tracking-tight">
										{baziProfile.profile_name}
									</h2>
									<span class="badge badge-lg font-bold {baziProfile.gender === 'male' ? 'badge-primary' : 'badge-secondary'}">
										{baziProfile.gender === 'male' ? 'Nam Mạng' : 'Nữ Mạng'}
									</span>
									{#if baziProfile.structure_type}
										<span class="badge badge-outline badge-lg font-mono text-xs">
											{baziProfile.structure_type}
										</span>
									{/if}
								</div>

								<div class="mt-3 flex flex-wrap items-center gap-4 text-xs opacity-75">
									<span class="inline-flex items-center gap-1.5">
										<Calendar class="h-4 w-4 text-primary" />
										<span>Dương Lịch: <strong>{formattedBirthDate}</strong></span>
									</span>
									{#if baziProfile.longitude}
										<span class="inline-flex items-center gap-1.5">
											<MapPin class="h-4 w-4 text-emerald-500" />
											<span>Kinh Độ Sinh: <strong>{baziProfile.longitude}°Đ</strong> (Giờ Mặt Trời Chân)</span>
										</span>
									{/if}
								</div>
							</div>

							<!-- Big Status Pill -->
							<div class="flex items-center gap-4 border-t md:border-t-0 md:border-l border-base-200 pt-4 md:pt-0 md:pl-8">
								<div class="text-right">
									<div class="text-[10px] font-bold uppercase tracking-widest opacity-60">Kết Luận Thân Chủ</div>
									<div class="mt-1 font-heading text-2xl sm:text-3xl font-black {isDayMasterStrong ? 'text-success' : 'text-warning'}">
										Thân {baziProfile.day_master_status}
									</div>
									<div class="text-xs font-semibold text-primary mt-0.5">
										{baziProfile.structure_name || 'Định Cách'}
									</div>
								</div>

								<div class="flex h-14 w-14 items-center justify-center rounded-2xl {isDayMasterStrong ? 'bg-success/15 text-success ring-2 ring-success/30' : 'bg-warning/15 text-warning ring-2 ring-warning/30'}">
									<Scale class="h-7 w-7" />
								</div>
							</div>
						</div>
					</div>
				</section>

				<!-- ========== SECTION 2: TỨ TRỤ (FOUR PILLARS GRID) ========== -->
				<section aria-labelledby="pillars-heading">
					<div class="mb-3 flex items-center justify-between">
						<h3 id="pillars-heading" class="flex items-center gap-2 text-lg font-black font-heading">
							<Layers class="h-5 w-5 text-primary" />
							Bảng Tứ Trụ Mệnh Bàn (8 Chữ Chính)
						</h3>
						<span class="text-xs opacity-60 italic">Đọc từ phải sang trái (Năm &rarr; Tháng &rarr; Ngày &rarr; Giờ)</span>
					</div>

					{#if pillarEnergyData}
						<div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
							{@render pillarCard(
								'Hour',
								'Trụ Giờ',
								'Cung Tử Tức (Hậu Vận)',
								pillarEnergyData.Hour.stem,
								pillarEnergyData.Hour.branch,
								pillarEnergyData.Hour.stemName,
								pillarEnergyData.Hour.branchName,
							)}
							{@render pillarCard(
								'Day',
								'Trụ Ngày',
								'Cung Bản Mệnh / Thê Thiếp',
								pillarEnergyData.Day.stem,
								pillarEnergyData.Day.branch,
								pillarEnergyData.Day.stemName,
								pillarEnergyData.Day.branchName,
								true,
							)}
							{@render pillarCard(
								'Month',
								'Trụ Tháng',
								'Cung Phụ Mẫu / Sự Nghiệp',
								pillarEnergyData.Month.stem,
								pillarEnergyData.Month.branch,
								pillarEnergyData.Month.stemName,
								pillarEnergyData.Month.branchName,
							)}
							{@render pillarCard(
								'Year',
								'Trụ Năm',
								'Cung Phúc Đức / Tổ Tiên',
								pillarEnergyData.Year.stem,
								pillarEnergyData.Year.branch,
								pillarEnergyData.Year.stemName,
								pillarEnergyData.Year.branchName,
							)}
						</div>
					{/if}
				</section>

				<!-- ========== SECTION 3: THẦN SÁT CÁT HUNG (SHEN SHA) ========== -->
				{#if baziProfile.shen_sha && baziProfile.shen_sha.length > 0}
					<section class="card border border-base-200/80 bg-base-100 shadow-sm" aria-labelledby="shensha-heading">
						<div class="card-body p-5 sm:p-6">
							<div class="flex items-center justify-between mb-4">
								<h3 id="shensha-heading" class="flex items-center gap-2 text-base font-bold font-heading">
									<Award class="h-5 w-5 text-amber-500" />
									Thần Sát Cát Hung Trong Mệnh Bàn ({baziProfile.shen_sha.length})
								</h3>
								<span class="badge badge-ghost badge-sm text-[11px]">Tra theo Can Năm, Can Ngày & Địa Chi</span>
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
								{#each baziProfile.shen_sha as item}
									{@const details = getShenShaDetails(item)}
									<div class="border border-base-200 rounded-xl p-3.5 bg-base-200/30 flex flex-col justify-between hover:border-primary/40 transition-colors">
										<div>
											<div class="flex items-center justify-between mb-2">
												<div class="flex items-center gap-2">
													<div class="p-1.5 rounded-lg {details.iconBg}">
														<Sparkles class="h-4 w-4" />
													</div>
													<h4 class="font-bold text-sm {details.textClass}">{details.fullName}</h4>
												</div>
												<span class="badge {details.badge} badge-xs font-bold">Cát</span>
											</div>
											<p class="text-xs opacity-70 leading-relaxed">{details.desc}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</section>
				{/if}

				<!-- ========== SECTION 4: VÙNG TÂM, NĂNG LƯỢNG 5 HÀNH & CÁN CÂN VŨ LONG ========== -->
				{#if vuLongComparison}
					<section class="grid grid-cols-1 lg:grid-cols-12 gap-6" aria-labelledby="center-zone-heading">
						<!-- Left: Vu Long Center Balance (7 cols) -->
						<div class="card border border-base-200/80 bg-base-100 shadow-sm lg:col-span-7">
							<div class="card-body p-5 sm:p-6">
								<header class="flex items-center justify-between mb-4 pb-2 border-b border-base-200">
									<h3 id="center-zone-heading" class="flex items-center gap-2 text-base font-bold font-heading">
										<Scale class="h-5 w-5 text-primary" />
										Cán Cân Vùng Tâm Vũ Long (Thân vs Kẻ Thù Mạnh Nhất)
									</h3>
									<span class="badge badge-sm font-mono font-bold {vuLongComparison.isVwang ? 'badge-success' : 'badge-warning'}">
										Ngưỡng: &ge; 1.0 đv
									</span>
								</header>

								<!-- Comparison Bar -->
								<div class="space-y-4">
									<div class="flex justify-between items-center text-xs font-bold tracking-wider uppercase">
										<span class="text-success flex items-center gap-1.5">
											<Shield class="h-4 w-4" />
											Thân ({vuLongComparison.selfElement}): {formatScore(vuLongComparison.party)} đv
										</span>
										<span class="text-error flex items-center gap-1.5">
											<ShieldAlert class="h-4 w-4" />
											Địch ({vuLongComparison.maxEnemyElement}): {formatScore(vuLongComparison.enemy)} đv
										</span>
									</div>

									<!-- Dual Progress Bar -->
									<div class="w-full h-5 bg-base-200 rounded-full overflow-hidden flex shadow-inner">
										<div
											class="h-full bg-success transition-all duration-700 ease-out"
											style="width: {vuLongComparison.partyPct}%"
										></div>
										<div
											class="h-full bg-error transition-all duration-700 ease-out"
											style="width: {vuLongComparison.enemyPct}%"
										></div>
									</div>

									<div class="flex justify-between text-[11px] font-mono opacity-60">
										<span>{vuLongComparison.partyPct.toFixed(1)}% Lực Thân</span>
										<span>{vuLongComparison.enemyPct.toFixed(1)}% Lực Địch Lớn Nhất</span>
									</div>

									<!-- Cards Grid for Metrics -->
									<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
										<div class="p-3 rounded-xl border border-base-200 bg-base-50 text-center">
											<div class="text-[10px] uppercase font-bold opacity-60">Hiệu Số Lực</div>
											<div class="font-mono text-xl font-black mt-0.5 {vuLongComparison.diff >= 1.0 ? 'text-success' : 'text-warning'}">
												{formatSign(vuLongComparison.diff)} đv
											</div>
											<div class="text-[9px] opacity-50 mt-0.5">Thân - Max(Địch)</div>
										</div>

										<div class="p-3 rounded-xl border border-base-200 bg-base-50 text-center">
											<div class="text-[10px] uppercase font-bold opacity-60">Hành Địch Mạnh Nhất</div>
											<div class="font-heading text-lg font-bold text-error mt-0.5">
												Hành {vuLongComparison.maxEnemyElement}
											</div>
											<div class="text-[9px] opacity-50 mt-0.5">{formatScore(vuLongComparison.enemy)} điểm</div>
										</div>

										<div class="p-3 rounded-xl border border-base-200 bg-base-50 text-center col-span-2 sm:col-span-1">
											<div class="text-[10px] uppercase font-bold opacity-60">Đắc Địa (Lộc/Kình)</div>
											<div class="font-mono text-xl font-black text-primary mt-0.5">
												{vuLongComparison.locScore > 0 ? `+${formatScore(vuLongComparison.locScore)}` : '0.00'}
											</div>
											<div class="text-[9px] opacity-50 mt-0.5">
												{vuLongComparison.locScore > 0 ? 'Có Gốc Vững Vàng' : 'Không Đắc Địa'}
											</div>
										</div>
									</div>

									<p class="text-[11px] opacity-70 italic leading-relaxed pt-1">
										* Theo học giả Vũ Long: Thân chỉ so sánh với <strong>Hành Địch Mạnh Nhất</strong> chứ không cộng dồn tất cả các hành đối nghịch. Để đạt Thân Vượng, Thân phải áp đảo hành đối thủ ít nhất 1.0 đơn vị điểm.
									</p>
								</div>
							</div>
						</div>

						<!-- Right: 5 Elements Center Zone Breakdown (5 cols) -->
						<div class="card border border-base-200/80 bg-base-100 shadow-sm lg:col-span-5">
							<div class="card-body p-5 sm:p-6">
								<header class="flex items-center justify-between mb-4 pb-2 border-b border-base-200">
									<h3 class="flex items-center gap-2 text-base font-bold font-heading">
										<Activity class="h-5 w-5 text-secondary" />
										Ngũ Hành Trong Vùng Tâm
									</h3>
									<span class="text-xs opacity-60 font-mono">Điểm Đã Suy Hao</span>
								</header>

								<div class="space-y-3">
									{#each centerElementStats as stat}
										<div>
											<div class="flex items-center justify-between text-xs mb-1">
												<div class="flex items-center gap-1.5">
													{@render elementBadge(stat.element, 'sm')}
													{#if stat.isSelf}
														<span class="badge badge-success badge-xs font-bold">Thân</span>
													{/if}
													{#if stat.isEnemy}
														<span class="badge badge-error badge-xs font-bold">Địch Tối Đa</span>
													{/if}
												</div>
												<div class="font-mono text-xs font-bold">
													{formatScore(stat.score)} đv
													<span class="text-[10px] opacity-50 font-normal">({stat.percentage.toFixed(1)}%)</span>
												</div>
											</div>

											<div class="w-full h-2.5 bg-base-200 rounded-full overflow-hidden">
												<div
													class="h-full rounded-full transition-all duration-500 {stat.style.color}"
													style="width: {stat.percentage}%"
												></div>
											</div>
										</div>
									{/each}
								</div>

								<div class="mt-4 pt-3 border-t border-base-200/60 text-[11px] opacity-60 flex items-center justify-between">
									<span>Mô hình suy hao khoảng cách (Decay)</span>
									<span class="font-mono font-bold">PDF 4 - Trang 11</span>
								</div>
							</div>
						</div>
					</section>
				{/if}

				<!-- ========== SECTION 5: MẪU DỤNG THẦN & HỆ THỐNG ĐIỂM HẠN ========== -->
				{#if baziProfile.limit_score}
					{@const ls = baziProfile.limit_score}
					<section class="card border border-base-200/80 bg-base-100 shadow-sm overflow-hidden">
						<div class="card-body p-5 sm:p-7">
							<!-- Pattern Header Banner -->
							<div class="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
								<div>
									<div class="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
										<Zap class="h-4 w-4" />
										Mẫu Định Lượng Dụng Thần Vũ Long
									</div>
									<h4 class="font-heading text-xl sm:text-2xl font-black mt-1">
										{ls.pattern || 'Phương Pháp Trích Thiên Tủy'}
									</h4>
									<p class="text-xs opacity-75 mt-1">
										Áp dụng bảng điểm hạn chuẩn Vũ Long: Dụng thần (-1.0), Hỷ thần (-0.5), Kỵ thần (+0.5), Hung thần (+1.0).
									</p>
								</div>

								<div class="badge badge-lg badge-primary font-bold px-4 py-3 text-sm">
									{baziProfile.structure_type || 'Nội Cách'}
								</div>
							</div>

							<!-- 4 Pillars of Gods Grid -->
							<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
								<!-- Dụng Thần -->
								<div class="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-500/10 flex flex-col justify-between">
									<div>
										<div class="flex items-center justify-between mb-2">
											<span class="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
												<CheckCircle2 class="h-3.5 w-3.5" />
												Dụng Thần (-1.0)
											</span>
											<span class="badge badge-success badge-xs font-bold">Đại Cát</span>
										</div>
										<p class="text-[11px] opacity-70 mb-3">Hành quan trọng nhất giúp cân bằng và cứu vãn mệnh cục.</p>
										<div class="flex flex-wrap gap-1.5">
											{#each ls.dungThan as el}
												{@render elementBadge(el, 'md')}
											{/each}
											{#if ls.dungThan.length === 0}
												<span class="text-xs opacity-50 italic">Không có</span>
											{/if}
										</div>
									</div>
								</div>

								<!-- Hỷ Thần -->
								<div class="p-4 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-500/10 flex flex-col justify-between">
									<div>
										<div class="flex items-center justify-between mb-2">
											<span class="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1">
												<Info class="h-3.5 w-3.5" />
												Hỷ Thần (-0.5)
											</span>
											<span class="badge badge-info badge-xs font-bold">Thứ Cát</span>
										</div>
										<p class="text-[11px] opacity-70 mb-3">Hành sinh trợ cho Dụng Thần, mang lại bình an thuận lợi.</p>
										<div class="flex flex-wrap gap-1.5">
											{#each ls.hyThan as el}
												{@render elementBadge(el, 'md')}
											{/each}
											{#if ls.hyThan.length === 0}
												<span class="text-xs opacity-50 italic">Không có</span>
											{/if}
										</div>
									</div>
								</div>

								<!-- Kỵ Thần -->
								<div class="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-500/10 flex flex-col justify-between">
									<div>
										<div class="flex items-center justify-between mb-2">
											<span class="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
												<AlertTriangle class="h-3.5 w-3.5" />
												Kỵ Thần (+0.5)
											</span>
											<span class="badge badge-warning badge-xs font-bold">Bất Lợi</span>
										</div>
										<p class="text-[11px] opacity-70 mb-3">Hành đối địch làm suy yếu Thân hoặc cản trở Dụng Thần.</p>
										<div class="flex flex-wrap gap-1.5">
											{#each ls.kyThan as el}
												{@render elementBadge(el, 'md')}
											{/each}
											{#if ls.kyThan.length === 0}
												<span class="text-xs opacity-50 italic">Không có</span>
											{/if}
										</div>
									</div>
								</div>

								<!-- Hung Thần -->
								<div class="p-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-500/10 flex flex-col justify-between">
									<div>
										<div class="flex items-center justify-between mb-2">
											<span class="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1">
												<XCircle class="h-3.5 w-3.5" />
												Hung Thần (+1.0)
											</span>
											<span class="badge badge-error badge-xs font-bold">Đại Hung</span>
										</div>
										<p class="text-[11px] opacity-70 mb-3">Hành khắc chế trực diện Dụng Thần, cần đề phòng tai ương.</p>
										<div class="flex flex-wrap gap-1.5">
											{#each ls.hungThan as el}
												{@render elementBadge(el, 'md')}
											{/each}
											{#if ls.hungThan.length === 0}
												<span class="text-xs opacity-50 italic">Không có</span>
											{/if}
										</div>
									</div>
								</div>
							</div>

							<!-- 5 Elements Score Matrix -->
							<div class="mt-6 pt-5 border-t border-base-200">
								<div class="text-xs font-bold uppercase tracking-wider opacity-70 mb-3">
									Bảng Điểm Hạn Theo Ngũ Hành (Vũ Long Matrix)
								</div>
								<div class="grid grid-cols-5 gap-2 text-center">
									{#each Object.entries(ls.scores) as [el, score]}
										{@const style = getElementStyle(el)}
										<div class="p-2.5 rounded-xl border {style.border} {style.bgSoft}">
											<div class="text-xs font-bold {style.text}">{el}</div>
											<div class="font-mono text-base font-black mt-1 {score < 0 ? 'text-success' : 'text-error'}">
												{formatSign(score)}
											</div>
											<div class="text-[9px] opacity-60 mt-0.5">
												{score <= -1.0 ? 'Dụng' : score < 0 ? 'Hỷ' : score >= 1.0 ? 'Hung' : 'Kỵ'}
											</div>
										</div>
									{/each}
								</div>
							</div>
						</div>
					</section>
				{/if}

				<!-- ========== SECTION 6: TƯƠNG TÁC HÓA HỢP & XUNG ========== -->
				{#if baziProfile.interactions && baziProfile.interactions.length > 0}
					<section class="card border border-base-200/80 bg-base-100 shadow-sm" aria-labelledby="interactions-heading">
						<div class="card-body p-5 sm:p-6">
							<div class="flex items-center justify-between mb-4">
								<h3 id="interactions-heading" class="flex items-center gap-2 text-base font-bold font-heading">
									<Zap class="h-5 w-5 text-secondary" />
									Tương Tác Hóa Hợp & Xung Đột ({baziProfile.interactions.length})
								</h3>
								<span class="badge badge-ghost badge-sm text-[11px]">Tam Hội, Tam Hợp, Lục Hợp, Lục Xung, Can Hợp</span>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
								{#each baziProfile.interactions as inter}
									{@const label = INTERACTION_TYPE_LABELS[inter.type]}
									<div class="p-3.5 rounded-xl border border-base-200 bg-base-200/30 flex items-center justify-between hover:border-secondary/40 transition-colors">
										<div class="flex items-center gap-3">
											<span class="badge {label.color} badge-sm font-bold">{label.name}</span>
											<div>
												<div class="text-sm font-black tracking-tight">{inter.participants.join(' - ')}</div>
												<div class="text-[10px] opacity-60 mt-0.5">{inter.description || label.desc}</div>
											</div>
										</div>

										<div class="text-right font-mono">
											{#if inter.result === 'Clash'}
												<span class="text-xs font-bold text-error">Xung Phá</span>
											{:else if inter.result === 'Bind'}
												<span class="text-xs font-bold text-warning">Trói Buộc</span>
											{:else}
												<span class="text-xs font-bold text-success">Hóa {inter.result}</span>
											{/if}
											{#if inter.score}
												<div class="text-[10px] text-primary">+{formatScore(inter.score)} đv</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					</section>
				{/if}

				<!-- ========== SECTION 7: BẢNG DÒNG CHẢY NĂNG LƯỢNG (8 CHỮ CHÍNH) ========== -->
				{#if baziProfile.energy_flow && baziProfile.energy_flow.length > 0}
					<section class="card border border-base-200/80 bg-base-100 shadow-sm overflow-hidden" aria-labelledby="energy-flow-heading">
						<header class="p-5 border-b border-base-200 flex items-center justify-between">
							<div class="flex items-center gap-2">
								<Activity class="h-5 w-5 text-primary" />
								<h3 id="energy-flow-heading" class="font-heading text-base font-bold">
									Bảng Phân Bổ & Lịch Sử Năng Lượng 8 Chữ Chính
								</h3>
								<span class="badge badge-primary badge-outline badge-xs font-mono">
									{baziProfile.energy_flow.length} nodes
								</span>
							</div>

							<button
								class="btn btn-ghost btn-xs gap-1 print:hidden"
								onclick={() => (showEnergyTable = !showEnergyTable)}
								aria-expanded={showEnergyTable}
							>
								{#if showEnergyTable}
									<ChevronUp class="h-4 w-4" />
									<span>Thu gọn</span>
								{:else}
									<ChevronDown class="h-4 w-4" />
									<span>Xem chi tiết</span>
								{/if}
							</button>
						</header>

						{#if showEnergyTable}
							<div class="overflow-x-auto">
								<table class="table table-sm table-pin-rows w-full">
									<thead>
										<tr class="bg-base-200/60 text-xs">
											<th class="py-3">Trụ</th>
											<th class="py-3">Chữ / Bản Khí</th>
											<th class="py-3">Phân Loại</th>
											<th class="py-3">Ngũ Hành</th>
											<th class="py-3">Vòng Trường Sinh</th>
											<th class="py-3">Điểm Lực Hiện Tại</th>
											<th class="py-3">Trạng Thái</th>
											<th class="py-3">Biến Động Năng Lượng</th>
										</tr>
									</thead>
									<tbody>
										{#each PILLAR_ORDER as pos}
											{@const nodesInPillar = baziProfile.energy_flow.filter((n) => n.source === pos)}
											{#each nodesInPillar as node, idx (node.id)}
												{@const el = node.transformTo || node.element}
												{@const style = getElementStyle(el)}
												{@const lifeCycle = LIFE_CYCLE_NAMES[node.lifeCycleStage]?.name ?? node.lifeCycleStage}
												{@const isDayMaster = node.source === 'Day' && node.type === 'Stem'}
												{@const scoreDiff = node.currentScore - node.baseScore}

												<tr class="hover:bg-base-200/40 transition-colors {isDayMaster ? 'bg-primary/5' : ''}">
													<!-- Pillar -->
													<td>
														{#if idx === 0}
															<span class="badge badge-sm font-bold {pos === 'Day' ? 'badge-primary' : 'badge-ghost'}">
																Trụ {SOURCE_MAP[pos]}
															</span>
														{/if}
													</td>

													<!-- Character Name -->
													<td>
														<div class="flex items-center gap-2">
															<span class="font-heading text-lg font-black {style.text}">
																{node.name}
															</span>
															{#if node.mainStem}
																<span class="text-[10px] opacity-60">({node.mainStem})</span>
															{/if}
														</div>
													</td>

													<!-- Node Type -->
													<td>
														<span class="text-xs font-semibold opacity-75">
															{node.type === 'Stem' ? 'Thiên Can' : 'Địa Chi (Bản Khí)'}
														</span>
													</td>

													<!-- Element -->
													<td>
														{@render elementBadge(el, 'sm')}
													</td>

													<!-- Life Cycle Stage -->
													<td>
														<span class="text-xs font-medium opacity-80">{lifeCycle}</span>
													</td>

													<!-- Score -->
													<td>
														<div class="flex flex-col gap-0.5 min-w-[90px]">
															<div class="flex items-center justify-between text-xs font-mono">
																<span class="font-bold {node.currentScore >= node.baseScore ? 'text-success' : 'text-warning'}">
																	{formatScore(node.currentScore)}
																</span>
																{#if Math.abs(scoreDiff) > 0.01}
																	<span class="text-[10px] {scoreDiff > 0 ? 'text-success' : 'text-error'}">
																		({formatSign(scoreDiff)})
																	</span>
																{/if}
															</div>
															<div class="w-full bg-base-200 h-1.5 rounded-full overflow-hidden">
																<div
																	class="h-full rounded-full {node.currentScore >= node.baseScore ? 'bg-success' : 'bg-warning'}"
																	style="width: {Math.min((node.currentScore / 10) * 100, 100)}%"
																></div>
															</div>
														</div>
													</td>

													<!-- State Badges -->
													<td>
														<div class="flex items-center gap-1 flex-wrap">
															{#if node.isBlocked}
																<span class="badge badge-error badge-xs font-bold gap-0.5">
																	<XCircle class="w-2.5 h-2.5" /> Tuyệt
																</span>
															{/if}
															{#if node.isActionLocked}
																<span class="badge badge-warning badge-xs font-bold gap-0.5">
																	<Lock class="w-2.5 h-2.5" /> Khóa
																</span>
															{/if}
															{#if node.isCombined}
																<span class="badge badge-secondary badge-xs font-bold">Hóa</span>
															{/if}
															{#if !node.isBlocked && !node.isActionLocked && !node.isCombined}
																<span class="text-[10px] opacity-40">Tự do</span>
															{/if}
														</div>
													</td>

													<!-- Modifications -->
													<td>
														<div class="space-y-1 max-w-xs text-[10px]">
															{#each node.modifications.slice(-2) as mod}
																<div class="flex items-center gap-1.5">
																	<span class="font-mono font-bold px-1 rounded {mod.valueChange > 0 ? 'bg-success/15 text-success' : 'bg-error/15 text-error'}">
																		{formatSign(mod.valueChange)}
																	</span>
																	<span class="truncate opacity-75">{mod.reason}</span>
																</div>
															{/each}
															{#if node.modifications.length === 0}
																<span class="opacity-30 italic">Không biến động</span>
															{/if}
														</div>
													</td>
												</tr>
											{/each}
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</section>
				{/if}

				<!-- ========== SECTION 8: NHẬT KÝ PHÂN TÍCH TIẾN TRÌNH 8 BƯỚC (STRUCTURED AUDIT BLOCKS) ========== -->
				<section class="card border border-base-200/80 bg-base-100 shadow-sm overflow-hidden" aria-labelledby="audit-heading">
					<header class="p-4 sm:p-6 border-b border-base-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-base-100 via-base-200/30 to-base-100">
						<div class="space-y-1">
							<div class="flex items-center gap-2 flex-wrap">
								<Clock class="h-5 w-5 text-primary" />
								<h3 id="audit-heading" class="font-heading text-lg font-bold">
									Nhật Ký Luận Đoán & Tiến Trình Định Lượng
								</h3>
								<span class="badge badge-primary badge-sm font-semibold">8 Phân Đoạn Vũ Long</span>
								<span class="badge badge-ghost badge-sm font-mono">{totalAuditItemsCount} dữ kiện</span>
							</div>
							<p class="text-xs opacity-60">
								Chu trình 8 bước giải mã đồ thị năng lượng, tương tác sinh khắc, suy hao Vùng Tâm và định Dụng Thần.
							</p>
						</div>

						<div class="flex items-center gap-2 flex-wrap print:hidden">
							<button
								type="button"
								class="btn btn-sm btn-outline gap-1.5"
								onclick={() => (isRawLogMode = !isRawLogMode)}
								title="Chuyển đổi giao diện khối hoặc văn bản thô"
							>
								<FileText class="h-3.5 w-3.5" />
								<span>{isRawLogMode ? 'Xem dạng khối chuẩn' : 'Xem log thô'}</span>
							</button>

							<button
								type="button"
								class="btn btn-sm btn-primary gap-1.5 shadow-sm"
								onclick={() => (showAuditModal = true)}
								title="Mở toàn màn hình với bộ lọc chi tiết"
							>
								<Maximize2 class="h-3.5 w-3.5" />
								<span>Toàn cảnh Modal</span>
							</button>
						</div>
					</header>

					<!-- Filter & Controls Toolbar -->
					<div class="p-4 border-b border-base-200 bg-base-200/20 flex flex-col sm:flex-row gap-3 items-center justify-between">
						<!-- Step quick filter pills -->
						<div class="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
							<button
								type="button"
								class="btn btn-xs {auditActiveStep === 'all' ? 'btn-primary' : 'btn-ghost'}"
								onclick={() => (auditActiveStep = 'all')}
							>
								Tất cả (8)
							</button>
							{#each auditSections as sec}
								<button
									type="button"
									class="btn btn-xs {auditActiveStep === sec.step ? 'btn-primary' : 'btn-ghost'} whitespace-nowrap"
									onclick={() => (auditActiveStep = sec.step)}
								>
									B{sec.step}: {sec.badge}
								</button>
							{/each}
						</div>

						<!-- Search & Expand toggles -->
						<div class="flex items-center gap-2 w-full sm:w-auto justify-end">
							<div class="relative flex-1 sm:w-48">
								<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-40" />
								<input
									type="search"
									placeholder="Tìm dữ kiện..."
									class="input input-xs input-bordered w-full pl-8"
									bind:value={auditSearchTerm}
								/>
							</div>
							<button
								type="button"
								class="btn btn-xs btn-ghost"
								onclick={expandAllSteps}
								title="Mở tất cả bước"
							>
								Mở hết
							</button>
							<button
								type="button"
								class="btn btn-xs btn-ghost"
								onclick={collapseAllSteps}
								title="Thu gọn tất cả"
							>
								Thu gọn
							</button>
						</div>
					</div>

					<!-- Content Body -->
					{#if isRawLogMode}
						<!-- Raw Terminal View -->
						<div class="p-4 font-mono text-xs space-y-1.5 overflow-y-auto max-h-[500px] bg-neutral text-neutral-content rounded-none">
							<div class="flex justify-between items-center pb-2 border-b border-neutral-content/20 text-[11px] opacity-70">
								<span>Console Log Output (Vũ Long Engine)</span>
								<button class="btn btn-ghost btn-xs text-neutral-content gap-1" onclick={copyAllLogs}>
									{#if copiedLog}
										<Check class="h-3 w-3 text-success" /> Đã chép
									{:else}
										<Copy class="h-3 w-3" /> Sao chép
									{/if}
								</button>
							</div>
							{#each filteredAuditLogs as log, i (i)}
								{@const isHeader = log.startsWith('---') || log.startsWith('>>')}
								{@const isStrike = log.includes('khắc') || log.includes('BỊ KHÓA')}
								{@const isConclusion = log.includes('KẾT LUẬN') || log.includes('DỤNG THẦN')}
								<div
									class="leading-relaxed font-mono
									{isHeader ? 'text-primary-content font-bold pt-1.5 border-t border-neutral-content/10' : ''}
									{isStrike ? 'text-error font-semibold' : ''}
									{isConclusion ? 'text-success font-bold bg-success/10 p-1 rounded' : 'opacity-80'}"
								>
									{log}
								</div>
							{/each}
						</div>
					{:else}
						<!-- Structured 8-Step Accordion Cards -->
						<div class="p-4 sm:p-6 space-y-4 max-h-[700px] overflow-y-auto bg-base-200/10">
							{#each filteredSections as section (section.step)}
								{@const isOpen = expandedSteps[section.step] ?? true}
								<div class="border border-base-200 rounded-xl bg-base-100 overflow-hidden shadow-xs hover:border-primary/40 transition-colors">
									<!-- Step Accordion Header -->
									<button
										type="button"
										class="w-full text-left p-3.5 sm:p-4 flex items-center justify-between gap-3 bg-base-200/30 hover:bg-base-200/50 transition-colors"
										onclick={() => toggleStep(section.step)}
									>
										<div class="flex items-center gap-2.5 min-w-0">
											<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content text-xs font-bold font-mono">
												{section.step}
											</span>
											<span class="badge {getStepBadgeColor(section.step)} badge-sm font-semibold shrink-0">
												{section.badge}
											</span>
											<div class="min-w-0">
												<h4 class="font-bold text-sm truncate">{section.name}</h4>
												{#if section.description}
													<p class="text-[11px] opacity-60 truncate hidden sm:block">{section.description}</p>
												{/if}
											</div>
										</div>

										<div class="flex items-center gap-2 shrink-0">
											<span class="text-xs opacity-50 font-mono">
												{section.items.length} mục
											</span>
											{#if isOpen}
												<ChevronUp class="h-4 w-4 opacity-50" />
											{:else}
												<ChevronDown class="h-4 w-4 opacity-50" />
											{/if}
										</div>
									</button>

									<!-- Step Items Table / Lines -->
									{#if isOpen}
										<div class="p-2 sm:p-3 divide-y divide-base-200">
											{#if section.items.length === 0}
												<div class="p-3 text-center text-xs opacity-40 italic">
													Không có dữ kiện nào cho phân đoạn này
												</div>
											{:else}
												{#each section.items as item, idx (idx)}
													{@const style = getLevelBadgeClass(item.level)}
													<div class="py-2.5 px-2 hover:bg-base-200/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors">
														<div class="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
															<span class="badge {style.badge} badge-xs font-semibold shrink-0 mt-0.5 sm:mt-0">
																{item.tag || style.label}
															</span>

															{#if item.pillar}
																<span class="badge badge-ghost badge-xs font-mono shrink-0">
																	{SOURCE_MAP[item.pillar] ? `Trụ ${SOURCE_MAP[item.pillar]}` : item.pillar}
																</span>
															{/if}

															<div class="min-w-0 flex-1">
																<span class="font-bold text-base-content mr-1.5">{item.title}</span>
																<span class="opacity-75">{item.content}</span>
															</div>
														</div>

														{#if item.scoreChange !== undefined}
															<div class="shrink-0 self-end sm:self-auto">
																<span
																	class="font-mono font-bold px-2 py-0.5 rounded text-[11px] border
																	{item.scoreChange > 0 ? 'bg-success/10 text-success border-success/30' : item.scoreChange < 0 ? 'bg-error/10 text-error border-error/30' : 'bg-base-200 text-base-content/70 border-base-300'}"
																>
																	{formatSign(item.scoreChange)} đv
																</span>
															</div>
														{/if}
													</div>
												{/each}
											{/if}
										</div>
									{/if}
								</div>
							{/each}

							{#if filteredSections.length === 0}
								<div class="p-8 text-center text-sm opacity-50 italic">
									Không tìm thấy dữ kiện nào khớp với từ khóa tìm kiếm "{auditSearchTerm}".
								</div>
							{/if}
						</div>
					{/if}
				</section>
			</main>
		{:else}
			<!-- Empty state -->
			<div class="py-16 text-center">
				<div class="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/30 animate-pulse">
					<Compass class="h-10 w-10" />
				</div>
				<h2 class="font-heading text-2xl sm:text-3xl font-black">Chưa Có Lá Số Bát Tự</h2>
				<p class="text-sm opacity-60 max-w-md mx-auto mt-2">
					Vui lòng nhập thông tin ngày, giờ sinh và tỉnh thành bên dưới để lập lá số định lượng theo thuật toán Vũ Long.
				</p>
				<button class="btn btn-primary mt-6 gap-2" onclick={() => focusElement('profile_name')}>
					<Sparkles class="h-4 w-4" />
					Nhập Thông Tin Ngay
				</button>
			</div>
		{/if}

		<!-- ==================== FORM SECTION ==================== -->
		<section
			id="bazi-form"
			class="card border border-base-200/80 bg-base-100 max-w-3xl mx-auto mt-12 shadow-xl overflow-hidden"
			aria-labelledby="form-title"
		>
			<div class="card-body p-6 sm:p-8">
				<header class="flex items-center justify-between pb-4 mb-6 border-b border-base-200">
					<div>
						<h3 id="form-title" class="font-heading text-xl font-bold flex items-center gap-2">
							<Calendar class="h-5 w-5 text-primary" />
							Thông Tin Sinh (Dương Lịch)
						</h3>
						<p class="text-xs opacity-60 mt-0.5">
							Hệ thống sẽ tự động tính đổi sang Giờ Mặt Trời Chân (Real Solar Time) và tiết khí chuẩn xác.
						</p>
					</div>
					<div class="badge badge-primary badge-outline text-xs">Vũ Long Engine</div>
				</header>

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
					class="space-y-5"
				>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
						<!-- Full Name -->
						<div class="form-control">
							<label class="label text-xs font-bold" for="profile_name">
								<span class="label-text">Họ và tên <span class="text-error">*</span></span>
							</label>
							<input
								id="profile_name"
								name="profile_name"
								type="text"
								class="input input-bordered w-full"
								bind:value={formData.profile_name}
								required
								minlength={2}
								maxlength={100}
								placeholder="Ví dụ: Nguyễn Văn An..."
							/>
						</div>

						<!-- Gender -->
						<div class="form-control">
							<span class="label text-xs font-bold label-text">Giới tính <span class="text-error">*</span></span>
							<div class="join w-full">
								<input
									class="btn join-item flex-1"
									type="radio"
									name="gender"
									value="male"
									aria-label="Nam Mạng"
									bind:group={formData.gender}
								/>
								<input
									class="btn join-item flex-1"
									type="radio"
									name="gender"
									value="female"
									aria-label="Nữ Mạng"
									bind:group={formData.gender}
								/>
							</div>
						</div>

						<!-- Birth Date -->
						<div class="form-control">
							<label class="label text-xs font-bold" for="birth_date">
								<span class="label-text">Ngày sinh (Dương lịch) <span class="text-error">*</span></span>
							</label>
							<input
								id="birth_date"
								name="birth_date"
								type="date"
								max={todayISO}
								min="1900-01-01"
								class="input input-bordered w-full"
								bind:value={formData.birth_date}
								required
							/>
						</div>

						<!-- Birth Time -->
						<div class="form-control">
							<label class="label text-xs font-bold" for="birth_time">
								<span class="label-text">Giờ sinh (Đồng hồ) <span class="text-error">*</span></span>
							</label>
							<input
								id="birth_time"
								name="birth_time"
								type="time"
								class="input input-bordered w-full"
								bind:value={formData.birth_time}
								required
							/>
						</div>

						<!-- City / Longitude Preset -->
						<div class="form-control">
							<label class="label text-xs font-bold" for="city_select">
								<span class="label-text flex items-center gap-1">
									<MapPin class="h-3.5 w-3.5 text-primary" />
									Tỉnh / Thành phố sinh (Tính giờ chân)
								</span>
							</label>
							<select
								id="city_select"
								class="select select-bordered w-full"
								value={selectedCityIdx}
								onchange={onCityChange}
							>
								{#each CITY_PRESETS as city, idx}
									<option value={idx}>{city.name}</option>
								{/each}
							</select>
						</div>

						<!-- Custom Longitude -->
						<div class="form-control">
							<label class="label text-xs font-bold" for="longitude">
								<span class="label-text">Kinh độ sinh (° Đông)</span>
							</label>
							<input
								id="longitude"
								name="longitude"
								type="number"
								step="0.01"
								min="-180"
								max="180"
								class="input input-bordered w-full font-mono"
								value={customLongitude}
								oninput={onCustomLongitudeChange}
								placeholder="105.85"
							/>
						</div>
					</div>

					<div class="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-base-200">
						<span class="text-xs opacity-60">
							* Áp dụng công thức Vũ Long: Dạ Tý (23h-0h tính ngày sau), phương trình thời gian EoT.
						</span>

						<button
							type="submit"
							class="btn btn-primary w-full sm:w-auto px-8 gap-2 shadow-md"
							disabled={loading}
						>
							{#if loading}
								<span class="loading loading-spinner"></span>
								Đang Lập Lá Số...
							{:else}
								<Save class="h-4 w-4" />
								Lập Lá Số & Lưu Lại
							{/if}
						</button>
					</div>
				</form>
			</div>
		</section>

		<!-- ==================== FOOTER ==================== -->
		<footer class="mt-12 text-center text-xs opacity-60 space-y-2">
			<p>Hệ thống tính toán Bát Tự Tử Bình định lượng dựa trên giáo trình của học giả Vũ Long & Trích Thiên Tủy Bình Chú.</p>
			<p>Kết quả giải đoán mang giá trị tham khảo định hướng nhân mệnh và phong thủy ứng dụng.</p>
		</footer>
	</div>
</div>

<!-- ============================================================ -->
<!-- FULL AUDIT LOG MODAL (TOÀN CẢNH LUẬN ĐOÁN 8 BƯỚC) -->
<!-- ============================================================ -->
{#if showAuditModal}
	<div class="modal modal-open z-50 print:hidden">
		<div class="modal-box w-11/12 max-w-5xl max-h-[90vh] p-0 flex flex-col overflow-hidden shadow-2xl border border-base-200 bg-base-100">
			<!-- Modal Header -->
			<div class="p-4 sm:p-6 border-b border-base-200 bg-gradient-to-r from-base-100 via-primary/5 to-base-100 flex items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					<div class="p-2.5 rounded-xl bg-primary/10 text-primary">
						<Clock class="h-6 w-6" />
					</div>
					<div>
						<h3 class="font-heading text-lg sm:text-xl font-black flex items-center gap-2">
							Toàn Cảnh Luận Đoán 8 Bước - Vũ Long Engine
						</h3>
						<p class="text-xs opacity-60">
							Chi tiết từng bước tính toán năng lượng, tương tác sinh khắc, suy hao và định lượng Dụng Thần.
						</p>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<button
						type="button"
						class="btn btn-sm btn-ghost gap-1.5"
						onclick={copyAllLogs}
						title="Sao chép toàn bộ nhật ký"
					>
						{#if copiedLog}
							<Check class="h-4 w-4 text-success" />
							<span class="hidden sm:inline text-xs text-success">Đã chép</span>
						{:else}
							<Copy class="h-4 w-4" />
							<span class="hidden sm:inline text-xs">Sao chép</span>
						{/if}
					</button>

					<button
						type="button"
						class="btn btn-sm btn-circle btn-ghost"
						onclick={() => (showAuditModal = false)}
						aria-label="Đóng"
					>
						<X class="h-5 w-5" />
					</button>
				</div>
			</div>

			<!-- Summary Stats Strip -->
			<div class="px-4 py-3 bg-base-200/40 border-b border-base-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
				<div class="flex flex-col">
					<span class="opacity-50 text-[10px] uppercase font-bold">Thế Cục Vùng Tâm</span>
					<span class="font-bold text-primary truncate">
						{baziProfile?.day_master_status ?? 'N/A'} ({baziProfile?.structure_type ?? 'Nội Cách'})
					</span>
				</div>
				<div class="flex flex-col">
					<span class="opacity-50 text-[10px] uppercase font-bold">Dụng Thần Định Mẫu</span>
					<span class="font-bold text-success truncate">
						{baziProfile?.limit_score?.pattern ?? 'Mẫu Vũ Long'}
					</span>
				</div>
				<div class="flex flex-col">
					<span class="opacity-50 text-[10px] uppercase font-bold">Hành Dụng Thần</span>
					<span class="font-bold truncate">
						{baziProfile?.limit_score?.dungThan?.join(', ') || 'N/A'}
					</span>
				</div>
				<div class="flex flex-col">
					<span class="opacity-50 text-[10px] uppercase font-bold">Tổng dữ kiện</span>
					<span class="font-bold font-mono truncate">
						{totalAuditItemsCount} sự kiện ghi nhận
					</span>
				</div>
			</div>

			<!-- Modal Filters Toolbar -->
			<div class="p-3 sm:p-4 border-b border-base-200 bg-base-100 flex flex-col md:flex-row gap-3 items-center justify-between">
				<!-- Step selector tabs -->
				<div class="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
					<button
						type="button"
						class="btn btn-xs {auditActiveStep === 'all' ? 'btn-primary' : 'btn-ghost'}"
						onclick={() => (auditActiveStep = 'all')}
					>
						Tất cả
					</button>
					{#each auditSections as sec}
						<button
							type="button"
							class="btn btn-xs {auditActiveStep === sec.step ? 'btn-primary' : 'btn-ghost'} whitespace-nowrap"
							onclick={() => (auditActiveStep = sec.step)}
						>
							B{sec.step}: {sec.badge}
						</button>
					{/each}
				</div>

				<!-- Filter by Level and Search -->
				<div class="flex items-center gap-2 w-full md:w-auto justify-end">
					<select class="select select-xs select-bordered" bind:value={auditLevelFilter}>
						<option value="all">Mọi cấp độ</option>
						<option value="good">Cát Lợi / Hỷ Thần</option>
						<option value="danger">Hung Sát / Khóa</option>
						<option value="warning">Kỵ Thần / Hao</option>
						<option value="accent">Trọng Tâm / Cách Cục</option>
						<option value="info">Thông tin khởi tạo</option>
					</select>

					<div class="relative flex-1 sm:w-48">
						<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-40" />
						<input
							type="search"
							placeholder="Tìm nhanh..."
							class="input input-xs input-bordered w-full pl-8"
							bind:value={auditSearchTerm}
						/>
					</div>
				</div>
			</div>

			<!-- Modal Scrollable Body -->
			<div class="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-base-200/20">
				{#each filteredSections as section (section.step)}
					<div class="card border border-base-200 bg-base-100 shadow-sm overflow-hidden">
						<div class="p-3 sm:p-4 bg-base-200/40 border-b border-base-200 flex items-center justify-between gap-3">
							<div class="flex items-center gap-2.5">
								<span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-content text-xs font-bold font-mono">
									{section.step}
								</span>
								<span class="badge {getStepBadgeColor(section.step)} badge-sm font-semibold">
									{section.badge}
								</span>
								<h4 class="font-bold text-sm">{section.name}</h4>
							</div>
							<span class="text-xs opacity-50 font-mono">{section.items.length} dữ kiện</span>
						</div>

						<div class="p-3 divide-y divide-base-200">
							{#if section.items.length === 0}
								<div class="p-3 text-center text-xs opacity-40 italic">
									Không có dữ kiện nào khớp bộ lọc trong phân đoạn này
								</div>
							{:else}
								{#each section.items as item, idx (idx)}
									{@const style = getLevelBadgeClass(item.level)}
									<div class="py-2.5 px-2 hover:bg-base-200/40 rounded-lg flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs transition-colors">
										<div class="flex items-start gap-2.5 flex-1 min-w-0">
											<span class="badge {style.badge} badge-xs font-semibold shrink-0 mt-0.5">
												{item.tag || style.label}
											</span>
											{#if item.pillar}
												<span class="badge badge-ghost badge-xs font-mono shrink-0 mt-0.5">
													{SOURCE_MAP[item.pillar] ? `Trụ ${SOURCE_MAP[item.pillar]}` : item.pillar}
												</span>
											{/if}
											<div class="flex-1 min-w-0">
												<div class="font-bold text-base-content">{item.title}</div>
												<div class="opacity-75 mt-0.5 leading-relaxed">{item.content}</div>
											</div>
										</div>

										{#if item.scoreChange !== undefined}
											<div class="shrink-0 self-end sm:self-auto">
												<span
													class="font-mono font-bold px-2 py-0.5 rounded text-[11px] border
													{item.scoreChange > 0 ? 'bg-success/10 text-success border-success/30' : item.scoreChange < 0 ? 'bg-error/10 text-error border-error/30' : 'bg-base-200 text-base-content/70 border-base-300'}"
												>
													{formatSign(item.scoreChange)} đv
												</span>
											</div>
										{/if}
									</div>
								{/each}
							{/if}
						</div>
					</div>
				{/each}

				{#if filteredSections.length === 0}
					<div class="py-12 text-center text-sm opacity-50 italic">
						Không có dữ kiện nào phù hợp với bộ lọc hiện tại.
					</div>
				{/if}
			</div>

			<!-- Modal Action Footer -->
			<div class="p-3 sm:p-4 border-t border-base-200 bg-base-100 flex items-center justify-between gap-4">
				<span class="text-xs opacity-60">
					* Thuật toán định lượng Bát Tự Vũ Long v4 kết hợp 12 Cung Trường Sinh & Ma trận Tương Tác.
				</span>
				<button type="button" class="btn btn-sm btn-neutral" onclick={() => (showAuditModal = false)}>
					Đóng
				</button>
			</div>
		</div>
		<div
			class="modal-backdrop bg-black/60 backdrop-blur-xs"
			onclick={() => (showAuditModal = false)}
			role="button"
			tabindex="0"
		></div>
	</div>
{/if}

<!-- ============================================================ -->
<!-- STYLES -->
<!-- ============================================================ -->
<style>
	@keyframes spinSlow {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
	.animate-spin-slow {
		animation: spinSlow 30s linear infinite;
	}

	@media print {
		:global(header),
		:global(.print\:hidden),
		:global(#bazi-form) {
			display: none !important;
		}
		:global(.card) {
			border: 1px solid #d1d5db !important;
			box-shadow: none !important;
			break-inside: avoid;
		}
	}
</style>
