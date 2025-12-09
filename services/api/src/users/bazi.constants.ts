import type { EarthlyBranch, FiveElement, HeavenlyStem, LifeCycleStage } from './bazi.types';

// =============================================================================
// 1. QUAN HỆ NGŨ HÀNH (SINH / KHẮC)
// =============================================================================
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
	], // Mậu ở Hợi là khí thế, một số phái bỏ qua
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

// =============================================================================
// 2. TÀNG CAN (HIDDEN STEMS)
// Tỷ lệ (ratio) được ước lượng để dùng cho tính toán định lượng của VuLong.
// =============================================================================
export const HIDDEN_STEMS: Record<
	EarthlyBranch,
	Array<{ stem: HeavenlyStem; ratio: number; isMain: boolean; nature?: 'Dry' | 'Wet' }>
> = {
	Tý: [{ stem: 'Quý', ratio: 1.0, isMain: true }],
	Sửu: [
		{ stem: 'Kỷ', ratio: 0.6, isMain: true, nature: 'Wet' }, // Thấp Thổ
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
		{ stem: 'Mậu', ratio: 0.6, isMain: true, nature: 'Wet' }, // Thấp Thổ
		{ stem: 'Ất', ratio: 0.3, isMain: false },
		{ stem: 'Quý', ratio: 0.1, isMain: false },
	],
	Tỵ: [
		{ stem: 'Bính', ratio: 0.6, isMain: true },
		{ stem: 'Mậu', ratio: 0.3, isMain: false, nature: 'Dry' }, // Táo Thổ (Theo VuLong/Manh phái)
		{ stem: 'Canh', ratio: 0.1, isMain: false },
	],
	Ngọ: [
		{ stem: 'Đinh', ratio: 0.7, isMain: true },
		{ stem: 'Kỷ', ratio: 0.3, isMain: false, nature: 'Dry' }, // Táo Thổ
	],
	Mùi: [
		{ stem: 'Kỷ', ratio: 0.6, isMain: true, nature: 'Dry' }, // Táo Thổ
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
		{ stem: 'Mậu', ratio: 0.6, isMain: true, nature: 'Dry' }, // Táo Thổ
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
		// Dương Mộc: Sinh Hợi, Vượng Mão, Tử Ngọ
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
		// Âm Mộc: Sinh Ngọ, Vượng Dần, Tử Hợi (Nghịch hành)
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
		// Dương Hỏa: Sinh Dần, Vượng Ngọ, Tử Dậu
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
		// Âm Hỏa: Sinh Dậu, Vượng Tỵ, Tử Dần (Nghịch hành)
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
	Mậu: {
		// Dương Thổ (Hỏa Thổ đồng cung): Giống Bính
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
	Kỷ: {
		// Âm Thổ (Hỏa Thổ đồng cung): Giống Đinh
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
		// Dương Kim: Sinh Tỵ, Vượng Dậu, Tử Tý
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
		// Âm Kim: Sinh Tý, Vượng Thân, Tử Tỵ (Nghịch hành)
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
		// Dương Thủy: Sinh Thân, Vượng Tý, Tử Mão
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
		// Âm Thủy: Sinh Mão, Vượng Hợi, Tử Thân (Nghịch hành)
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
	Ngọ: { target: 'Mùi', result: 'Thổ' }, // Một số sách nói hóa Hỏa, nhưng Trích Thiên Tủy thường coi Mùi là Thổ燥
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

// Map Can Dương/Âm
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

// Map ngược từ Hành -> Can Dương/Âm (Dùng để xử lý các Node Hóa cục không có tên Can cụ thể)
export const ELEMENT_TO_STEMS: Record<FiveElement, { yang: HeavenlyStem; yin: HeavenlyStem }> = {
	Mộc: { yang: 'Giáp', yin: 'Ất' },
	Hỏa: { yang: 'Bính', yin: 'Đinh' },
	Thổ: { yang: 'Mậu', yin: 'Kỷ' },
	Kim: { yang: 'Canh', yin: 'Tân' },
	Thủy: { yang: 'Nhâm', yin: 'Quý' },
};

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

export const SOLAR_TERM_TO_BRANCH_INDEX: Record<string, number> = {
	'Lập xuân': 2,
	'Vũ thủy': 2, // Dần (Tháng 1) - Index 2
	'Kinh trập': 3,
	'Xuân phân': 3, // Mão (Tháng 2) - Index 3
	'Thanh minh': 4,
	'Cốc vũ': 4, // Thìn (Tháng 3) - Index 4
	'Lập hạ': 5,
	'Tiểu mãn': 5, // Tỵ (Tháng 4) - Index 5
	'Mang chủng': 6,
	'Hạ chí': 6, // Ngọ (Tháng 5) - Index 6
	'Tiểu thử': 7,
	'Đại thử': 7, // Mùi (Tháng 6) - Index 7
	'Lập thu': 8,
	'Xử thử': 8, // Thân (Tháng 7) - Index 8
	'Bạch lộ': 9,
	'Thu phân': 9, // Dậu (Tháng 8) - Index 9
	'Hàn lộ': 10,
	'Sương giáng': 10, // Tuất (Tháng 9) - Index 10
	'Lập đông': 11,
	'Tiểu tuyết': 11, // Hợi (Tháng 10) - Index 11
	'Đại tuyết': 0,
	'Đông chí': 0, // Tý (Tháng 11) - Index 0
	'Tiểu hàn': 1,
	'Đại hàn': 1, // Sửu (Tháng 12) - Index 1
};

export const FLOW_PHYSICS = {
	// 1. SINH (Generate): A sinh B
	// A mất khí để sinh B. B nhận được năng lượng.
	GENERATE_SOURCE_LOSS: 0.3, // Nguồn mất 30% lực
	GENERATE_TARGET_GAIN: 0.3, // Đích nhận 30% lực (Giả sử hiệu suất 100%)

	// 2. KHẮC (Overcome): A khắc B
	// A tốn lực để khắc B. B bị tổn thương nặng.
	OVERCOME_SOURCE_LOSS: 0.2, // Nguồn mất 20% lực do ma sát/phản lực
	OVERCOME_TARGET_LOSS: 0.4, // Đích mất 40% lực do bị khắc

	// 3. TỶ HÒA (Same): A cùng hành B
	// Cộng hưởng năng lượng.
	SAME_RESONANCE: 0.1, // Cả hai cùng tăng 10% khí thế

	// 4. BỊ KHẮC (Inverse): A bị B khắc (ngược dòng)
	// Dòng chảy bị chặn, năng lượng không truyền qua được.
	BLOCKED_FLOW: 0.0,

	// 5. KHOẢNG CÁCH (Distance Decay)
	// Tác động trực tiếp vào Nhật chủ
	DISTANCE_NEAR: 1.0, // Chi Ngày, Can Tháng, Can Giờ
	DISTANCE_FAR: 0.6, // Chi Tháng, Chi Giờ
	DISTANCE_REMOTE: 0.2, // Trụ Năm (Rất xa, phải qua Tháng mới tới được)

	DISTANCE_DECAY_RATE: 2 / 5, // Đi vào vùng tâm bị giảm 2/5 (còn lại 0.6)
	CLASH_NEAR_LOSS: 1 / 3, // Khắc gần mất 1/3
	CLASH_1GAP_LOSS: 1 / 5, // Khắc cách 1 ngôi mất 1/5
	CLASH_2GAP_LOSS: 1 / 10, // Khắc cách 2 ngôi mất 1/10
};
