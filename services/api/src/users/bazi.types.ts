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

export type TenGod = 'TyKiep' | 'ThucThuong' | 'TaiTinh' | 'QuanSat' | 'KieuAn';

export type Pillar = {
	can: HeavenlyStem;
	chi: EarthlyBranch;
	canIndex: number;
	chiIndex: number;
};

export type BaziChart = {
	year: Pillar;
	month: Pillar;
	day: Pillar;
	hour: Pillar;
};

export interface AnalysisResult {
	day_master_status: string;
	structure_type: string;
	structure_name: string;
	analysis_reason: string;
	favorable_elements: {
		dung_than: FiveElement[]; // Dụng thần (Thuốc chữa bệnh)
		hy_than: FiveElement[]; // Hỷ thần (Sinh Dụng thần)
		ky_than: FiveElement[]; // Kỵ thần (Khắc Dụng thần hoặc làm bệnh nặng thêm)
		cuu_than: FiveElement[]; // Cừu thần (Sinh Kỵ thần)
		nhan_than: FiveElement[]; // Nhàn thần (Các hành còn lại)
	};

	element_scores: Record<FiveElement, number>;
	shen_sha: string[];
}

// --- CONSTANTS & MAPPINGS ---

export const STEM_ELEMENTS: Record<HeavenlyStem, FiveElement> = {
	Giáp: 'Mộc',
	Ất: 'Mộc',
	Bính: 'Hỏa',
	Đinh: 'Hỏa',
	Mậu: 'Thổ',
	Kỷ: 'Thổ',
	Canh: 'Kim',
	Tân: 'Kim',
	Nhâm: 'Thủy',
	Quý: 'Thủy',
};

export const BRANCH_ELEMENTS: Record<EarthlyBranch, FiveElement> = {
	Dần: 'Mộc',
	Mão: 'Mộc',
	Tỵ: 'Hỏa',
	Ngọ: 'Hỏa',
	Thân: 'Kim',
	Dậu: 'Kim',
	Hợi: 'Thủy',
	Tý: 'Thủy',
	Thìn: 'Thổ',
	Tuất: 'Thổ',
	Sửu: 'Thổ',
	Mùi: 'Thổ',
};

export const PRODUCING_CYCLE: Record<FiveElement, FiveElement> = {
	Mộc: 'Hỏa',
	Hỏa: 'Thổ',
	Thổ: 'Kim',
	Kim: 'Thủy',
	Thủy: 'Mộc',
};
export const CONTROLLING_CYCLE: Record<FiveElement, FiveElement> = {
	Mộc: 'Thổ',
	Thổ: 'Thủy',
	Thủy: 'Hỏa',
	Hỏa: 'Kim',
	Kim: 'Mộc',
};

export const TEN_GODS_MAPPING: Record<FiveElement, Record<TenGod, FiveElement>> = {
	Mộc: { TyKiep: 'Mộc', ThucThuong: 'Hỏa', TaiTinh: 'Thổ', QuanSat: 'Kim', KieuAn: 'Thủy' },
	Hỏa: { TyKiep: 'Hỏa', ThucThuong: 'Thổ', TaiTinh: 'Kim', QuanSat: 'Thủy', KieuAn: 'Mộc' },
	Thổ: { TyKiep: 'Thổ', ThucThuong: 'Kim', TaiTinh: 'Thủy', QuanSat: 'Mộc', KieuAn: 'Hỏa' },
	Kim: { TyKiep: 'Kim', ThucThuong: 'Thủy', TaiTinh: 'Mộc', QuanSat: 'Hỏa', KieuAn: 'Thổ' },
	Thủy: { TyKiep: 'Thủy', ThucThuong: 'Mộc', TaiTinh: 'Hỏa', QuanSat: 'Thổ', KieuAn: 'Kim' },
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

// Điểm tàng can (VuLong: Căn cứ vào tỷ lệ khí)
export const HIDDEN_STEMS_SCORES: Record<
	EarthlyBranch,
	Array<{ can: HeavenlyStem; score: number }>
> = {
	Tý: [{ can: 'Quý', score: 30 }],
	Sửu: [
		{ can: 'Kỷ', score: 18 },
		{ can: 'Quý', score: 9 },
		{ can: 'Tân', score: 3 },
	],
	Dần: [
		{ can: 'Giáp', score: 18 },
		{ can: 'Bính', score: 9 },
		{ can: 'Mậu', score: 3 },
	],
	Mão: [{ can: 'Ất', score: 30 }],
	Thìn: [
		{ can: 'Mậu', score: 18 },
		{ can: 'Ất', score: 9 },
		{ can: 'Quý', score: 3 },
	],
	Tỵ: [
		{ can: 'Bính', score: 18 },
		{ can: 'Mậu', score: 9 },
		{ can: 'Canh', score: 3 },
	],
	Ngọ: [
		{ can: 'Đinh', score: 21 },
		{ can: 'Kỷ', score: 9 },
	],
	Mùi: [
		{ can: 'Kỷ', score: 18 },
		{ can: 'Đinh', score: 9 },
		{ can: 'Ất', score: 3 },
	],
	Thân: [
		{ can: 'Canh', score: 18 },
		{ can: 'Nhâm', score: 9 },
		{ can: 'Mậu', score: 3 },
	],
	Dậu: [{ can: 'Tân', score: 30 }],
	Tuất: [
		{ can: 'Mậu', score: 18 },
		{ can: 'Tân', score: 9 },
		{ can: 'Đinh', score: 3 },
	],
	Hợi: [
		{ can: 'Nhâm', score: 21 },
		{ can: 'Giáp', score: 9 },
	],
};

// --- QUAN HỆ ĐỊA CHI ---
export const BRANCH_INTERACTIONS = {
	SIX_HARMONY: {
		// Lục Hợp
		Tý: 'Sửu',
		Sửu: 'Tý',
		Dần: 'Hợi',
		Hợi: 'Dần',
		Mão: 'Tuất',
		Tuất: 'Mão',
		Thìn: 'Dậu',
		Dậu: 'Thìn',
		Tỵ: 'Thân',
		Thân: 'Tỵ',
		Ngọ: 'Mùi',
		Mùi: 'Ngọ',
	},
	CLASH: {
		// Lục Xung
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
	},
	TRIPLE_HARMONY: {
		// Tam Hợp
		Thủy: ['Thân', 'Tý', 'Thìn'],
		Hỏa: ['Dần', 'Ngọ', 'Tuất'],
		Kim: ['Tỵ', 'Dậu', 'Sửu'],
		Mộc: ['Hợi', 'Mão', 'Mùi'],
	},
	SEASONAL_COMBINATION: {
		// Tam Hội
		Mộc: ['Dần', 'Mão', 'Thìn'],
		Hỏa: ['Tỵ', 'Ngọ', 'Mùi'],
		Kim: ['Thân', 'Dậu', 'Tuất'],
		Thủy: ['Hợi', 'Tý', 'Sửu'],
	},
};

// --- THẦN SÁT ---
export const SHEN_SHA = {
	THIEN_AT: 'Thiên Ất Quý Nhân',
	VAN_XUONG: 'Văn Xương',
	DICH_MA: 'Dịch Mã',
	DAO_HOA: 'Đào Hoa (Hàm Trì)',
	HOA_CAI: 'Hoa Cái',
	KINH_DUONG: 'Kình Dương (Dương Nhận)',
	KHOI_CANH: 'Khôi Canh',
	LOC_THAN: 'Lộc Thần',
	KHONG_VONG: 'Không Vong',
	THIEN_LA: 'Thiên La',
	DIA_VONG: 'Địa Võng',
	THIEN_DUC: 'Thiên Đức Quý Nhân', // Mới
	NGUYET_DUC: 'Nguyệt Đức Quý Nhân', // Mới
} as const;

export const SHEN_SHA_RULES = {
	// Tra theo Can Ngày/Năm
	THIEN_AT: {
		Giáp: ['Sửu', 'Mùi'],
		Mậu: ['Sửu', 'Mùi'],
		Canh: ['Sửu', 'Mùi'],
		Ất: ['Tý', 'Thân'],
		Kỷ: ['Tý', 'Thân'],
		Bính: ['Hợi', 'Dậu'],
		Đinh: ['Hợi', 'Dậu'],
		Nhâm: ['Tỵ', 'Mão'],
		Quý: ['Tỵ', 'Mão'],
		Tân: ['Ngọ', 'Dần'],
	},
	VAN_XUONG: {
		Giáp: 'Tỵ',
		Ất: 'Ngọ',
		Bính: 'Thân',
		Mậu: 'Thân',
		Đinh: 'Dậu',
		Kỷ: 'Dậu',
		Canh: 'Hợi',
		Tân: 'Tý',
		Nhâm: 'Dần',
		Quý: 'Mão',
	},
	LOC_THAN: {
		Giáp: 'Dần',
		Ất: 'Mão',
		Bính: 'Tỵ',
		Mậu: 'Tỵ',
		Đinh: 'Ngọ',
		Kỷ: 'Ngọ',
		Canh: 'Thân',
		Tân: 'Dậu',
		Nhâm: 'Hợi',
		Quý: 'Tý',
	},
	KINH_DUONG: {
		Giáp: 'Mão',
		Ất: 'Thìn',
		Bính: 'Ngọ',
		Mậu: 'Ngọ',
		Đinh: 'Mùi',
		Kỷ: 'Mùi',
		Canh: 'Dậu',
		Tân: 'Tuất',
		Nhâm: 'Tý',
		Quý: 'Sửu',
	},
	// Tra theo Chi Ngày/Năm
	DICH_MA: {
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
	},
	DAO_HOA: {
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
	},
	HOA_CAI: {
		Thân: 'Thìn',
		Tý: 'Thìn',
		Thìn: 'Thìn',
		Dần: 'Tuất',
		Ngọ: 'Tuất',
		Tuất: 'Tuất',
		Tỵ: 'Sửu',
		Dậu: 'Sửu',
		Sửu: 'Sửu',
		Hợi: 'Mùi',
		Mão: 'Mùi',
		Mùi: 'Mùi',
	},
	THIEN_DUC: {
		Tý: 'Tỵ',
		Sửu: 'Canh',
		Dần: 'Đinh',
		Mão: 'Thân',
		Thìn: 'Nhâm',
		Tỵ: 'Tân',
		Ngọ: 'Hợi',
		Mùi: 'Giáp',
		Thân: 'Quý',
		Dậu: 'Dần',
		Tuất: 'Bính',
		Hợi: 'Ất',
	},
	NGUYET_DUC: {
		Dần: 'Bính',
		Ngọ: 'Bính',
		Tuất: 'Bính',
		Thân: 'Nhâm',
		Tý: 'Nhâm',
		Thìn: 'Nhâm',
		Hợi: 'Giáp',
		Mão: 'Giáp',
		Mùi: 'Giáp',
		Tỵ: 'Canh',
		Dậu: 'Canh',
		Sửu: 'Canh',
	},
};

// ĐẦY ĐỦ 60 HOA GIÁP -> KHÔNG VONG
export const KHONG_VONG_RULES: Record<string, EarthlyBranch[]> = {
	// Tuần Giáp Tý
	'Giáp Tý': ['Tuất', 'Hợi'],
	'Ất Sửu': ['Tuất', 'Hợi'],
	'Bính Dần': ['Tuất', 'Hợi'],
	'Đinh Mão': ['Tuất', 'Hợi'],
	'Mậu Thìn': ['Tuất', 'Hợi'],
	'Kỷ Tỵ': ['Tuất', 'Hợi'],
	'Canh Ngọ': ['Tuất', 'Hợi'],
	'Tân Mùi': ['Tuất', 'Hợi'],
	'Nhâm Thân': ['Tuất', 'Hợi'],
	'Quý Dậu': ['Tuất', 'Hợi'],
	// Tuần Giáp Tuất
	'Giáp Tuất': ['Thân', 'Dậu'],
	'Ất Hợi': ['Thân', 'Dậu'],
	'Bính Tý': ['Thân', 'Dậu'],
	'Đinh Sửu': ['Thân', 'Dậu'],
	'Mậu Dần': ['Thân', 'Dậu'],
	'Kỷ Mão': ['Thân', 'Dậu'],
	'Canh Thìn': ['Thân', 'Dậu'],
	'Tân Tỵ': ['Thân', 'Dậu'],
	'Nhâm Ngọ': ['Thân', 'Dậu'],
	'Quý Mùi': ['Thân', 'Dậu'],
	// Tuần Giáp Thân
	'Giáp Thân': ['Ngọ', 'Mùi'],
	'Ất Dậu': ['Ngọ', 'Mùi'],
	'Bính Tuất': ['Ngọ', 'Mùi'],
	'Đinh Hợi': ['Ngọ', 'Mùi'],
	'Mậu Tý': ['Ngọ', 'Mùi'],
	'Kỷ Sửu': ['Ngọ', 'Mùi'],
	'Canh Dần': ['Ngọ', 'Mùi'],
	'Tân Mão': ['Ngọ', 'Mùi'],
	'Nhâm Thìn': ['Ngọ', 'Mùi'],
	'Quý Tỵ': ['Ngọ', 'Mùi'],
	// Tuần Giáp Ngọ
	'Giáp Ngọ': ['Thìn', 'Tỵ'],
	'Ất Mùi': ['Thìn', 'Tỵ'],
	'Bính Thân': ['Thìn', 'Tỵ'],
	'Đinh Dậu': ['Thìn', 'Tỵ'],
	'Mậu Tuất': ['Thìn', 'Tỵ'],
	'Kỷ Hợi': ['Thìn', 'Tỵ'],
	'Canh Tý': ['Thìn', 'Tỵ'],
	'Tân Sửu': ['Thìn', 'Tỵ'],
	'Nhâm Dần': ['Thìn', 'Tỵ'],
	'Quý Mão': ['Thìn', 'Tỵ'],
	// Tuần Giáp Thìn
	'Giáp Thìn': ['Dần', 'Mão'],
	'Ất Tỵ': ['Dần', 'Mão'],
	'Bính Ngọ': ['Dần', 'Mão'],
	'Đinh Mùi': ['Dần', 'Mão'],
	'Mậu Thân': ['Dần', 'Mão'],
	'Kỷ Dậu': ['Dần', 'Mão'],
	'Canh Tuất': ['Dần', 'Mão'],
	'Tân Hợi': ['Dần', 'Mão'],
	'Nhâm Tý': ['Dần', 'Mão'],
	'Quý Sửu': ['Dần', 'Mão'],
	// Tuần Giáp Dần
	'Giáp Dần': ['Tý', 'Sửu'],
	'Ất Mão': ['Tý', 'Sửu'],
	'Bính Thìn': ['Tý', 'Sửu'],
	'Đinh Tỵ': ['Tý', 'Sửu'],
	'Mậu Ngọ': ['Tý', 'Sửu'],
	'Kỷ Mùi': ['Tý', 'Sửu'],
	'Canh Thân': ['Tý', 'Sửu'],
	'Tân Dậu': ['Tý', 'Sửu'],
	'Nhâm Tuất': ['Tý', 'Sửu'],
	'Quý Hợi': ['Tý', 'Sửu'],
};

// Bảng Sinh Vượng Tử Tuyệt (Tràng Sinh) - Tra theo Can Ngày và Chi
// Thứ tự: Trường Sinh, Mộc Dục, Quan Đới, Lâm Quan, Đế Vượng, Suy, Bệnh, Tử, Mộ, Tuyệt, Thai, Dưỡng
// Index: 0 -> 11
export const LIFE_CYCLE = [
	'Trường Sinh',
	'Mộc Dục',
	'Quan Đới',
	'Lâm Quan',
	'Đế Vượng',
	'Suy',
	'Bệnh',
	'Tử',
	'Mộ',
	'Tuyệt',
	'Thai',
	'Dưỡng',
] as const;

export const LIFE_CYCLE_TABLE: Record<HeavenlyStem, EarthlyBranch[]> = {
	Giáp: ['Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất'],
	Bính: ['Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu'],
	Mậu: ['Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu'], // Hỏa Thổ đồng cung
	Canh: ['Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn'],
	Nhâm: ['Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi'],
	// Âm can nghịch hành (Theo Tử Bình Chân Thuyên thì Dương thuận Âm nghịch, nhưng VuLong thường dùng đồng sinh đồng tử hoặc khí thế.
	// Tuy nhiên để chuẩn xác theo bảng Sinh Vượng Tử Tuyệt truyền thống):
	Ất: ['Ngọ', 'Tỵ', 'Thìn', 'Mão', 'Dần', 'Sửu', 'Tý', 'Hợi', 'Tuất', 'Dậu', 'Thân', 'Mùi'],
	Đinh: ['Dậu', 'Thân', 'Mùi', 'Ngọ', 'Tỵ', 'Thìn', 'Mão', 'Dần', 'Sửu', 'Tý', 'Hợi', 'Tuất'],
	Kỷ: ['Dậu', 'Thân', 'Mùi', 'Ngọ', 'Tỵ', 'Thìn', 'Mão', 'Dần', 'Sửu', 'Tý', 'Hợi', 'Tuất'],
	Tân: ['Tý', 'Hợi', 'Tuất', 'Dậu', 'Thân', 'Mùi', 'Ngọ', 'Tỵ', 'Thìn', 'Mão', 'Dần', 'Sửu'],
	Quý: ['Mão', 'Dần', 'Sửu', 'Tý', 'Hợi', 'Tuất', 'Dậu', 'Thân', 'Mùi', 'Ngọ', 'Tỵ', 'Thìn'],
};

export const HEAVENLY_STEM_COMBINATIONS = {
	Giáp: { partner: 'Kỷ', output: 'Thổ' },
	Kỷ: { partner: 'Giáp', output: 'Thổ' },
	Ất: { partner: 'Canh', output: 'Kim' },
	Canh: { partner: 'Ất', output: 'Kim' },
	Bính: { partner: 'Tân', output: 'Thủy' },
	Tân: { partner: 'Bính', output: 'Thủy' },
	Đinh: { partner: 'Nhâm', output: 'Mộc' },
	Nhâm: { partner: 'Đinh', output: 'Mộc' },
	Mậu: { partner: 'Quý', output: 'Hỏa' },
	Quý: { partner: 'Mậu', output: 'Hỏa' },
} as const;
