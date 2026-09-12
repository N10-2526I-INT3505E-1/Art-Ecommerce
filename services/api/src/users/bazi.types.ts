// src/bazi/bazi.types.ts

// --- CONSTANTS AS TYPES ---
export const HEAVENLY_STEMS = [
	'Giáp',
	'Ất',
	'Bính',
	'Đinh',
	'Mậu',
	'Kỷ',
	'Canh',
	'Tân',
	'Nhâm',
	'Quý',
] as const;
export type HeavenlyStem = (typeof HEAVENLY_STEMS)[number];

export const EARTHLY_BRANCHES = [
	'Tý',
	'Sửu',
	'Dần',
	'Mão',
	'Thìn',
	'Tỵ',
	'Ngọ',
	'Mùi',
	'Thân',
	'Dậu',
	'Tuất',
	'Hợi',
] as const;
export type EarthlyBranch = (typeof EARTHLY_BRANCHES)[number];

export const FIVE_ELEMENTS = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'] as const;
export type FiveElement = (typeof FIVE_ELEMENTS)[number];

export type TenGod =
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

export type LifeCycleStage =
	| 'TruongSinh'
	| 'MocDuc'
	| 'QuanDoi'
	| 'LamQuan'
	| 'DeVuong'
	| 'Suy'
	| 'Benh'
	| 'Tu'
	| 'Mo'
	| 'Tuyet'
	| 'Thai'
	| 'Duong';

export type PillarPosition = 'Year' | 'Month' | 'Day' | 'Hour';

// --- CORE STRUCTURES ---

export interface Pillar {
	position: PillarPosition;
	canIndex: number;
	chiIndex: number;
	stem: HeavenlyStem;
	branch: EarthlyBranch;
	stemElement: FiveElement;
	branchElement: FiveElement;
}

export interface BaziChart {
	year: Pillar;
	month: Pillar;
	day: Pillar;
	hour: Pillar;
}

// --- ENERGY PHYSICS MODEL (VULONG) ---

// Nhật ký biến đổi điểm (Cần thiết cho Debugging)
export interface NodeModification {
	reason: string;
	valueChange: number; // Điểm số thay đổi (+/-)
	factor: number; // Hệ số tác động (nếu có, để tham khảo)
}

// Loại node theo Vũ Long: chỉ có Thiên Can (Stem) và Địa Chi (Branch, chấm theo Bản Khí).
export type EnergyNodeType = 'Stem' | 'Branch';

// Node năng lượng
export interface EnergyNode {
	id: string; // Deterministic ID: Pos_Type
	source: PillarPosition;
	type: EnergyNodeType;
	name: string; // Tên Can hoặc Chi ('Canh', 'Tuất'...)
	element: FiveElement;
	branchOwner?: EarthlyBranch; // Chi gốc (với node Branch)
	mainStem?: HeavenlyStem; // Bản khí của Chi (với node Branch)

	lifeCycleStage: LifeCycleStage;
	baseScore: number;
	currentScore: number;

	isBlocked: boolean; // True nếu năng lượng triệt tiêu (điểm về 0)
	isActionLocked: boolean; // True nếu bị khắc trực tiếp/khắc gần -> không sinh/khắc được nữa
	isCombined: boolean; // True nếu đã tham gia hợp hóa
	transformTo?: FiveElement; // Hành sau khi hóa

	modifications: NodeModification[]; // Lịch sử thay đổi điểm
}

export type InteractionType = 'TamHoi' | 'TamHop' | 'LucHop' | 'LucXung' | 'CanHop';

export interface Interaction {
	type: InteractionType;
	participants: string[]; // VD: ['Tý', 'Ngọ'] hoặc ['Giáp', 'Kỷ']
	result: string; // VD: 'Hỏa', 'Clash' (Xung), 'Bind' (Trói)
	score?: number; // Điểm số tạo ra (nếu là Hóa cục)
	description?: string;
}

// --- ANALYSIS RESULTS ---

export interface CenterZoneAnalysis {
	dayMasterScore: number;
	selfElement: FiveElement;
	elementScores: Record<FiveElement, number>; // Điểm 5 hành trong Vùng Tâm
	locScore: number; // Điểm đắc địa (Lộc/Kình Dương) đã cộng
	partyScore: number; // = Điểm Thân (self)
	enemyScore: number; // = Điểm hành địch mạnh nhất
	maxEnemyElement: FiveElement;
	maxEnemyScore: number;
	diffScore: number; // Thân - max(địch)
	isVwang: boolean;
	isStrongVwang: boolean;
	isWeakVwang: boolean;
}

export interface LimitScoreProfile {
	pattern: string; // Tên mẫu áp dụng (Mẫu 1..5)
	dungThan: FiveElement[];
	hyThan: FiveElement[];
	kyThan: FiveElement[];
	hungThan: FiveElement[];
	scores: Record<string, number>;
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
	scoreChange?: number;
	factor?: number;
	pillar?: PillarPosition;
}

export interface AuditLogSection {
	step: number;
	title: string;
	name?: string;
	badge?: string;
	summary?: string;
	description?: string;
	items: AuditLogItem[];
}

export interface BaziResult {
	pillars: BaziChart;
	energyFlow: EnergyNode[];
	interactions: Interaction[];
	centerZone: CenterZoneAnalysis;
	structure: string;
	structureType: string; // 'Nội Cách' | 'Ngoại Cách'
	limitScore: LimitScoreProfile;
	shenSha: string[];
	auditLogs: string[];
	auditSections: AuditLogSection[];
}
