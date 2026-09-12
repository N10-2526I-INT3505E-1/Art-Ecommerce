// src/bazi/bazi.constants.ts

import type { EarthlyBranch, FiveElement, HeavenlyStem, LifeCycleStage } from './bazi.types';

// =============================================================================
// 1. CẤU HÌNH VẬT LÝ (PHYSICS CONFIGURATION) - VULONG METHOD
// =============================================================================

export const LIFE_CYCLE_SCORES: Record<LifeCycleStage, number> = {
	DeVuong: 10.0,
	LamQuan: 9.0,
	QuanDoi: 8.0,
	MocDuc: 7.0,
	TruongSinh: 6.0,
	Suy: 5.1,
	Benh: 4.8,
	Tu: 3.0,
	Mo: 3.0,
	Tuyet: 3.1,
	Thai: 4.1,
	Duong: 4.2,
};

export const PHYSICS = {
	// --- TRỌNG SỐ VỊ TRÍ (WEIGHTING) ---
	// Lệnh tháng (Chi tháng) là Quan Trọng Nhất (x2.5 lần)
	WEIGHT_MONTH_BRANCH: 2.5,
	// Can tháng và Can giờ (Sát sườn Nhật chủ)
	WEIGHT_MONTH_HOUR_STEM: 1.2,
	// Chi ngày (Cung phu thê - Đế của Nhật chủ)
	WEIGHT_DAY_BRANCH: 1.5,
	// Chi giờ (Cung con cái)
	WEIGHT_HOUR_BRANCH: 1.2,
	// Trụ năm (Xa nhất)
	WEIGHT_YEAR: 0.8,

	// --- TƯƠNG TÁC HÓA HỌC ---
	FACTOR_TRANSFORM_BONUS: 1.5,
	LOSS_COMBINE_BINDING: 0.8, // Hợp không hóa mất 80% lực

	// --- VẬT LÝ KHOẢNG CÁCH ---
	LOSS_CLASH_NEAR: 0.3,
	LOSS_CLASH_GAP_1: 0.2,
	LOSS_CLASH_GAP_2: 0.1,

	// --- DÒNG CHẢY ---
	LOSS_GENERATE_SOURCE: 0.3, // Sinh xuất mất 30%
	GAIN_GENERATE_TARGET: 0.3, // Được sinh nhận 30%
	LOSS_OVERCOME_SOURCE: 0.2, // Khắc xuất mất 20%
	LOSS_OVERCOME_TARGET: 0.6, // Bị khắc mất 60% (Tăng mức sát thương để phản ánh thực tế)

	FACTOR_FLOW_INTO_CENTER: 0.6,
	FACTOR_INTRA_CENTER: 1.0,
	THRESHOLD_BLOCK: 0.5,
	THRESHOLD_VWANG: 1.0,

	LOSS_CLASH_WIN: 0.3,
	LOSS_CLASH_LOSE: 0.7,
	LOSS_CLASH_DRAW: 0.5,
	LOSS_WEALTH_EXHAUSTION: 0.2,
};

// =============================================================================
// 1b. VŨ LONG PHYSICS (GIẢI MÃ TỨ TRỤ)
// Mô hình suy hao khoảng cách (Decay) thay cho trọng số nhân phóng đại (Weighting).
// =============================================================================

export const VULONG_PHYSICS = {
	// --- TỶ LỆ SUY HAO KHI TỪ VÙNG NGOÀI NHẬP VÙNG TÂM (PDF 4, Trang 11, Mục 8) ---
	// Can Tháng, Can Ngày, Can Giờ, Chi Ngày nằm TRONG Vùng Tâm -> giữ nguyên 100%.
	DECAY_INTO_CENTER: {
		YearStem: 3 / 5, // Can Năm giảm 2/5
		YearBranch: 1 / 2, // Chi Năm giảm 1/2
		MonthBranch: 3 / 5, // Chi Tháng giảm 2/5
		HourBranch: 3 / 5, // Chi Giờ giảm 2/5
	},

	// --- MỨC SÁT THƯƠNG DO KHẮC THEO KHOẢNG CÁCH (PDF 4, Trang 9-10) ---
	DAMAGE: {
		DIRECT: 1 / 2, // Khắc trực tiếp cùng trụ -> Còn 50% -> KHÓA hành động
		NEAR: 1 / 3, // Khắc gần kề cận -> Còn 66.67% -> KHÓA hành động
		GAP_1: 1 / 5, // Khắc cách 1 ngôi -> Còn 80%
		GAP_2: 1 / 10, // Khắc cách 2 ngôi -> Còn 90%
		GAP_3: 1 / 20, // Khắc cách 3 ngôi (Năm - Giờ) -> Còn 95%
	},

	// --- ĐIỂM ĐẮC ĐỊA CHO NHẬT CHỦ (PDF 4, Trang 14 & 20) ---
	LOC_SCORE: 4.05, // Đắc Lộc (Lâm Quan)
	KINH_DUONG_SCORE: 4.3, // Đắc Kình Dương (Đế Vượng)

	// --- TIÊU CHUẨN CƯỜNG NHƯỢC (PDF 4, Trang 12, Mục 12) ---
	// Thân phải lớn hơn hành đối nghịch mạnh nhất ít nhất 1.0 đv.
	THRESHOLD_OVERCOME: 1.0,
	THRESHOLD_BLOCK: 0.1,

	// --- HÓA CỤC ---
	FACTOR_TRANSFORM_BONUS: 1.5,
	LOSS_COMBINE_BINDING: 0.8,
};

// =============================================================================
// 1c. ÁNH XẠ CHI -> CAN QUY CHUẨN VŨ LONG (PDF 4, Trang 20 & 22)
// Địa Chi cặp cố định với Dương Can / Âm Can cùng hành để tra bảng 12 trạng thái.
// Ví dụ: Ngọ luôn tính theo Bính (Đế Vượng = 10), không theo Tư Lệnh.
// =============================================================================
export const VULONG_BRANCH_TO_STEM: Record<EarthlyBranch, HeavenlyStem> = {
	Dần: 'Giáp',
	Mão: 'Ất',
	Tỵ: 'Đinh',
	Ngọ: 'Bính',
	Thìn: 'Mậu',
	Tuất: 'Mậu',
	Sửu: 'Kỷ',
	Mùi: 'Kỷ',
	Thân: 'Canh',
	Dậu: 'Tân',
	Hợi: 'Quý',
	Tý: 'Nhâm',
};

// =============================================================================
// 9. THẦN SÁT (SHEN SHA) LOOKUP TABLES
// =============================================================================

// Thiên Ất Quý Nhân (tra theo Can Năm và Can Ngày) - Chuẩn sách Vũ Long
export const THIEN_AT_QUY_NHAN: Record<HeavenlyStem, EarthlyBranch[]> = {
	Giáp: ['Sửu', 'Mùi'],
	Mậu: ['Sửu', 'Mùi'],
	Canh: ['Dần', 'Ngọ'],
	Ất: ['Tý', 'Thân'],
	Kỷ: ['Tý', 'Thân'],
	Bính: ['Hợi', 'Dậu'],
	Đinh: ['Hợi', 'Dậu'],
	Nhâm: ['Mão', 'Tỵ'],
	Quý: ['Mão', 'Tỵ'],
	Tân: ['Dần', 'Ngọ'],
};

// Văn Xương Quý Nhân (tra theo Can Ngày)
export const VAN_XUONG: Record<HeavenlyStem, EarthlyBranch> = {
	Giáp: 'Tỵ',
	Ất: 'Ngọ',
	Bính: 'Thân',
	Đinh: 'Dậu',
	Mậu: 'Thân',
	Kỷ: 'Dậu',
	Canh: 'Hợi',
	Tân: 'Tý',
	Nhâm: 'Dần',
	Quý: 'Mão',
};

// Dịch Mã (tra theo Chi Năm hoặc Chi Ngày - Tam Hợp cục)
export const DICH_MA: Record<EarthlyBranch, EarthlyBranch> = {
	Thân: 'Dần',
	Tý: 'Dần',
	Thìn: 'Dần',
	Dần: 'Thân',
	Ngọ: 'Thân',
	Tuất: 'Thân',
	Tỵ: 'Hợi',
	Dậu: 'Hợi',
	Sửu: 'Hợi',
	Hợi: 'Tỵ',
	Mão: 'Tỵ',
	Mùi: 'Tỵ',
};

// Đào Hoa / Hàm Trì (tra theo Chi Năm hoặc Chi Ngày - Tam Hợp cục)
export const DAO_HOA: Record<EarthlyBranch, EarthlyBranch> = {
	Thân: 'Dậu',
	Tý: 'Dậu',
	Thìn: 'Dậu',
	Dần: 'Mão',
	Ngọ: 'Mão',
	Tuất: 'Mão',
	Tỵ: 'Ngọ',
	Dậu: 'Ngọ',
	Sửu: 'Ngọ',
	Hợi: 'Tý',
	Mão: 'Tý',
	Mùi: 'Tý',
};

// =============================================================================
// 2. CÁC BẢNG TRA CỨU CƠ BẢN (Lookup Tables)
// =============================================================================

export const HEAVENLY_STEMS: HeavenlyStem[] = [
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
];
export const EARTHLY_BRANCHES: EarthlyBranch[] = [
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
];
export const FIVE_ELEMENTS: FiveElement[] = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];

export const ELEMENT_RELATIONS: Record<
	FiveElement,
	{ generate: FiveElement; overcome: FiveElement }
> = {
	Mộc: { generate: 'Hỏa', overcome: 'Thổ' },
	Hỏa: { generate: 'Thổ', overcome: 'Kim' },
	Thổ: { generate: 'Kim', overcome: 'Thủy' },
	Kim: { generate: 'Thủy', overcome: 'Mộc' },
	Thủy: { generate: 'Mộc', overcome: 'Hỏa' },
};

/**
 * BẢNG NHÂN NGUYÊN TƯ LỆNH (COMMANDER RULES)
 * Quy định số ngày nắm lệnh của các Can trong tháng (Tính từ ngày Tiết khí).
 * Tổng cộng khoảng 30 ngày.
 */
export const MONTH_COMMANDER_RULES: Record<
	EarthlyBranch,
	Array<{ stem: HeavenlyStem; days: number }>
> = {
	Dần: [
		{ stem: 'Mậu', days: 7 },
		{ stem: 'Bính', days: 7 },
		{ stem: 'Giáp', days: 16 },
	],
	Mão: [
		{ stem: 'Giáp', days: 10 },
		{ stem: 'Ất', days: 20 },
	],
	Thìn: [
		{ stem: 'Ất', days: 9 },
		{ stem: 'Quý', days: 3 },
		{ stem: 'Mậu', days: 18 },
	],
	Tỵ: [
		{ stem: 'Mậu', days: 5 },
		{ stem: 'Canh', days: 9 },
		{ stem: 'Bính', days: 16 },
	],
	Ngọ: [
		{ stem: 'Bính', days: 10 },
		{ stem: 'Kỷ', days: 9 },
		{ stem: 'Đinh', days: 11 },
	],
	Mùi: [
		{ stem: 'Đinh', days: 9 },
		{ stem: 'Ất', days: 3 },
		{ stem: 'Kỷ', days: 18 },
	],
	Thân: [
		{ stem: 'Mậu', days: 7 },
		{ stem: 'Nhâm', days: 7 },
		{ stem: 'Canh', days: 16 },
	],
	Dậu: [
		{ stem: 'Canh', days: 10 },
		{ stem: 'Tân', days: 20 },
	],
	Tuất: [
		{ stem: 'Tân', days: 9 },
		{ stem: 'Đinh', days: 3 },
		{ stem: 'Mậu', days: 18 },
	],
	Hợi: [
		{ stem: 'Mậu', days: 7 },
		{ stem: 'Giáp', days: 5 },
		{ stem: 'Nhâm', days: 18 },
	],
	Tý: [
		{ stem: 'Nhâm', days: 10 },
		{ stem: 'Quý', days: 20 },
	],
	Sửu: [
		{ stem: 'Quý', days: 9 },
		{ stem: 'Tân', days: 3 },
		{ stem: 'Kỷ', days: 18 },
	],
};

export const HIDDEN_STEMS: Record<
	EarthlyBranch,
	Array<{ stem: HeavenlyStem; ratio: number; isMain: boolean; nature?: 'Dry' | 'Wet' }>
> = {
	Tý: [{ stem: 'Quý', ratio: 1.0, isMain: true }],
	Sửu: [
		{ stem: 'Kỷ', ratio: 0.6, isMain: true, nature: 'Wet' },
		{ stem: 'Quý', ratio: 0.3, isMain: false },
		{ stem: 'Tân', ratio: 0.1, isMain: false },
	],
	Dần: [
		{ stem: 'Giáp', ratio: 0.6, isMain: true },
		{ stem: 'Bính', ratio: 0.3, isMain: false },
		{ stem: 'Mậu', ratio: 0.1, isMain: false },
	],
	Mão: [{ stem: 'Ất', ratio: 1.0, isMain: true }],
	Thìn: [
		{ stem: 'Mậu', ratio: 0.6, isMain: true, nature: 'Wet' },
		{ stem: 'Ất', ratio: 0.3, isMain: false },
		{ stem: 'Quý', ratio: 0.1, isMain: false },
	],
	Tỵ: [
		{ stem: 'Bính', ratio: 0.6, isMain: true },
		{ stem: 'Mậu', ratio: 0.3, isMain: false, nature: 'Dry' },
		{ stem: 'Canh', ratio: 0.1, isMain: false },
	],
	Ngọ: [
		{ stem: 'Đinh', ratio: 0.7, isMain: true },
		{ stem: 'Kỷ', ratio: 0.3, isMain: false, nature: 'Dry' },
	],
	Mùi: [
		{ stem: 'Kỷ', ratio: 0.6, isMain: true, nature: 'Dry' },
		{ stem: 'Đinh', ratio: 0.3, isMain: false },
		{ stem: 'Ất', ratio: 0.1, isMain: false },
	],
	Thân: [
		{ stem: 'Canh', ratio: 0.6, isMain: true },
		{ stem: 'Nhâm', ratio: 0.3, isMain: false },
		{ stem: 'Mậu', ratio: 0.1, isMain: false },
	],
	Dậu: [{ stem: 'Tân', ratio: 1.0, isMain: true }],
	Tuất: [
		{ stem: 'Mậu', ratio: 0.6, isMain: true, nature: 'Dry' },
		{ stem: 'Tân', ratio: 0.3, isMain: false },
		{ stem: 'Đinh', ratio: 0.1, isMain: false },
	],
	Hợi: [
		{ stem: 'Nhâm', ratio: 0.7, isMain: true },
		{ stem: 'Giáp', ratio: 0.3, isMain: false },
	],
};

// =============================================================================
// 3. VÒNG TRÀNG SINH (LIFE CYCLE TABLE) - FULL
// Nguyên tắc: Dương thuận, Âm nghịch. Hỏa Thổ đồng cung.
// =============================================================================
export const LIFE_CYCLE_TABLE: Record<HeavenlyStem, Record<EarthlyBranch, LifeCycleStage>> = {
	Giáp: {
		Hợi: 'TruongSinh',
		Tý: 'MocDuc',
		Sửu: 'QuanDoi',
		Dần: 'LamQuan',
		Mão: 'DeVuong',
		Thìn: 'Suy',
		Tỵ: 'Benh',
		Ngọ: 'Tu',
		Mùi: 'Mo',
		Thân: 'Tuyet',
		Dậu: 'Thai',
		Tuất: 'Duong',
	},
	Ất: {
		Ngọ: 'TruongSinh',
		Tỵ: 'MocDuc',
		Thìn: 'QuanDoi',
		Mão: 'LamQuan',
		Dần: 'DeVuong',
		Sửu: 'Suy',
		Tý: 'Benh',
		Hợi: 'Tu',
		Tuất: 'Mo',
		Dậu: 'Tuyet',
		Thân: 'Thai',
		Mùi: 'Duong',
	},
	Bính: {
		Dần: 'TruongSinh',
		Mão: 'MocDuc',
		Thìn: 'QuanDoi',
		Tỵ: 'LamQuan',
		Ngọ: 'DeVuong',
		Mùi: 'Suy',
		Thân: 'Benh',
		Dậu: 'Tu',
		Tuất: 'Mo',
		Hợi: 'Tuyet',
		Tý: 'Thai',
		Sửu: 'Duong',
	},
	Đinh: {
		Dậu: 'TruongSinh',
		Thân: 'MocDuc',
		Mùi: 'QuanDoi',
		Ngọ: 'LamQuan',
		Tỵ: 'DeVuong',
		Thìn: 'Suy',
		Mão: 'Benh',
		Dần: 'Tu',
		Sửu: 'Mo',
		Tý: 'Tuyet',
		Hợi: 'Thai',
		Tuất: 'Duong',
	},
	// Mậu Thổ: Hỏa Thổ đồng cung
	Mậu: {
		Dần: 'TruongSinh',
		Mão: 'MocDuc',
		Thìn: 'QuanDoi',
		Tỵ: 'LamQuan',
		Ngọ: 'DeVuong',
		Mùi: 'Suy',
		Thân: 'Benh',
		Dậu: 'Tu',
		Tuất: 'Mo',
		Hợi: 'Tuyet',
		Tý: 'Thai',
		Sửu: 'Duong',
	},
	// Kỷ Thổ: Hỏa Thổ đồng cung
	Kỷ: {
		Dậu: 'TruongSinh',
		Thân: 'MocDuc',
		Mùi: 'QuanDoi',
		Ngọ: 'LamQuan',
		Tỵ: 'DeVuong',
		Thìn: 'Suy',
		Mão: 'Benh',
		Dần: 'Tu',
		Sửu: 'Mo',
		Tý: 'Tuyet',
		Hợi: 'Thai',
		Tuất: 'Duong',
	},
	Canh: {
		Tỵ: 'TruongSinh',
		Ngọ: 'MocDuc',
		Mùi: 'QuanDoi',
		Thân: 'LamQuan',
		Dậu: 'DeVuong',
		Tuất: 'Suy',
		Hợi: 'Benh',
		Tý: 'Tu',
		Sửu: 'Mo',
		Dần: 'Tuyet',
		Mão: 'Thai',
		Thìn: 'Duong',
	},
	Tân: {
		Tý: 'TruongSinh',
		Hợi: 'MocDuc',
		Tuất: 'QuanDoi',
		Dậu: 'LamQuan',
		Thân: 'DeVuong',
		Mùi: 'Suy',
		Ngọ: 'Benh',
		Tỵ: 'Tu',
		Thìn: 'Mo',
		Mão: 'Tuyet',
		Dần: 'Thai',
		Sửu: 'Duong',
	},
	Nhâm: {
		Thân: 'TruongSinh',
		Dậu: 'MocDuc',
		Tuất: 'QuanDoi',
		Hợi: 'LamQuan',
		Tý: 'DeVuong',
		Sửu: 'Suy',
		Dần: 'Benh',
		Mão: 'Tu',
		Thìn: 'Mo',
		Tỵ: 'Tuyet',
		Ngọ: 'Thai',
		Mùi: 'Duong',
	},
	Quý: {
		Mão: 'TruongSinh',
		Dần: 'MocDuc',
		Sửu: 'QuanDoi',
		Tý: 'LamQuan',
		Hợi: 'DeVuong',
		Tuất: 'Suy',
		Dậu: 'Benh',
		Thân: 'Tu',
		Mùi: 'Mo',
		Ngọ: 'Tuyet',
		Tỵ: 'Thai',
		Thìn: 'Duong',
	},
};

// =============================================================================
// 4. THIÊN CAN NGŨ HỢP (HEAVENLY STEM COMBINATIONS)
// =============================================================================
export const STEM_COMBINATIONS: Record<
	HeavenlyStem,
	{ target: HeavenlyStem; result: FiveElement }
> = {
	Giáp: { target: 'Kỷ', result: 'Thổ' },
	Kỷ: { target: 'Giáp', result: 'Thổ' },
	Ất: { target: 'Canh', result: 'Kim' },
	Canh: { target: 'Ất', result: 'Kim' },
	Bính: { target: 'Tân', result: 'Thủy' },
	Tân: { target: 'Bính', result: 'Thủy' },
	Đinh: { target: 'Nhâm', result: 'Mộc' },
	Nhâm: { target: 'Đinh', result: 'Mộc' },
	Mậu: { target: 'Quý', result: 'Hỏa' },
	Quý: { target: 'Mậu', result: 'Hỏa' },
};

// =============================================================================
// 5. ĐỊA CHI LỤC HỢP (BRANCH SIX HARMONY)
// =============================================================================
export const BRANCH_SIX_COMBINATIONS: Record<
	EarthlyBranch,
	{ target: EarthlyBranch; result: FiveElement }
> = {
	Tý: { target: 'Sửu', result: 'Thổ' },
	Sửu: { target: 'Tý', result: 'Thổ' },
	Dần: { target: 'Hợi', result: 'Mộc' },
	Hợi: { target: 'Dần', result: 'Mộc' },
	Mão: { target: 'Tuất', result: 'Hỏa' },
	Tuất: { target: 'Mão', result: 'Hỏa' },
	Thìn: { target: 'Dậu', result: 'Kim' },
	Dậu: { target: 'Thìn', result: 'Kim' },
	Tỵ: { target: 'Thân', result: 'Thủy' },
	Thân: { target: 'Tỵ', result: 'Thủy' },
	Ngọ: { target: 'Mùi', result: 'Thổ' },
	Mùi: { target: 'Ngọ', result: 'Thổ' },
};

// =============================================================================
// 6. ĐỊA CHI TAM HỢP (BRANCH TRIPLE HARMONY)
// =============================================================================
// Cấu trúc: { 'Thân': { group: ['Thân', 'Tý', 'Thìn'], result: 'Thủy' }, ... }
export const BRANCH_TRI_COMBINATIONS: Record<
	EarthlyBranch,
	{ group: EarthlyBranch[]; result: FiveElement }
> = {
	Thân: { group: ['Thân', 'Tý', 'Thìn'], result: 'Thủy' },
	Tý: { group: ['Thân', 'Tý', 'Thìn'], result: 'Thủy' },
	Thìn: { group: ['Thân', 'Tý', 'Thìn'], result: 'Thủy' },
	Dần: { group: ['Dần', 'Ngọ', 'Tuất'], result: 'Hỏa' },
	Ngọ: { group: ['Dần', 'Ngọ', 'Tuất'], result: 'Hỏa' },
	Tuất: { group: ['Dần', 'Ngọ', 'Tuất'], result: 'Hỏa' },
	Tỵ: { group: ['Tỵ', 'Dậu', 'Sửu'], result: 'Kim' },
	Dậu: { group: ['Tỵ', 'Dậu', 'Sửu'], result: 'Kim' },
	Sửu: { group: ['Tỵ', 'Dậu', 'Sửu'], result: 'Kim' },
	Hợi: { group: ['Hợi', 'Mão', 'Mùi'], result: 'Mộc' },
	Mão: { group: ['Hợi', 'Mão', 'Mùi'], result: 'Mộc' },
	Mùi: { group: ['Hợi', 'Mão', 'Mùi'], result: 'Mộc' },
};

// =============================================================================
// 7. ĐỊA CHI TAM HỘI (SEASONAL COMBINATION)
// =============================================================================
export const BRANCH_SEASONAL_COMBINATIONS: Record<
	EarthlyBranch,
	{ group: EarthlyBranch[]; result: FiveElement }
> = {
	Hợi: { group: ['Hợi', 'Tý', 'Sửu'], result: 'Thủy' },
	Tý: { group: ['Hợi', 'Tý', 'Sửu'], result: 'Thủy' },
	Sửu: { group: ['Hợi', 'Tý', 'Sửu'], result: 'Thủy' },
	Dần: { group: ['Dần', 'Mão', 'Thìn'], result: 'Mộc' },
	Mão: { group: ['Dần', 'Mão', 'Thìn'], result: 'Mộc' },
	Thìn: { group: ['Dần', 'Mão', 'Thìn'], result: 'Mộc' },
	Tỵ: { group: ['Tỵ', 'Ngọ', 'Mùi'], result: 'Hỏa' },
	Ngọ: { group: ['Tỵ', 'Ngọ', 'Mùi'], result: 'Hỏa' },
	Mùi: { group: ['Tỵ', 'Ngọ', 'Mùi'], result: 'Hỏa' },
	Thân: { group: ['Thân', 'Dậu', 'Tuất'], result: 'Kim' },
	Dậu: { group: ['Thân', 'Dậu', 'Tuất'], result: 'Kim' },
	Tuất: { group: ['Thân', 'Dậu', 'Tuất'], result: 'Kim' },
};

// =============================================================================
// 7b. ĐỊA CHI BÁN HỢP (HALF TRI-COMBINATIONS)
// Hai chi trong bộ Tam Hợp, hóa cục mạnh nếu có Dẫn Thần thấu lộ.
// =============================================================================
export const BRANCH_HALF_COMBINATIONS: Array<{
	pair: [EarthlyBranch, EarthlyBranch];
	result: FiveElement;
	requiredLead: FiveElement;
}> = [
	{ pair: ['Dần', 'Ngọ'], result: 'Hỏa', requiredLead: 'Hỏa' },
	{ pair: ['Ngọ', 'Tuất'], result: 'Hỏa', requiredLead: 'Hỏa' },
	{ pair: ['Thân', 'Tý'], result: 'Thủy', requiredLead: 'Thủy' },
	{ pair: ['Tý', 'Thìn'], result: 'Thủy', requiredLead: 'Thủy' },
	{ pair: ['Tỵ', 'Dậu'], result: 'Kim', requiredLead: 'Kim' },
	{ pair: ['Dậu', 'Sửu'], result: 'Kim', requiredLead: 'Kim' },
	{ pair: ['Hợi', 'Mão'], result: 'Mộc', requiredLead: 'Mộc' },
	{ pair: ['Mão', 'Mùi'], result: 'Mộc', requiredLead: 'Mộc' },
];

// =============================================================================
// 8. ĐỊA CHI LỤC XUNG (BRANCH CLASHES)
// =============================================================================
export const BRANCH_CLASHES: Record<EarthlyBranch, EarthlyBranch> = {
	Tý: 'Ngọ',
	Ngọ: 'Tý',
	Sửu: 'Mùi',
	Mùi: 'Sửu',
	Dần: 'Thân',
	Thân: 'Dần',
	Mão: 'Dậu',
	Dậu: 'Mão',
	Thìn: 'Tuất',
	Tuất: 'Thìn',
	Tỵ: 'Hợi',
	Hợi: 'Tỵ',
};

export const TEN_GODS_MAPPING: Record<FiveElement, Record<string, FiveElement>> = {
	Mộc: {
		TyKien: 'Mộc',
		KiepTai: 'Mộc',
		ThucThan: 'Hỏa',
		ThuongQuan: 'Hỏa',
		ChinhTai: 'Thổ',
		ThienTai: 'Thổ',
		ChinhQuan: 'Kim',
		ThatSat: 'Kim',
		ChinhAn: 'Thủy',
		ThienAn: 'Thủy',
	},
	Hỏa: {
		TyKien: 'Hỏa',
		KiepTai: 'Hỏa',
		ThucThan: 'Thổ',
		ThuongQuan: 'Thổ',
		ChinhTai: 'Kim',
		ThienTai: 'Kim',
		ChinhQuan: 'Thủy',
		ThatSat: 'Thủy',
		ChinhAn: 'Mộc',
		ThienAn: 'Mộc',
	},
	Thổ: {
		TyKien: 'Thổ',
		KiepTai: 'Thổ',
		ThucThan: 'Kim',
		ThuongQuan: 'Kim',
		ChinhTai: 'Thủy',
		ThienTai: 'Thủy',
		ChinhQuan: 'Mộc',
		ThatSat: 'Mộc',
		ChinhAn: 'Hỏa',
		ThienAn: 'Hỏa',
	},
	Kim: {
		TyKien: 'Kim',
		KiepTai: 'Kim',
		ThucThan: 'Thủy',
		ThuongQuan: 'Thủy',
		ChinhTai: 'Mộc',
		ThienTai: 'Mộc',
		ChinhQuan: 'Hỏa',
		ThatSat: 'Hỏa',
		ChinhAn: 'Thổ',
		ThienAn: 'Thổ',
	},
	Thủy: {
		TyKien: 'Thủy',
		KiepTai: 'Thủy',
		ThucThan: 'Mộc',
		ThuongQuan: 'Mộc',
		ChinhTai: 'Hỏa',
		ThienTai: 'Hỏa',
		ChinhQuan: 'Thổ',
		ThatSat: 'Thổ',
		ChinhAn: 'Kim',
		ThienAn: 'Kim',
	},
};

export const STEM_POLARITY: Record<HeavenlyStem, 'Yang' | 'Yin'> = {
	Giáp: 'Yang',
	Ất: 'Yin',
	Bính: 'Yang',
	Đinh: 'Yin',
	Mậu: 'Yang',
	Kỷ: 'Yin',
	Canh: 'Yang',
	Tân: 'Yin',
	Nhâm: 'Yang',
	Quý: 'Yin',
};

export const SOLAR_TERM_TO_BRANCH_INDEX: Record<string, number> = {
	'Lập xuân': 2,
	'Vũ thủy': 2,
	'Kinh trập': 3,
	'Xuân phân': 3,
	'Thanh minh': 4,
	'Cốc vũ': 4,
	'Lập hạ': 5,
	'Tiểu mãn': 5,
	'Mang chủng': 6,
	'Hạ chí': 6,
	'Tiểu thử': 7,
	'Đại thử': 7,
	'Lập thu': 8,
	'Xử thử': 8,
	'Bạch lộ': 9,
	'Thu phân': 9,
	'Hàn lộ': 10,
	'Sương giáng': 10,
	'Lập đông': 11,
	'Tiểu tuyết': 11,
	'Đại tuyết': 0,
	'Đông chí': 0,
	'Tiểu hàn': 1,
	'Đại hàn': 1,
};
