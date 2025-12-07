import { type LunarDate, SolarDate } from '@nghiavuive/lunar_date_vi';
import type { BaziInput } from './bazi.model';
import {
	type AnalysisResult,
	type BaziChart,
	BRANCH_ELEMENTS,
	BRANCH_INTERACTIONS,
	CONTROLLING_CYCLE,
	EARTHLY_BRANCHES,
	type EarthlyBranch,
	type FiveElement,
	HEAVENLY_STEM_COMBINATIONS,
	HEAVENLY_STEMS,
	type HeavenlyStem,
	HIDDEN_STEMS_SCORES,
	KHONG_VONG_RULES,
	type Pillar,
	PRODUCING_CYCLE,
	SHEN_SHA,
	SHEN_SHA_RULES,
	SOLAR_TERM_TO_BRANCH_INDEX,
	STEM_ELEMENTS,
	TEN_GODS_MAPPING,
	type TenGod,
} from './bazi.types';

export class BaziService {
	/**
	 * Phương thức chính để tính toán và phân tích lá số Bát Tự.
	 * Quy trình:
	 * 1. Chuyển đổi Dương lịch -> Âm lịch & Can Chi (Lập Trụ).
	 * 2. Phân tích Thần Sát, Tương tác Địa chi, Điểm Ngũ hành.
	 * 3. Xác định Cách cục (Chính cách/Ngoại cách).
	 * 4. Xác định Dụng - Hỷ - Kỵ - Cừu - Nhàn thần.
	 */
	public async calculateBazi(input: Omit<BaziInput, 'user_id' | 'id'>) {
		// 1. Lập Trụ (An Sao)
		const chart = this.calculatePillars(input);

		// 2. Phân tích chuyên sâu
		const analysis = this.analyze(chart);

		// 3. Trả về kết quả đầy đủ
		return {
			...input,
			year_stem: chart.year.canIndex,
			year_branch: chart.year.chiIndex,
			month_stem: chart.month.canIndex,
			month_branch: chart.month.chiIndex,
			day_stem: chart.day.canIndex,
			day_branch: chart.day.chiIndex,
			hour_stem: chart.hour.canIndex,
			hour_branch: chart.hour.chiIndex,

			day_master_status: analysis.day_master_status,
			structure_type: analysis.structure_type,
			structure_name: analysis.structure_name,
			analysis_reason: analysis.analysis_reason,
			favorable_elements: analysis.favorable_elements,
			element_scores: analysis.element_scores,
			god_scores: analysis.god_scores,
			shen_sha: analysis.shen_sha,
			interactions: analysis.interactions,
			score_details: analysis.score_details,
			party_score: analysis.party_score,
			enemy_score: analysis.enemy_score,
			percentage_self: analysis.percentage_self,
			luck_start_age: null, // Cần module tính Đại vận riêng nếu muốn hiển thị
		};
	}

	// ====================================================================
	// 1. LOGIC LẬP TRỤ (ASTRONOMY CALCULATION)
	// ====================================================================

	/**
	 * Tính toán 4 trụ (Năm, Tháng, Ngày, Giờ) dựa trên thời gian sinh.
	 * Xử lý các trường hợp đặc biệt: Giờ Tý đêm, Tiết khí Lập Xuân để xác định năm/tháng.
	 */
	private calculatePillars(input: Omit<BaziInput, 'user_id' | 'id'>): BaziChart {
		const birthDate = new Date(
			input.birth_year,
			input.birth_month - 1,
			input.birth_day,
			input.birth_hour,
			input.birth_minute,
		);

		// Xử lý Dạ Tý (23h-0h): Tính sang Can Chi ngày hôm sau
		let dateForDayPillar = new Date(birthDate);
		if (birthDate.getHours() >= 23) {
			dateForDayPillar.setDate(dateForDayPillar.getDate() + 1);
		}

		// Khởi tạo đối tượng lịch
		const solarObj = new SolarDate(birthDate);
		const lunarObj = solarObj.toLunarDate();
		lunarObj.init();
		const solarObjForDay = new SolarDate(dateForDayPillar);
		const lunarObjForDay = solarObjForDay.toLunarDate();
		lunarObjForDay.init();
		const currentSolarTerm = lunarObj.getSolarTerm();

		// A. Trụ Ngày
		const dayPillar = this.createPillarFromLunarName(lunarObjForDay.getDayName());

		// B. Trụ Giờ (Ngũ Thử Độn)
		const hourPillar = this.getHourPillar(birthDate.getHours(), dayPillar.canIndex);

		// C. Trụ Năm (Dựa vào tiết Lập Xuân để chuyển năm)
		const yearPillar = this.getYearPillar(lunarObj, currentSolarTerm);

		// D. Trụ Tháng (Ngũ Hổ Độn + Tiết Khí)
		const monthPillar = this.getMonthPillar(yearPillar.canIndex, currentSolarTerm);

		return { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar };
	}

	private createPillarFromIndex(canIdx: number, chiIdx: number): Pillar {
		return {
			canIndex: canIdx,
			chiIndex: chiIdx,
			can: HEAVENLY_STEMS[canIdx],
			chi: EARTHLY_BRANCHES[chiIdx],
		};
	}

	private createPillarFromLunarName(name: string): Pillar {
		const parts = name.trim().split(' ');
		const can = parts[0] as HeavenlyStem;
		const chi = parts[1] as EarthlyBranch;
		const canIdx = HEAVENLY_STEMS.indexOf(can);
		const chiIdx = EARTHLY_BRANCHES.indexOf(chi);
		if (canIdx === -1 || chiIdx === -1) throw new Error(`Lỗi parse Can Chi: ${name}`);
		return { can, chi, canIndex: canIdx, chiIndex: chiIdx };
	}

	private getHourPillar(hour: number, dayCanIndex: number): Pillar {
		// Giờ Tý (23-1) -> Index 0, Sửu (1-3) -> Index 1...
		const chiIndex = Math.floor((hour + 1) / 2) % 12;
		// Ngũ Thử Độn: (CanNgày % 5) * 2 + ChiGiờ
		const startHourCan = (dayCanIndex % 5) * 2;
		const canIndex = (startHourCan + chiIndex) % 10;
		return this.createPillarFromIndex(canIndex, chiIndex);
	}

	private getYearPillar(lunarDate: LunarDate, solarTerm: string): Pillar {
		let { canIndex, chiIndex } = this.createPillarFromLunarName(lunarDate.getYearName());

		// Tiết khí thuộc năm cũ
		const endOfYearTerms = ['Tiểu hàn', 'Đại hàn', 'Đông chí'];
		// Tiết khí thuộc năm mới
		const startOfYearTerms = ['Lập xuân', 'Vũ thủy'];

		// Tháng 1 âm nhưng chưa Lập Xuân -> Vẫn tính là năm cũ
		if (lunarDate.month === 1 && endOfYearTerms.includes(solarTerm)) {
			canIndex = (canIndex - 1 + 10) % 10;
			chiIndex = (chiIndex - 1 + 12) % 12;
		}
		// Tháng 12 âm nhưng đã Lập Xuân -> Tính sang năm mới
		else if (lunarDate.month === 12 && startOfYearTerms.includes(solarTerm)) {
			canIndex = (canIndex + 1) % 10;
			chiIndex = (chiIndex + 1) % 12;
		}
		return this.createPillarFromIndex(canIndex, chiIndex);
	}

	private getMonthPillar(yearCanIndex: number, solarTerm: string): Pillar {
		const chiIndex = SOLAR_TERM_TO_BRANCH_INDEX[solarTerm];
		if (chiIndex === undefined) throw new Error(`Không tìm thấy tiết khí: ${solarTerm}`);

		// Lập Xuân là tháng Dần (Index 2)
		let monthOffset = chiIndex - 2;
		if (monthOffset < 0) monthOffset += 12;

		// Ngũ Hổ Độn: (CanNam % 5) * 2 + 2 = Can tháng Dần
		const startMonthCan = (yearCanIndex % 5) * 2 + 2;
		const canIndex = (startMonthCan + monthOffset) % 10;
		return this.createPillarFromIndex(canIndex, chiIndex);
	}

	// ====================================================================
	// 2. LOGIC PHÂN TÍCH CỐT LÕI (CORE ANALYSIS)
	// ====================================================================

	/**
	 * Phân tích toàn diện lá số:
	 * - Tính Thần sát.
	 * - Đánh giá hợp xung địa chi.
	 * - Tính điểm định lượng ngũ hành theo phương pháp VuLong (Vùng tâm).
	 * - Xác định Cách cục (Nội cách/Ngoại cách).
	 * - Chọn Dụng thần, Hỷ thần, Kỵ thần, Cừu thần, Nhàn thần.
	 */
	private analyze(chart: BaziChart): AnalysisResult & {
		god_scores: Record<TenGod, number>;
		interactions: any;
		score_details: any[];
		party_score: number;
		enemy_score: number;
		percentage_self: number;
	} {
		// A. Thần Sát
		const shenSha = this.calculateShenSha(chart);

		// B. Tương tác Địa Chi (Hợp, Xung, Hình, Hại)
		const interactions = this.evaluateBranchInteractions(chart);

		// C. Tính Điểm Ngũ Hành (Quantitative Scoring)
		// Áp dụng trọng số Vùng Tâm và Tương tác
		const { scores, details: scoreDetails } = this.calculateAdvancedScores(chart, interactions);
		const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

		// D. Nhật Chủ & Thập Thần
		const dmCan = HEAVENLY_STEMS[chart.day.canIndex];
		const dmElement = STEM_ELEMENTS[dmCan];
		const godsMap = TEN_GODS_MAPPING[dmElement];
		const godScores: Record<TenGod, number> = {
			TyKiep: scores[godsMap.TyKiep],
			KieuAn: scores[godsMap.KieuAn],
			ThucThuong: scores[godsMap.ThucThuong],
			TaiTinh: scores[godsMap.TaiTinh],
			QuanSat: scores[godsMap.QuanSat],
		};

		// E. Kiểm tra Ngoại Cách (Biến Cách)
		const specialStructure = this.checkSpecialStructures(
			chart,
			dmElement,
			scores,
			godScores,
			totalScore,
			interactions,
		);

		if (specialStructure) {
			return {
				...specialStructure,
				element_scores: scores,
				shen_sha: shenSha,
				god_scores: godScores,
				interactions,
				score_details: scoreDetails,
			};
		}

		// F. Chính Cách (Nội Cách): Định Thân Vượng/Nhược
		const partyScore = godScores.TyKiep + godScores.KieuAn; // Phe Ta (Thân + Ấn)
		const enemyScore = totalScore - partyScore; // Phe Địch (Tài + Quan + Thực)
		const percentageSelf = totalScore > 0 ? (partyScore / totalScore) * 100 : 0;

		const monthChi = EARTHLY_BRANCHES[chart.month.chiIndex];

		// Xác định Hành của Lệnh Tháng (xét cả trường hợp Hóa cục)
		let monthElement = BRANCH_ELEMENTS[monthChi];
		if (interactions.isMonthChanged && interactions.monthNewElement) {
			monthElement = interactions.monthNewElement;
		}

		// Kiểm tra Đắc Lệnh: Sinh tháng cùng hành hoặc tháng Ấn
		const isDacLenh = monthElement === dmElement || monthElement === godsMap.KieuAn;
		let status = 'Nhược';
		let reason = '';

		// Ngưỡng vượng/nhược tùy thuộc vào Đắc Lệnh hay Thất Lệnh
		if (isDacLenh) {
			if (partyScore >= totalScore * 0.4) {
				status = 'Vượng';
				reason = `Đắc lệnh tháng ${monthChi}, khí thế hữu căn, phe ta chiếm ưu thế.`;
			} else {
				status = 'Nhược';
				reason = `Đắc lệnh tháng ${monthChi} nhưng bị khắc tiết quá nhiều (Thực/Tài/Quan vượng).`;
			}
		} else {
			if (partyScore >= totalScore * 0.55) {
				// Thất lệnh cần điểm cao hơn để Vượng
				status = 'Vượng';
				reason = `Thất lệnh nhưng đắc đảng (Tỷ/Ấn nhiều), thế lực vượng.`;
			} else {
				status = 'Nhược';
				reason = `Thất lệnh, không đủ sinh phù từ Ấn và Tỷ Kiếp.`;
			}
		}

		// G. Chọn Dụng Thần cho Chính Cách (Phù Ức)
		let favorable = this.findGodsForNormalStructure(status, godScores, godsMap, chart);

		// H. Điều Hầu (Cân bằng khí hậu - Rất quan trọng)
		// Nếu sinh tháng Hợi/Tý/Sửu (Đông) hoặc Tỵ/Ngọ/Mùi (Hạ), cần xét Điều hầu
		const climateGods = this.checkClimate(monthChi, dmElement, favorable.dung_than);

		if (climateGods.length > 0) {
			// Thêm thần Điều hầu vào danh sách Hỷ thần (hoặc Dụng thần thứ cấp)
			climateGods.forEach((g) => {
				if (!favorable.dung_than.includes(g)) {
					favorable.hy_than.push(g);
				}
			});

			// TÍNH LẠI toàn bộ hệ thống Thần (Kỵ/Cừu/Nhàn) sau khi cập nhật Hỷ thần
			// để đảm bảo tính nhất quán sinh khắc
			favorable = this.categorizeAllGods(favorable.dung_than, favorable.hy_than);
		}

		return {
			day_master_status: status,
			structure_type: 'Chính Cách',
			structure_name: 'Chính Cách (Phù Ức)',
			analysis_reason: reason,
			favorable_elements: favorable,
			element_scores: scores,
			shen_sha: shenSha,
			god_scores: godScores,
			interactions,
			score_details: scoreDetails,
			party_score: partyScore,
			enemy_score: enemyScore,
			percentage_self: percentageSelf,
		};
	}

	// ====================================================================
	// 3. CÁC HÀM TÍNH TOÁN CHI TIẾT (HELPER FUNCTIONS)
	// ====================================================================

	/**
	 * Phân loại toàn bộ 5 loại thần dựa trên Dụng thần và Hỷ thần đã chọn.
	 * Quy tắc:
	 * - Dụng Thần: Đã xác định.
	 * - Hỷ Thần: Đã xác định (hoặc sinh Dụng).
	 * - Kỵ Thần: Khắc Dụng Thần.
	 * - Cừu Thần: Sinh Kỵ Thần (hoặc Khắc Hỷ Thần).
	 * - Nhàn Thần: Các hành còn lại.
	 */
	private categorizeAllGods(
		dungThanList: FiveElement[],
		hyThanList: FiveElement[],
	): AnalysisResult['favorable_elements'] {
		const allElements: FiveElement[] = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];

		// Chuẩn hóa danh sách
		const dung = Array.from(new Set(dungThanList));
		const hy = Array.from(new Set(hyThanList)).filter((e) => !dung.includes(e));

		// Kỵ Thần: Hành KHẮC Dụng thần
		const ky: FiveElement[] = [];
		dung.forEach((dt) => {
			const enemy = Object.keys(CONTROLLING_CYCLE).find(
				(k) => CONTROLLING_CYCLE[k as FiveElement] === dt,
			) as FiveElement;
			if (enemy && !dung.includes(enemy) && !hy.includes(enemy)) {
				ky.push(enemy);
			}
		});

		// Cừu Thần: Hành SINH Kỵ thần (Nguồn gốc của cái xấu)
		const cuu: FiveElement[] = [];
		ky.forEach((kt) => {
			const parent = Object.keys(PRODUCING_CYCLE).find(
				(k) => PRODUCING_CYCLE[k as FiveElement] === kt,
			) as FiveElement;
			if (parent && !dung.includes(parent) && !hy.includes(parent) && !ky.includes(parent)) {
				cuu.push(parent);
			}
		});

		// Nhàn Thần: Các hành còn lại
		const used = new Set([...dung, ...hy, ...ky, ...cuu]);
		const nhan = allElements.filter((e) => !used.has(e));

		return {
			dung_than: dung,
			hy_than: hy,
			ky_than: Array.from(new Set(ky)),
			cuu_than: Array.from(new Set(cuu)),
			nhan_than: nhan,
		};
	}

	/**
	 * Tính Thần Sát (Shen Sha) dựa trên Can/Chi của các trụ.
	 */
	private calculateShenSha(chart: BaziChart): string[] {
		const result: string[] = [];
		const dayCan = chart.day.can;
		const yearCan = chart.year.can;
		const dayChi = chart.day.chi;
		const yearChi = chart.year.chi;
		const monthChi = chart.month.chi;
		const pillars = [chart.year, chart.month, chart.day, chart.hour];
		const pillarNames = ['Năm', 'Tháng', 'Ngày', 'Giờ'];

		pillars.forEach((p, idx) => {
			const chi = p.chi;
			const can = p.can;

			// 1. Thiên Ất (Quý nhân giải hạn tốt nhất)
			if (
				SHEN_SHA_RULES.THIEN_AT[dayCan]?.includes(chi) ||
				SHEN_SHA_RULES.THIEN_AT[yearCan]?.includes(chi)
			)
				result.push(`${SHEN_SHA.THIEN_AT} tại trụ ${pillarNames[idx]}`);

			// 2. Văn Xương
			if (SHEN_SHA_RULES.VAN_XUONG[dayCan] === chi || SHEN_SHA_RULES.VAN_XUONG[yearCan] === chi)
				result.push(`${SHEN_SHA.VAN_XUONG} tại trụ ${pillarNames[idx]}`);

			// 3. Lộc Thần
			if (SHEN_SHA_RULES.LOC_THAN[dayCan] === chi)
				result.push(`${SHEN_SHA.LOC_THAN} tại trụ ${pillarNames[idx]}`);

			// 4. Kình Dương
			if (SHEN_SHA_RULES.KINH_DUONG[dayCan] === chi)
				result.push(`${SHEN_SHA.KINH_DUONG} tại trụ ${pillarNames[idx]}`);

			// 5. Dịch Mã
			if (SHEN_SHA_RULES.DICH_MA[dayChi] === chi || SHEN_SHA_RULES.DICH_MA[yearChi] === chi)
				result.push(`${SHEN_SHA.DICH_MA} tại trụ ${pillarNames[idx]}`);

			// 6. Đào Hoa
			if (SHEN_SHA_RULES.DAO_HOA[dayChi] === chi || SHEN_SHA_RULES.DAO_HOA[yearChi] === chi)
				result.push(`${SHEN_SHA.DAO_HOA} tại trụ ${pillarNames[idx]}`);

			// 7. Hoa Cái
			if (SHEN_SHA_RULES.HOA_CAI[dayChi] === chi || SHEN_SHA_RULES.HOA_CAI[yearChi] === chi)
				result.push(`${SHEN_SHA.HOA_CAI} tại trụ ${pillarNames[idx]}`);

			// 8. Thiên Đức (Theo Chi Tháng)
			const thienDucVal = (SHEN_SHA_RULES as any).THIEN_DUC[monthChi];
			if (thienDucVal && (can === thienDucVal || chi === thienDucVal))
				result.push(`${SHEN_SHA.THIEN_DUC} tại trụ ${pillarNames[idx]}`);

			// 9. Nguyệt Đức (Theo Chi Tháng)
			const nguyetDucCan = (SHEN_SHA_RULES as any).NGUYET_DUC[monthChi];
			if (can === nguyetDucCan) result.push(`${SHEN_SHA.NGUYET_DUC} tại trụ ${pillarNames[idx]}`);
		});

		// 10. Khôi Canh (Chỉ xét Trụ Ngày)
		const dayPair = `${dayCan} ${dayChi}`;
		if (['Canh Thìn', 'Canh Tuất', 'Nhâm Thìn', 'Mậu Tuất'].includes(dayPair)) {
			result.push(SHEN_SHA.KHOI_CANH);
		}

		// 11. Không Vong
		const kvBranches = KHONG_VONG_RULES[dayPair] || [];
		pillars.forEach((p, idx) => {
			// Không Vong không tính tại trụ Ngày (vì trụ Ngày là gốc tính ra KV)
			if (idx !== 2 && kvBranches.includes(p.chi)) {
				result.push(`${SHEN_SHA.KHONG_VONG} tại trụ ${pillarNames[idx]}`);
			}
		});

		// 12. Thiên La - Địa Võng
		const allBranches = pillars.map((p) => p.chi);

		if (allBranches.includes('Tuất') && allBranches.includes('Hợi')) {
			result.push(SHEN_SHA.THIEN_LA);
		}
		if (allBranches.includes('Thìn') && allBranches.includes('Tỵ')) {
			result.push(SHEN_SHA.DIA_VONG);
		}

		return result;
	}

	/**
	 * Đánh giá tương tác giữa các Địa chi: Tam Hội, Tam Hợp, Lục Xung.
	 * Xác định xem có Hóa cục thành công hay không để thay đổi hành của Lệnh tháng.
	 */
	private evaluateBranchInteractions(chart: BaziChart) {
		const branches = [chart.year.chi, chart.month.chi, chart.day.chi, chart.hour.chi];
		const stems = [chart.year.can, chart.month.can, chart.day.can, chart.hour.can];
		const counts = branches.reduce(
			(acc, b) => {
				acc[b] = (acc[b] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		const interactions = {
			tamHoi: null as FiveElement | null,
			sanHe: null as FiveElement | null,
			lucXung: [] as number[],
			isMonthChanged: false,
			monthNewElement: null as FiveElement | null,
		};

		// Kiểm tra Thần Dẫn: Thiên can phải có hành hóa thần thấu lộ
		const hasThanDan = (element: FiveElement): boolean => {
			return stems.some((s) => STEM_ELEMENTS[s] === element);
		};

		// 1. Tam Hội (Mạnh nhất)
		for (const [el, group] of Object.entries(BRANCH_INTERACTIONS.SEASONAL_COMBINATION)) {
			if (group.every((b) => counts[b])) {
				// Tam hội thường tự hóa không cần thần dẫn quá khắt khe, nhưng có thì tốt hơn
				interactions.tamHoi = el as FiveElement;
				if (group.includes(chart.month.chi)) {
					interactions.isMonthChanged = true;
					interactions.monthNewElement = el as FiveElement;
				}
				break;
			}
		}

		// 2. Tam Hợp (Mạnh nhì)
		if (!interactions.tamHoi) {
			for (const [el, group] of Object.entries(BRANCH_INTERACTIONS.TRIPLE_HARMONY)) {
				const element = el as FiveElement;
				if (group.every((b) => counts[b])) {
					// Điều kiện hóa Tam Hợp: Có Thần dẫn HOẶC Đắc lệnh tháng
					const isMonthCommand = BRANCH_ELEMENTS[chart.month.chi] === element;
					if (hasThanDan(element) || isMonthCommand) {
						interactions.sanHe = element;
						if (group.includes(chart.month.chi)) {
							interactions.isMonthChanged = true;
							interactions.monthNewElement = element;
						}
					}
					break;
				}
			}
		}

		// 3. Lục Xung
		// Kiểm tra xung giữa các trụ liền kề và xung trụ ngày-năm
		for (let i = 0; i < 3; i++) {
			const b1 = branches[i];
			const b2 = branches[i + 1];
			// @ts-expect-error
			if (BRANCH_INTERACTIONS.CLASH[b1] === b2) {
				interactions.lucXung.push(i, i + 1);
			}
		}
		// Xung trụ Năm - Ngày (Cách vị xung)
		// @ts-expect-error
		if (BRANCH_INTERACTIONS.CLASH[branches[0]] === branches[2]) interactions.lucXung.push(0, 2);

		return interactions;
	}

	/**
	 * Tính điểm Ngũ hành định lượng (Quantitative Scoring).
	 * Áp dụng lý thuyết Vùng Tâm (Center Zone) của VuLong.
	 */
	private calculateAdvancedScores(
		chart: BaziChart,
		interactions: any,
	): { scores: Record<FiveElement, number>; details: any[] } {
		const scores: Record<FiveElement, number> = { Kim: 0, Mộc: 0, Thủy: 0, Hỏa: 0, Thổ: 0 };
		const details: any[] = [];
		const pillars = [chart.year, chart.month, chart.day, chart.hour];
		const pillarNames = ['Năm', 'Tháng', 'Ngày', 'Giờ'];
		const BASE = 5; // Điểm cơ sở cho Thiên can

		pillars.forEach((p, index) => {
			// === 1. TÍNH ĐIỂM THIÊN CAN ===
			let canScore = BASE;
			const canEl = STEM_ELEMENTS[p.can];
			const chiEl = BRANCH_ELEMENTS[p.chi];
			const canNotes: string[] = [];

			// -- TRỌNG SỐ VÙNG TÂM (Theo VuLong) --
			// Vùng tâm: Can Tháng (1), Can Giờ (3), Chi Ngày (2 - xử lý ở dưới)
			// Nhật chủ (Can Ngày - 2) là trung tâm nhận lực, không tính điểm đóng góp vào cục diện chung
			// nhưng vẫn tính vào tổng lực ngũ hành.
			if (index === 2) {
				canScore *= 1.2; // Nhật chủ
			} else if (index === 1 || index === 3) {
				canScore *= 1.2; // Can Tháng, Can Giờ (Sát cạnh Nhật chủ -> Lực mạnh)
				canNotes.push('Vùng Tâm (Sát Nhật chủ)');
			} else if (index === 0) {
				canScore *= 0.6; // Can Năm (Xa Nhật chủ -> Lực yếu)
				canNotes.push('Trụ Năm (Xa)');
			}

			// -- SINH KHẮC CÙNG TRỤ (Can-Chi) --
			if (CONTROLLING_CYCLE[chiEl] === canEl) {
				canScore *= 0.6; // Chi khắc Can (Tiệt cước) -> Giảm lực
				canNotes.push('Tiệt cước');
			} else if (CONTROLLING_CYCLE[canEl] === chiEl) {
				canScore *= 0.8; // Can khắc Chi (Cái đầu) -> Giảm lực
				canNotes.push('Cái đầu');
			} else if (PRODUCING_CYCLE[chiEl] === canEl) {
				canScore *= 1.3; // Chi sinh Can -> Tăng lực
				canNotes.push('Được chi sinh');
			}

			scores[canEl] += canScore;
			details.push({
				source: `Can ${pillarNames[index]} (${p.can})`,
				element: canEl,
				score: canScore,
				notes: canNotes.join(', '),
			});

			// === 2. TÍNH ĐIỂM ĐỊA CHI (Tàng Can) ===
			const hiddens = HIDDEN_STEMS_SCORES[p.chi];
			let multiplier = 1.0;
			const chiNotes: string[] = [];

			// -- TRỌNG SỐ ĐỊA CHI --
			if (index === 1) {
				multiplier = 3.0; // Chi Tháng (Lệnh tháng): Quan trọng nhất
				chiNotes.push('Lệnh Tháng (x3.0)');
			} else if (index === 2) {
				multiplier = 1.5; // Chi Ngày (Tọa): Vùng tâm -> Quan trọng nhì
				chiNotes.push('Chi Ngày (x1.5)');
			} else if (index === 3) {
				multiplier = 0.8; // Chi Giờ
				chiNotes.push('Chi Giờ (x0.8)');
			} else if (index === 0) {
				multiplier = 0.5; // Chi Năm
				chiNotes.push('Chi Năm (x0.5)');
			}

			// -- XỬ LÝ XUNG --
			if (interactions.lucXung.includes(index)) {
				multiplier *= 0.5; // Bị xung -> Lực giảm một nửa
				chiNotes.push('Bị Lục Xung');
			}

			// -- XỬ LÝ HÓA CỤC --
			let isTransformed = false;

			// Kiểm tra Tam Hội
			if (
				interactions.tamHoi &&
				(BRANCH_INTERACTIONS.SEASONAL_COMBINATION as any)[interactions.tamHoi].includes(p.chi)
			) {
				const hoiEl = interactions.tamHoi as FiveElement;
				const score = 12 * multiplier; // Điểm hóa cục rất cao
				scores[hoiEl] += score;
				isTransformed = true;
				details.push({
					source: `Chi ${pillarNames[index]} (${p.chi})`,
					element: hoiEl,
					score: score,
					notes: `Hóa Tam Hội ${hoiEl}. ${chiNotes.join(', ')}`,
				});
			}
			// Kiểm tra Tam Hợp
			else if (
				interactions.sanHe &&
				(BRANCH_INTERACTIONS.TRIPLE_HARMONY as any)[interactions.sanHe].includes(p.chi)
			) {
				const heEl = interactions.sanHe as FiveElement;
				const score = 10 * multiplier;
				scores[heEl] += score;
				isTransformed = true;
				details.push({
					source: `Chi ${pillarNames[index]} (${p.chi})`,
					element: heEl,
					score: score,
					notes: `Hóa Tam Hợp ${heEl}. ${chiNotes.join(', ')}`,
				});
			}

			// Nếu không hóa cục -> Tính điểm Tàng Can bản khí
			if (!isTransformed) {
				hiddens.forEach((h) => {
					const el = STEM_ELEMENTS[h.can];
					const score = h.score * multiplier;
					scores[el] += score;
					details.push({
						source: `Chi ${pillarNames[index]} (${p.chi}) tàng ${h.can}`,
						element: el,
						score: score,
						notes: `Điểm gốc: ${h.score}. ${chiNotes.join(', ')}`,
					});
				});
			}
		});

		return { scores, details };
	}

	/**
	 * Kiểm tra các Cách cục đặc biệt (Ngoại cách).
	 * Bao gồm: Độc Vượng (Tòng Cường), Hóa Khí, Tòng Cách (Cực Nhược).
	 */
	private checkSpecialStructures(
		chart: BaziChart,
		dmElement: FiveElement,
		scores: Record<FiveElement, number>,
		godScores: Record<TenGod, number>,
		totalScore: number,
		interactions: any,
	): Omit<
		AnalysisResult,
		'element_scores' | 'shen_sha' | 'god_scores' | 'interactions' | 'score_details'
	> | null {
		const pctSelf = ((godScores.TyKiep + godScores.KieuAn) / totalScore) * 100;

		// --- LOGIC KIỂM TRA GỐC (ROOT) ---
		// Nhật chủ có gốc khi địa chi tàng can cùng hành.
		// Nguyên tắc: "Dương can tòng khí bất tòng thế". Có gốc thì khó tòng.
		const branches = [chart.year.chi, chart.month.chi, chart.day.chi, chart.hour.chi];
		let hasRoot = false;

		branches.forEach((chi) => {
			let currentChiElement = BRANCH_ELEMENTS[chi];

			// Nếu chi hóa cục -> Hành chi thay đổi
			if (
				interactions.tamHoi &&
				(BRANCH_INTERACTIONS.SEASONAL_COMBINATION as any)[interactions.tamHoi].includes(chi)
			) {
				currentChiElement = interactions.tamHoi;
			} else if (
				interactions.sanHe &&
				(BRANCH_INTERACTIONS.TRIPLE_HARMONY as any)[interactions.sanHe].includes(chi)
			) {
				currentChiElement = interactions.sanHe;
			}

			// Nếu hành chi (hoặc hóa cục) cùng hành Nhật chủ -> Có gốc
			// Kiểm tra kỹ hơn trong tàng can
			const hiddens = HIDDEN_STEMS_SCORES[chi];
			const hasSameElementInHidden = hiddens.some((h) => STEM_ELEMENTS[h.can] === dmElement);

			if (hasSameElementInHidden || currentChiElement === dmElement) {
				hasRoot = true;
			}
		});

		// 1. Độc Vượng (Tòng Cường / Tòng Vượng)
		// Điều kiện: Phe Ta cực mạnh (>80%), Tài Quan suy kiệt.
		let countSelf = 0;
		const allStems = [chart.year.can, chart.month.can, chart.day.can, chart.hour.can];
		allStems.forEach((s) => {
			const el = STEM_ELEMENTS[s];
			if (el === dmElement || PRODUCING_CYCLE[el] === dmElement) countSelf++;
		});

		if (pctSelf > 80 && countSelf >= 3 && godScores.TaiTinh < 5 && godScores.QuanSat < 5) {
			let name = '';
			const outputEl = TEN_GODS_MAPPING[dmElement].ThucThuong;
			const resourceEl = TEN_GODS_MAPPING[dmElement].KieuAn;
			const wealthEl = TEN_GODS_MAPPING[dmElement].TaiTinh;
			const officerEl = TEN_GODS_MAPPING[dmElement].QuanSat;

			const gods = this.categorizeAllGods([dmElement, resourceEl], [outputEl]);

			switch (dmElement) {
				case 'Mộc':
					name = 'Khúc Trực Cách';
					break;
				case 'Hỏa':
					name = 'Viêm Thượng Cách';
					break;
				case 'Thổ': {
					const earthBranches = branches.filter((b) => ['Thìn', 'Tuất', 'Sửu', 'Mùi'].includes(b));
					name = earthBranches.length >= 3 ? 'Gia Sắc Cách' : 'Tòng Cường Cách';
					break;
				}
				case 'Kim':
					name = 'Tòng Cách';
					break;
				case 'Thủy':
					name = 'Nhuận Hạ Cách';
					break;
			}

			return {
				day_master_status: 'Cực Vượng',
				structure_type: 'Ngoại Cách',
				structure_name: name,
				analysis_reason: `Thân Ấn chiếm ưu thế tuyệt đối (${pctSelf.toFixed(1)}%). Thuộc cách Độc Vượng.`,
				favorable_elements: gods,
			};
		}

		// 2. Cách Hóa Khí (Transformation)
		const dayCan = chart.day.can;
		// @ts-ignore
		const combo = HEAVENLY_STEM_COMBINATIONS[dayCan];

		// Kiểm tra hợp Can Tháng hoặc Can Giờ
		const targetCans = [chart.month.can, chart.hour.can];
		let transformEl: FiveElement | null = null;

		if (combo && targetCans.includes(combo.partner)) {
			const transformed = combo.output as FiveElement;
			// Điều kiện hóa: Phải sinh tháng lệnh của hành hóa (hoặc tháng hóa cục)
			const monthBranchEl = interactions.monthNewElement || BRANCH_ELEMENTS[chart.month.chi];

			if (monthBranchEl === transformed || PRODUCING_CYCLE[monthBranchEl] === transformed) {
				transformEl = transformed;
			}
		}

		if (transformEl) {
			// Kiểm tra xem có Quan Sát khắc hành hóa không (nếu có thì phá cách)
			const officerOfTransform = Object.keys(CONTROLLING_CYCLE).find(
				(k) => CONTROLLING_CYCLE[k as FiveElement] === transformEl,
			) as FiveElement;

			if (scores[officerOfTransform] < 15) {
				const outputEl = PRODUCING_CYCLE[transformEl]; // Thực thương của hành hóa
				const resourceEl = Object.keys(PRODUCING_CYCLE).find(
					(k) => PRODUCING_CYCLE[k as FiveElement] === transformEl,
				) as FiveElement; // Ấn của hành hóa

				const gods = this.categorizeAllGods([transformEl], [resourceEl, outputEl]);

				return {
					day_master_status: 'Hóa Khí',
					structure_type: 'Ngoại Cách',
					structure_name: 'Hóa Khí Cách',
					analysis_reason: `Nhật can ${dayCan} hợp hóa thành ${transformEl} đắc lệnh.`,
					favorable_elements: gods,
				};
			}
		}

		// 3. Tòng Cách (Cực Nhược)
		// Điều kiện: Thân cực nhược (<15%) VÀ Không có gốc (hasRoot = false)
		if (pctSelf < 15 && !hasRoot) {
			let maxScore = 0;
			let strongestGod: TenGod | null = null;

			(['ThucThuong', 'TaiTinh', 'QuanSat'] as TenGod[]).forEach((god) => {
				if (godScores[god] > maxScore) {
					maxScore = godScores[god];
					strongestGod = god;
				}
			});

			// Phe địch phải chiếm ưu thế (>50%)
			if (strongestGod && maxScore / totalScore > 0.5) {
				const strongestEl = TEN_GODS_MAPPING[dmElement][strongestGod];
				let dung = [strongestEl];
				let hy = [] as FiveElement[];

				let name = '';
				if (strongestGod === 'TaiTinh') {
					name = 'Tòng Tài Cách';
					hy.push(TEN_GODS_MAPPING[dmElement].ThucThuong); // Hỷ Thực sinh Tài
				} else if (strongestGod === 'QuanSat') {
					name = 'Tòng Sát Cách';
					hy.push(TEN_GODS_MAPPING[dmElement].TaiTinh); // Hỷ Tài sinh Sát
				} else if (strongestGod === 'ThucThuong') {
					name = 'Tòng Nhi Cách';
					hy.push(TEN_GODS_MAPPING[dmElement].TaiTinh); // Tòng Nhi hỉ Tài
					// Lưu ý: Tòng Nhi kỵ Quan Sát, đã được xử lý trong hàm categorizeAllGods
				}

				const gods = this.categorizeAllGods(dung, hy);

				return {
					day_master_status: 'Cực Nhược',
					structure_type: 'Ngoại Cách',
					structure_name: name,
					analysis_reason: `Thân quá nhược (${pctSelf.toFixed(1)}%), không gốc, tòng theo thế lực ${strongestGod}.`,
					favorable_elements: gods,
				};
			}
		}

		return null;
	}

	/**
	 * Xác định Dụng/Hỷ thần cho Chính Cách (Phù Ức).
	 * Sau đó gọi hàm phân loại để tự động tính Kỵ/Cừu/Nhàn.
	 */
	private findGodsForNormalStructure(
		status: string, // 'Vượng' | 'Nhược'
		godScores: Record<TenGod, number>,
		godsMap: Record<TenGod, FiveElement>,
		chart: BaziChart,
	) {
		let dung: FiveElement[] = [];
		let hy: FiveElement[] = [];

		if (status === 'Vượng') {
			// === THÂN VƯỢNG ===
			// Cần: Khắc (Quan), Xì (Thực), Hao (Tài)

			// Trường hợp 1: Vượng do Ấn nhiều (Mẫu từ diệt tử) -> Dụng Tài (phá Ấn), Hỷ Thực (sinh Tài)
			if (godScores.KieuAn > 30) {
				dung.push(godsMap.TaiTinh);
				hy.push(godsMap.ThucThuong);
			}
			// Trường hợp 2: Vượng do Tỷ Kiếp nhiều -> Dụng Quan (chế Kiếp), Hỷ Tài (sinh Quan)
			else if (godScores.TyKiep > 30) {
				dung.push(godsMap.QuanSat);
				hy.push(godsMap.TaiTinh);
			}
			// Trường hợp 3: Vượng đều -> Dụng Thực Thương (Xì hơi cho thanh tú), Hỷ Tài
			else {
				dung.push(godsMap.ThucThuong);
				hy.push(godsMap.TaiTinh);
			}
		} else {
			// === THÂN NHƯỢC ===
			// Cần: Sinh (Ấn), Trợ (Tỷ)

			// Trường hợp 1: Nhược do Quan Sát nhiều (Sát trọng thân khinh)
			// -> Dụng Ấn (Hóa sát sinh thân), Hỷ Tỷ
			if (godScores.QuanSat > godScores.ThucThuong && godScores.QuanSat > godScores.TaiTinh) {
				dung.push(godsMap.KieuAn);
				hy.push(godsMap.TyKiep);
			}
			// Trường hợp 2: Nhược do Tài nhiều (Tài đa thân nhược)
			// -> Dụng Tỷ Kiếp (Chế Tài, gánh Tài), Hỷ Ấn
			else if (godScores.TaiTinh > 30) {
				dung.push(godsMap.TyKiep);
				hy.push(godsMap.KieuAn);
			}
			// Trường hợp 3: Nhược do Thực Thương nhiều (Tiết khí quá độ)
			// -> Dụng Ấn (Chế Thực, sinh Thân), Hỷ Tỷ
			else {
				dung.push(godsMap.KieuAn);
				hy.push(godsMap.TyKiep);
			}
		}

		// Thông quan: Nếu Tỷ Kiếp và Tài Tinh ngang sức (tranh chiến) -> Dùng Thực Thương hòa giải
		if (
			Math.abs(godScores.TyKiep - godScores.TaiTinh) < 15 &&
			godScores.TyKiep > 25 &&
			godScores.TaiTinh > 25
		) {
			if (!dung.includes(godsMap.ThucThuong)) {
				// Thêm Thực Thương vào Hỷ thần để thông quan
				hy.push(godsMap.ThucThuong);
			}
		}

		// Tính toán đủ bộ 5 thần
		return this.categorizeAllGods(dung, hy);
	}

	/**
	 * Kiểm tra Điều Hầu (Khí hậu).
	 * - Sinh mùa Đông (Hợi Tý Sửu): Cần Hỏa (Sưởi ấm).
	 * - Sinh mùa Hạ (Tỵ Ngọ Mùi): Cần Thủy (Làm mát).
	 */
	private checkClimate(
		monthChi: EarthlyBranch,
		dmEl: FiveElement,
		currentDungThan: FiveElement[],
	): FiveElement[] {
		const climateGods: FiveElement[] = [];

		// Mùa Đông lạnh giá
		if (['Hợi', 'Tý', 'Sửu'].includes(monthChi)) {
			// Cần Hỏa để sưởi ấm, giải đông
			if (!currentDungThan.includes('Hỏa')) climateGods.push('Hỏa');
			// Thủy lạnh cần Mộc để xì hơi (nếu Thân là Thủy) hoặc sinh Hỏa
			if (dmEl === 'Thủy') climateGods.push('Mộc');
		}
		// Mùa Hạ nóng bức
		else if (['Tỵ', 'Ngọ', 'Mùi'].includes(monthChi)) {
			// Cần Thủy để làm mát, nhuận thổ
			if (!currentDungThan.includes('Thủy')) climateGods.push('Thủy');
			// Thổ khô/Kim giòn cần Thủy dưỡng
			if (dmEl === 'Thổ' || dmEl === 'Kim') climateGods.push('Thủy');
		}

		return climateGods;
	}
}
