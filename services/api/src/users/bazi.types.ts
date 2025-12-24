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

// Node năng lượng
export interface EnergyNode {
	id: string; // Deterministic ID: Pos_Type_Name
	source: PillarPosition;
	type: 'Stem' | 'HiddenStem';
	name: string;
	element: FiveElement;
	branchOwner?: EarthlyBranch;

	lifeCycleStage: LifeCycleStage;
	baseScore: number;
	currentScore: number;

	isBlocked: boolean; // True nếu năng lượng quá yếu hoặc bị khắc chết
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
	partyScore: number;
	enemyScore: number;
	diffScore: number;
	isVwang: boolean;
	isStrongVwang: boolean;
	isWeakVwang: boolean;
}

export interface LimitScoreProfile {
	dungThan: FiveElement[];
	hyThan: FiveElement[];
	kyThan: FiveElement[];
	hungThan: FiveElement[];
	scores: Record<string, number>;
}

export interface BaziResult {
	pillars: BaziChart;
	energyFlow: EnergyNode[];
	interactions: Interaction[];
	centerZone: CenterZoneAnalysis;
	structure: string;
	structureType: string; // 'Nội Cách' | 'Ngoại Cách'
	limitScore: LimitScoreProfile;
	auditLogs: string[];
}
