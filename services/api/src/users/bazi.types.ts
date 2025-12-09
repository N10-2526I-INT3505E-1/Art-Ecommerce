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

// Một Trụ (Cột)
export interface Pillar {
	position: PillarPosition;
	stem: HeavenlyStem;
	branch: EarthlyBranch;
	stemElement: FiveElement;
	branchElement: FiveElement;
}

// Bảng Bát Tự (Input cho Service)
export interface BaziChart {
	year: Pillar;
	month: Pillar;
	day: Pillar;
	hour: Pillar;
}

// --- ENERGY PHYSICS MODEL (VULONG) ---

// Thông tin Can tàng (để tra cứu)
export interface HiddenStemInfo {
	stem: HeavenlyStem;
	ratio: number;
	isMain: boolean;
}

// Nhật ký biến đổi điểm (để giải thích cho user)
export interface ScoreModification {
	reason: string;
	valueChange: number;
	factor: number;
}

// Node năng lượng (Đại diện cho Can hoặc Tàng Can)
export interface EnergyNode {
	id: string;
	source: PillarPosition;
	type: 'Stem' | 'HiddenStem';
	name: string;
	element: FiveElement;
	branchOwner?: EarthlyBranch; // Thuộc chi nào (nếu là tàng can)

	lifeCycleStage: LifeCycleStage;
	baseScore: number; // Điểm gốc theo lệnh tháng
	currentScore: number; // Điểm thực tế sau tương tác/dòng chảy

	isBlocked: boolean; // Bị vô hiệu hóa?
	isCombined: boolean; // Đang hợp?
	transformTo?: FiveElement; // Hóa khí thành hành gì?

	modifications: ScoreModification[];
}

// Tương tác (Hợp/Xung)
export type InteractionType = 'TamHoi' | 'TamHop' | 'LucHop' | 'LucXung' | 'NguHop';

export interface Interaction {
	// Phần này có thể mở rộng để lưu chi tiết ai tương tác với ai
	type: InteractionType;
	description?: string;
}

// --- ANALYSIS RESULTS ---

// Phân tích Vùng Tâm
export interface CenterZoneAnalysis {
	dayMasterScore: number;
	partyScore: number; // Phe Ta
	enemyScore: number; // Phe Địch
	diffScore: number; // Hiệu số (Ta - Địch)
	isVwang: boolean;
	isStrongVwang: boolean;
	isWeakVwang: boolean;
}

// Hồ sơ Điểm Hạn (Output quan trọng nhất)
export interface LimitScoreProfile {
	dungThan: FiveElement[];
	hyThan: FiveElement[];
	kyThan: FiveElement[];
	hungThan: FiveElement[];
	scores: Record<FiveElement, number>; // Mapping: Kim -> -1.0, Mộc -> 0.5...
}

// Kết quả trả về cuối cùng của Service
export interface BaziResult {
	pillars: BaziChart;
	energyFlow: EnergyNode[]; // Sơ đồ dòng chảy (Frontend vẽ cái này)
	interactions: Interaction[];
	centerZone: CenterZoneAnalysis; // Số liệu cường nhược
	structure: string; // Tên cách cục (VD: Chính Quan)
	limitScore: LimitScoreProfile; // Điểm hạn dùng để dự đoán năm
	auditLogs: string[]; // Nhật ký các sự kiện quan trọng trong tính toán
}
