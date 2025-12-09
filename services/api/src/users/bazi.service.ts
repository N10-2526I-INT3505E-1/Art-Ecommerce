/**
 * src/users/bazi.service.ts
 *
 * BAZI QUANTITATIVE ENGINE (VULONG METHOD & TRICH THIEN TUY)
 * FULL VERSION - DO NOT SIMPLIFY
 */

import { SolarDate } from '@nghiavuive/lunar_date_vi';
import type { BaziInput } from './bazi.model';
import type {
	BaziResult,
	BaziChart,
	Pillar,
	EnergyNode,
	HeavenlyStem,
	EarthlyBranch,
	LifeCycleStage,
	FiveElement,
	TenGod,
	CenterZoneAnalysis,
	LimitScoreProfile,
	Interaction,
	PillarPosition,
} from './bazi.types';

import {
	HIDDEN_STEMS,
	ELEMENT_RELATIONS,
	STEM_COMBINATIONS,
	BRANCH_SIX_COMBINATIONS,
	BRANCH_TRI_COMBINATIONS,
	BRANCH_SEASONAL_COMBINATIONS,
	BRANCH_CLASHES,
	LIFE_CYCLE_TABLE,
	TEN_GODS_MAPPING,
	HEAVENLY_STEMS,
	EARTHLY_BRANCHES,
	SOLAR_TERM_TO_BRANCH_INDEX,
	STEM_POLARITY,
	MONTH_COMMANDER_RULES,
} from './bazi.constants';

// =============================================================================
// 1. CẤU HÌNH HỆ SỐ VẬT LÝ (PHYSICS CONFIGURATION) - THEO VULONG
// =============================================================================

// Điểm số thực nghiệm từ sách Giải Mã Tứ Trụ (Ảnh 21)
export const LIFE_CYCLE_SCORES: Record<LifeCycleStage, number> = {
	DeVuong: 10.0,
	LamQuan: 9.0,
	QuanDoi: 8.0,
	MocDuc: 7.0, // VuLong: 7đv
	TruongSinh: 6.0, // VuLong: 6đv
	Suy: 5.1, // VuLong: Max 5.1đv
	Benh: 4.8, // VuLong: Max 4.83đv
	Tu: 3.0, // VuLong: 3đv
	Mo: 3.0, // VuLong: 3đv
	Tuyet: 3.1, // VuLong: 3.1đv
	Thai: 4.1, // VuLong: 4.1đv
	Duong: 4.2, // VuLong: 4.2đv
};

const DECAY = {
	// Tương tác
	TRANSFORM_BONUS: 1.5, // Hóa cục thành công
	COMBINE_BINDING: 0.2, // Hợp trói (không hóa)
	CLASH_WINNER: 0.7, // Thắng xung
	CLASH_LOSER: 0.2, // Thua xung
	CLASH_DRAW: 0.4, // Xung hòa

	// Dòng chảy & Vị trí (VuLong Physics - Chương 9)
	ENTER_CENTER_FACTOR: 0.6, // Đi vào vùng tâm bị giảm 2/5 (còn lại 0.6)
	INTRA_CENTER_FACTOR: 1.0, // Trong vùng tâm giữ nguyên

	// Hao hụt khi khắc/sinh giữa các trụ
	FLOW_GENERATE_LOSS: 0.3, // Sinh cho người khác mất 30% lực
	FLOW_OVERCOME_LOSS: 0.2, // Khắc người khác mất 20% lực
};

const LIMIT_SCORES = {
	DUNG_THAN: -1.0,
	HY_THAN: -0.5,
	KY_THAN: 0.5,
	HUNG_THAN: 1.0,
	NHAN_THAN: 0.1,
};

export class BaziService {
	/**
	 * API PUBLIC: Tính toán Bát Tự
	 */
	public async calculateBazi(input: Omit<BaziInput, 'user_id' | 'id'>) {
		// 0. Tạo đối tượng Date chuẩn từ input
		const birthDate = new Date(
			input.birth_year,
			input.birth_month - 1,
			input.birth_day,
			input.birth_hour,
			input.birth_minute,
		);

		// 1. Lập Trụ (Thiên văn)
		const chart = this.calculatePillars(birthDate);

		// 2. Phân tích Năng lượng (Truyền birthDate vào để tính Lệnh tháng chính xác)
		const analysis = this.analyzeChart(chart, birthDate);

		// 3. Mapping dữ liệu trả về
		return {
			...input,
			year_stem: chart.year.stem,
			year_branch: chart.year.branch,
			month_stem: chart.month.stem,
			month_branch: chart.month.branch,
			day_stem: chart.day.stem,
			day_branch: chart.day.branch,
			hour_stem: chart.hour.stem,
			hour_branch: chart.hour.branch,

			structure_name: analysis.structure,
			structure_type: analysis.structureType,
			day_master_status: analysis.centerZone.isVwang ? 'Vượng' : 'Nhược',

			analysis_reason: analysis.auditLogs.join('\n'),

			// Dữ liệu chi tiết cho Frontend vẽ biểu đồ
			center_analysis: analysis.centerZone,
			energy_flow: analysis.energyFlow,
			limit_score: analysis.limitScore,

			favorable_elements: analysis.limitScore.dungThan,
			party_score: analysis.centerZone.partyScore,
			enemy_score: analysis.centerZone.enemyScore,

			// Các trường phụ
			percentage_self: 0,
			luck_start_age: 0,
			element_scores: {},
			god_scores: {},
			interactions: analysis.interactions,
			score_details: [],
			shen_sha: [],
		};
	}

	/**
	 * CORE PIPELINE: Thực hiện 5 bước phân tích VuLong
	 */
	private analyzeChart(chart: BaziChart, inputDate: Date): BaziResult {
		const auditLogs: string[] = [];
		auditLogs.push(`--- BẮT ĐẦU PHÂN TÍCH ---`);
		auditLogs.push(
			`Nhật chủ: ${chart.day.stem} (${this.getStemElement(chart.day.stem)}) sinh tháng ${chart.month.branch}.`,
		);

		// BƯỚC 1: KHỞI TẠO (Tính điểm gốc theo Lệnh tháng & Tư lệnh)
		let nodes = this.initializeEnergyGraph(chart, inputDate, auditLogs);

		// BƯỚC 2: XỬ LÝ TƯƠNG TÁC (Hợp/Xung/Hóa)
		const interactionResult = this.processInteractions(nodes, chart.month.branch, auditLogs);
		nodes = interactionResult.nodes;

		// BƯỚC 3: DÒNG CHẢY & VÙNG TÂM (Updated Logic VuLong)
		nodes = this.calculateFlowAndCenter(nodes, chart, auditLogs);

		// BƯỚC 4: CƯỜNG NHƯỢC
		const analysis = this.determineStructureAndStrength(nodes, chart.day.stem, auditLogs);

		// BƯỚC 5: ĐIỂM HẠN
		const limitProfile = this.calculateLimitScoreProfile(
			analysis.centerZone,
			analysis.godScores,
			analysis.dmElement,
			analysis.structureType,
			auditLogs,
		);

		auditLogs.push(
			`=== KẾT LUẬN: ${analysis.structure} (${analysis.centerZone.isVwang ? 'Thân Vượng' : 'Thân Nhược'}) ===`,
		);

		return {
			pillars: chart,
			energyFlow: nodes,
			interactions: interactionResult.interactions,
			centerZone: analysis.centerZone,
			structure: analysis.structure,
			limitScore: limitProfile,
			auditLogs: auditLogs,
		};
	}

	// ====================================================================
	// 1. LẬP TRỤ (ASTRONOMY)
	// ====================================================================

	private calculatePillars(birthDate: Date): BaziChart {
		// Xử lý Dạ Tý (23h-0h): Tính sang Can Chi ngày hôm sau
		let dateForDayPillar = new Date(birthDate);
		if (birthDate.getHours() >= 23) {
			dateForDayPillar.setDate(dateForDayPillar.getDate() + 1);
		}

		const solarObj = new SolarDate(birthDate);
		const lunarObj = solarObj.toLunarDate();
		lunarObj.init();

		const solarObjForDay = new SolarDate(dateForDayPillar);
		const lunarObjForDay = solarObjForDay.toLunarDate();
		lunarObjForDay.init();

		const currentSolarTerm = lunarObj.getSolarTerm();

		const dayPillar = this.createPillarFromLunarName(lunarObjForDay.getDayName(), 'Day');
		const hourPillar = this.getHourPillar(birthDate.getHours(), dayPillar.canIndex);
		const yearPillar = this.getYearPillar(lunarObj, currentSolarTerm);
		const monthPillar = this.getMonthPillar(yearPillar.canIndex, currentSolarTerm);

		return { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar };
	}

	// ====================================================================
	// 2. KHỞI TẠO NĂNG LƯỢNG (Fix: InputDate & Commander Logic)
	// ====================================================================

	private initializeEnergyGraph(chart: BaziChart, inputDate: Date, logs: string[]): EnergyNode[] {
		const nodes: EnergyNode[] = [];
		const pillars: Pillar[] = [chart.year, chart.month, chart.day, chart.hour];
		const monthBranch = chart.month.branch;

		// 1. Tính số ngày từ Tiết khí gần nhất -> Xác định Nhân Nguyên Tư Lệnh
		const daysSinceTerm = this.calculateDaysSinceSolarTerm(inputDate);
		const commanderStem = this.getCommanderStem(monthBranch, daysSinceTerm);

		logs.push(
			`>> Lệnh tháng ${monthBranch}, sinh sau tiết ${daysSinceTerm} ngày. Tư lệnh: ${commanderStem}.`,
		);

		pillars.forEach((pillar) => {
			// A. Thiên Can
			const stemInfo = this.calculateStemPower(pillar.stem, monthBranch);
			let stemScore = stemInfo.score;

			// Bonus: Nếu Can lộ trùng với Can Tư Lệnh (Đắc Lệnh)
			if (pillar.stem === commanderStem) {
				stemScore *= 1.2;
				logs.push(`> Can ${pillar.stem} đắc lệnh (Tư lệnh).`);
			}

			nodes.push({
				id: `${pillar.position}_Stem`,
				source: pillar.position,
				type: 'Stem',
				name: pillar.stem,
				element: pillar.stemElement,
				lifeCycleStage: stemInfo.stage,
				baseScore: stemScore,
				currentScore: stemScore,
				isBlocked: false,
				isCombined: false,
				modifications: [],
			});

			// B. Địa Chi (Logic Tư Lệnh cho Tháng, Tĩnh cho các trụ khác)
			if (pillar.position === 'Month') {
				this.createMonthBranchNodes(nodes, pillar, commanderStem, monthBranch);
			} else {
				this.createStaticBranchNodes(nodes, pillar, monthBranch);
			}
		});

		return nodes;
	}

	/**
	 * Tính số ngày từ Tiết khí (Jie Qi) đến ngày sinh.
	 * Logic: Quét ngược tối đa 35 ngày để tìm ngày bắt đầu Tiết.
	 */
	private calculateDaysSinceSolarTerm(inputDate: Date): number {
		// Danh sách 12 Tiết lệnh tháng (Jie) - Không tính Trung Khí (Qi)
		const MONTH_STARTERS = [
			'Lập xuân',
			'Kinh trập',
			'Thanh minh',
			'Lập hạ',
			'Mang chủng',
			'Tiểu thử',
			'Lập thu',
			'Bạch lộ',
			'Hàn lộ',
			'Lập đông',
			'Đại tuyết',
			'Tiểu hàn',
		];

		let checkDate = new Date(inputDate);
		checkDate.setHours(12, 0, 0, 0); // Tránh lỗi giờ

		// Lùi lại tối đa 35 ngày
		for (let daysBack = 0; daysBack < 35; daysBack++) {
			const sDate = new SolarDate(checkDate);
			const lDate = sDate.toLunarDate();
			lDate.init();

			const currentTerm = lDate.getSolarTerm();

			// Lấy ngày hôm trước để check thời điểm chuyển tiết
			const prevDate = new Date(checkDate);
			prevDate.setDate(prevDate.getDate() - 1);
			const sPrev = new SolarDate(prevDate);
			const lPrev = sPrev.toLunarDate();
			lPrev.init();
			const prevTerm = lPrev.getSolarTerm();

			// Nếu hôm nay có Tiết và hôm qua chưa có (hoặc khác) -> Đây là ngày bắt đầu Tiết
			if (MONTH_STARTERS.includes(currentTerm) && currentTerm !== prevTerm) {
				return daysBack;
			}

			checkDate.setDate(checkDate.getDate() - 1);
		}

		return 15; // Fallback an toàn (giữa tháng)
	}

	// ====================================================================
	// 3. XỬ LÝ TƯƠNG TÁC (INTERACTION PHYSICS)
	// ====================================================================

	private processInteractions(
		nodes: EnergyNode[],
		monthBranch: EarthlyBranch,
		logs: string[],
	): { nodes: EnergyNode[]; interactions: Interaction[] } {
		let currentNodes = [...nodes];
		const interactions: Interaction[] = [];

		// 1. Tam Hội (Seasonal) - Lực mạnh nhất
		const seasonalRes = this.processBranchGroup(currentNodes, 'TamHoi', monthBranch, logs);
		currentNodes = seasonalRes.nodes;

		// 2. Tam Hợp (Triple) - Lực mạnh nhì
		const tripleRes = this.processBranchGroup(currentNodes, 'TamHop', monthBranch, logs);
		currentNodes = tripleRes.nodes;

		// 3. Lục Hợp
		const sixRes = this.processAdjacency(currentNodes, 'LucHop', monthBranch, logs);
		currentNodes = sixRes.nodes;

		// 4. Lục Xung
		const clashRes = this.processAdjacency(currentNodes, 'LucXung', monthBranch, logs);
		currentNodes = clashRes.nodes;

		// 5. Ngũ Hợp Can
		const stemRes = this.processStemCombinations(currentNodes, monthBranch, logs);
		currentNodes = stemRes.nodes;

		return { nodes: currentNodes, interactions };
	}

	// ====================================================================
	// 4. DÒNG CHẢY & VÙNG TÂM (Core Logic VuLong)
	// ====================================================================

	private calculateFlowAndCenter(
		nodes: EnergyNode[],
		chart: BaziChart,
		logs: string[],
	): EnergyNode[] {
		// Dòng chảy giữa các trụ (Năm -> Tháng, Giờ -> Ngày)
		this.processPillarToPillarFlow(nodes, 'Year', 'Month', logs);
		this.processPillarToPillarFlow(nodes, 'Hour', 'Day', logs);

		// Tính điểm Nhật Chủ tại Vùng Tâm
		this.calculateCenterAccumulation(nodes, chart.day.stem, logs);

		return nodes;
	}

	/**
	 * TÍNH ĐIỂM NHẬT CHỦ THEO VÙNG TÂM (V-SHAPE)
	 * Logic: Can Tháng, Can Giờ, Chi Ngày thuộc Vùng Tâm (hệ số 1.0).
	 * Các vị trí khác thuộc Vùng Ngoài (hệ số 0.6 - giảm 2/5).
	 */
	private calculateCenterAccumulation(
		nodes: EnergyNode[],
		dmStemOriginal: HeavenlyStem,
		logs: string[],
	) {
		const dmNode = nodes.find((n) => n.source === 'Day' && n.type === 'Stem');
		if (!dmNode) return;

		const dmElement = dmNode.transformTo || dmNode.element;

		logs.push(`\n--- TỤ KHÍ VÙNG TÂM (NHẬT CHỦ: ${dmElement}) ---`);
		logs.push(`Điểm gốc (theo Lệnh tháng): ${dmNode.baseScore.toFixed(2)}`);

		// Định nghĩa Vùng Tâm: Can Tháng, Can Giờ, Chi Ngày
		const isCenterZone = (n: EnergyNode): boolean => {
			if (n.source === 'Month' && n.type === 'Stem') return true;
			if (n.source === 'Hour' && n.type === 'Stem') return true;
			if (n.source === 'Day' && n.type === 'HiddenStem') return true;
			return false;
		};

		let totalSupport = 0;
		let totalDrain = 0;

		nodes.forEach((node) => {
			if (node === dmNode || node.isBlocked || node.currentScore <= 0.1) return;

			const nodeElement = node.transformTo || node.element;

			// Hệ số vị trí: Vùng Tâm giữ nguyên, Vùng Ngoài giảm 2/5
			const positionFactor = isCenterZone(node)
				? DECAY.INTRA_CENTER_FACTOR
				: DECAY.ENTER_CENTER_FACTOR;
			const zoneName = isCenterZone(node) ? 'Vùng Tâm' : 'Vùng Ngoài';

			// Tính lực thực tế sau khi đi vào vùng tâm
			const effectiveScore = node.currentScore * positionFactor;

			const relation = this.getRelation(nodeElement, dmElement);

			switch (relation) {
				case 'Hoa': // Tỷ Kiếp (Cùng hành)
					totalSupport += effectiveScore;
					logs.push(`> [+] ${node.name} (${zoneName}): +${effectiveScore.toFixed(2)} (Tỷ hòa)`);
					break;
				case 'Sinh': // Ấn Kiêu (Sinh ta)
					totalSupport += effectiveScore;
					logs.push(`> [+] ${node.name} (${zoneName}): +${effectiveScore.toFixed(2)} (Sinh nhập)`);
					break;
				case 'Khac': // Quan Sát (Khắc ta)
					totalDrain += effectiveScore;
					logs.push(`> [-] ${node.name} (${zoneName}): -${effectiveScore.toFixed(2)} (Khắc thân)`);
					break;
				case 'DuocSinh': // Thực Thương (Ta sinh) - Hao khí
					totalDrain += effectiveScore;
					logs.push(`> [-] ${node.name} (${zoneName}): -${effectiveScore.toFixed(2)} (Sinh xuất)`);
					break;
				case 'BiKhac': // Tài Tinh (Ta khắc) - Hao lực
					// Khắc xuất cũng tốn sức, nhưng ít hơn bị khắc
					const wealthDrain = effectiveScore * DECAY.FLOW_OVERCOME_LOSS;
					totalDrain += wealthDrain;
					logs.push(`> [-] ${node.name} (${zoneName}): -${wealthDrain.toFixed(2)} (Khắc xuất/Tài)`);
					break;
			}
		});

		let finalScore = dmNode.baseScore + totalSupport - totalDrain;
		if (finalScore < 0) finalScore = 0;
		dmNode.currentScore = finalScore;

		logs.push(`\n=== TỔNG KẾT NHẬT CHỦ ===`);
		logs.push(`   (+) Gốc: ${dmNode.baseScore.toFixed(2)}`);
		logs.push(`   (+) Được Sinh/Trợ: ${totalSupport.toFixed(2)}`);
		logs.push(`   (-) Bị Khắc/Tiết: ${totalDrain.toFixed(2)}`);
		logs.push(`   (=) ĐIỂM VƯỢNG CUỐI CÙNG: ${finalScore.toFixed(2)}`);
	}

	// ====================================================================
	// CÁC HÀM HELPER CHI TIẾT (KHÔNG RÚT GỌN)
	// ====================================================================

	/**
	 * Tạo Nodes cho Chi Tháng (Logic Tư Lệnh)
	 */
	private createMonthBranchNodes(
		nodes: EnergyNode[],
		pillar: Pillar,
		commander: HeavenlyStem,
		monthCmd: EarthlyBranch,
	) {
		const hiddens = HIDDEN_STEMS[pillar.branch];
		hiddens.forEach((h, idx) => {
			let ratio = h.ratio;
			let note = '';
			// Logic VuLong: Can tư lệnh được ưu tiên
			if (h.stem === commander) {
				if (h.isMain) {
					ratio = 1.0;
					note = ' (Bản khí nắm lệnh)';
				} else {
					ratio = 0.5; // Tăng lực cho Tạp khí nắm lệnh
					note = ' (Tạp khí nắm lệnh)';
				}
			} else {
				if (!h.isMain) ratio = 0.1; // Tạp khí thất lệnh rất yếu
			}

			const info = this.calculateStemPower(h.stem, monthCmd);
			const score = info.score * ratio;

			nodes.push({
				id: `${pillar.position}_Branch_${idx}`,
				source: pillar.position,
				type: 'HiddenStem',
				name: h.stem,
				element: this.getStemElement(h.stem),
				branchOwner: pillar.branch,
				lifeCycleStage: info.stage,
				baseScore: score,
				currentScore: score,
				isBlocked: false,
				isCombined: false,
				modifications: [{ reason: `Lệnh tháng${note}`, valueChange: 0, factor: ratio }],
			});
		});
	}

	/**
	 * Tạo Nodes cho Chi Tĩnh (Năm/Ngày/Giờ)
	 */
	private createStaticBranchNodes(nodes: EnergyNode[], pillar: Pillar, monthCmd: EarthlyBranch) {
		const hiddens = HIDDEN_STEMS[pillar.branch];
		hiddens.forEach((h, idx) => {
			const info = this.calculateStemPower(h.stem, monthCmd);
			const score = info.score * h.ratio; // Dùng tỷ lệ tĩnh chuẩn
			nodes.push({
				id: `${pillar.position}_Branch_${idx}`,
				source: pillar.position,
				type: 'HiddenStem',
				name: h.stem,
				element: this.getStemElement(h.stem),
				branchOwner: pillar.branch,
				lifeCycleStage: info.stage,
				baseScore: score,
				currentScore: score,
				isBlocked: false,
				isCombined: false,
				modifications: [{ reason: `Tàng can tĩnh`, valueChange: 0, factor: h.ratio }],
			});
		});
	}

	private processBranchGroup(
		nodes: EnergyNode[],
		type: 'TamHoi' | 'TamHop',
		monthBranch: EarthlyBranch,
		logs: string[],
	) {
		const dictionary = type === 'TamHoi' ? BRANCH_SEASONAL_COMBINATIONS : BRANCH_TRI_COMBINATIONS;
		const activeNodes = nodes.filter(
			(n) => n.type === 'HiddenStem' && n.id.endsWith('_0') && !n.isBlocked,
		);
		const checkedGroups = new Set<string>();

		Object.values(dictionary).forEach((config) => {
			const groupKey = config.group.sort().join('-');
			if (checkedGroups.has(groupKey)) return;
			checkedGroups.add(groupKey);

			// Tìm các node khớp với nhóm
			const matchedNodesMap = new Map<EarthlyBranch, EnergyNode[]>();
			activeNodes.forEach((node) => {
				if (config.group.includes(node.branchOwner!)) {
					if (!matchedNodesMap.has(node.branchOwner!)) matchedNodesMap.set(node.branchOwner!, []);
					matchedNodesMap.get(node.branchOwner!)!.push(node);
				}
			});

			if (matchedNodesMap.size === 3) {
				const resultEl = config.result;
				// Điều kiện hóa: Có Thần dẫn (Can lộ) hoặc Lệnh tháng ủng hộ
				const hasLead = nodes.some(
					(n) => n.type === 'Stem' && !n.isBlocked && n.element === resultEl,
				);
				const monthEl = this.getBranchMainElement(monthBranch);
				const isSupport = monthEl === resultEl || ELEMENT_RELATIONS[monthEl].generate === resultEl;

				if (hasLead || isSupport) {
					logs.push(`>> ${type}: ${config.group.join('-')} HÓA THÀNH CÔNG khí ${resultEl}.`);

					// Gom điểm
					const participants = [
						matchedNodesMap.get(config.group[0])![0],
						matchedNodesMap.get(config.group[1])![0],
						matchedNodesMap.get(config.group[2])![0],
					];
					const totalScore = participants.reduce((sum, n) => sum + n.currentScore, 0);

					nodes.push({
						id: `${type}_${resultEl}_${Date.now()}`,
						source: 'Month',
						type: 'HiddenStem',
						name: `${type} ${resultEl} Cục`,
						element: resultEl,
						lifeCycleStage: 'DeVuong',
						baseScore: totalScore,
						currentScore: totalScore * DECAY.TRANSFORM_BONUS,
						isBlocked: false,
						isCombined: true,
						modifications: [{ reason: 'Hóa cục', valueChange: 0, factor: DECAY.TRANSFORM_BONUS }],
					});

					// Block nodes cũ
					participants.forEach((p) => {
						this.blockPillarBranch(nodes, p.source, `Tham gia ${type}`);
					});
				}
			}
		});
		return { nodes, interactions: [] };
	}

	private processAdjacency(
		nodes: EnergyNode[],
		type: 'LucHop' | 'LucXung',
		monthBranch: EarthlyBranch,
		logs: string[],
	) {
		const getMain = (pos: string) =>
			nodes.find(
				(n) => n.source === pos && n.type === 'HiddenStem' && n.id.endsWith('_0') && !n.isBlocked,
			);
		const pairs = [
			{ p1: 'Year', p2: 'Month' },
			{ p1: 'Month', p2: 'Day' },
			{ p1: 'Day', p2: 'Hour' },
		];

		pairs.forEach((pair) => {
			const n1 = getMain(pair.p1);
			const n2 = getMain(pair.p2);
			if (!n1 || !n2 || !n1.branchOwner || !n2.branchOwner) return;

			if (type === 'LucXung' && BRANCH_CLASHES[n1.branchOwner] === n2.branchOwner) {
				const s1 = n1.currentScore;
				const s2 = n2.currentScore;
				// Logic Xung: Mạnh thắng Yếu (Gấp 1.5 lần thì thắng)
				if (s1 > s2 * 1.5) {
					this.applyDecay(n1, DECAY.CLASH_WINNER, `Thắng xung ${n2.branchOwner}`);
					this.applyDecay(n2, DECAY.CLASH_LOSER, `Thua xung ${n1.branchOwner}`);
				} else if (s2 > s1 * 1.5) {
					this.applyDecay(n1, DECAY.CLASH_LOSER, `Thua xung ${n2.branchOwner}`);
					this.applyDecay(n2, DECAY.CLASH_WINNER, `Thắng xung ${n1.branchOwner}`);
				} else {
					this.applyDecay(n1, DECAY.CLASH_DRAW, `Xung hòa ${n2.branchOwner}`);
					this.applyDecay(n2, DECAY.CLASH_DRAW, `Xung hòa ${n1.branchOwner}`);
				}
				logs.push(`>> Lục Xung: ${n1.branchOwner} <> ${n2.branchOwner}`);
			} else if (type === 'LucHop') {
				const combo = BRANCH_SIX_COMBINATIONS[n1.branchOwner];
				if (combo && combo.target === n2.branchOwner) {
					const resEl = combo.result;
					const monthEl = this.getBranchMainElement(monthBranch);
					const hasLead = nodes.some(
						(n) => n.type === 'Stem' && !n.isBlocked && n.element === resEl,
					);

					// Hóa hay Trói?
					if (hasLead || monthEl === resEl) {
						logs.push(`>> Lục Hợp: ${n1.branchOwner}-${n2.branchOwner} HÓA ${resEl}`);
						n1.element = resEl;
						n1.name = `${n1.branchOwner}-${n2.branchOwner} Hóa ${resEl}`;
						n1.currentScore = (n1.currentScore + n2.currentScore) * DECAY.TRANSFORM_BONUS;
						n2.isBlocked = true;
						n2.currentScore = 0;
					} else {
						logs.push(`>> Lục Hợp: ${n1.branchOwner}-${n2.branchOwner} TRÓI (Không hóa)`);
						this.applyDecay(n1, DECAY.COMBINE_BINDING, 'Hợp trói');
						this.applyDecay(n2, DECAY.COMBINE_BINDING, 'Hợp trói');
					}
				}
			}
		});
		return { nodes, interactions: [] };
	}

	private processStemCombinations(nodes: EnergyNode[], monthBranch: EarthlyBranch, logs: string[]) {
		const getStem = (pos: string) =>
			nodes.find((n) => n.source === pos && n.type === 'Stem' && !n.isBlocked);
		const pairs = [
			{ p1: 'Year', p2: 'Month' },
			{ p1: 'Month', p2: 'Day' },
			{ p1: 'Day', p2: 'Hour' },
		];

		pairs.forEach((pair) => {
			const s1 = getStem(pair.p1);
			const s2 = getStem(pair.p2);
			if (s1 && s2) {
				const combo = STEM_COMBINATIONS[s1.name as HeavenlyStem];
				if (combo && combo.target === s2.name) {
					const resEl = combo.result;
					// Check Lệnh tháng (bao gồm cả Hóa cục ở chi tháng nếu có)
					const monthEl = this.getBranchMainElement(monthBranch);
					const monthTamNode = nodes.find((n) => n.source === 'Month' && n.isCombined);
					const realMonthEl = monthTamNode ? monthTamNode.element : monthEl;

					if (realMonthEl === resEl) {
						logs.push(`>> Can Hợp: ${s1.name}-${s2.name} HÓA ${resEl}`);
						s1.transformTo = resEl;
						s1.currentScore *= DECAY.TRANSFORM_BONUS;
						s2.transformTo = resEl;
						s2.currentScore *= DECAY.TRANSFORM_BONUS;
					} else {
						logs.push(`>> Can Hợp: ${s1.name}-${s2.name} TRÓI`);
						this.applyDecay(s1, DECAY.COMBINE_BINDING, `Trói ${s2.name}`);
						this.applyDecay(s2, DECAY.COMBINE_BINDING, `Trói ${s1.name}`);
					}
				}
			}
		});
		return { nodes, interactions: [] };
	}

	private processPillarToPillarFlow(
		nodes: EnergyNode[],
		src: PillarPosition,
		target: PillarPosition,
		logs: string[],
	) {
		const sNodes = nodes.filter((n) => n.source === src && !n.isBlocked);
		const tNodes = nodes.filter((n) => n.source === target && !n.isBlocked);
		if (!sNodes.length || !tNodes.length) return;

		const sEl = this.getPillarDominantElement(sNodes);
		const tEl = this.getPillarDominantElement(tNodes);
		const sScore = this.getPillarTotalScore(sNodes);
		const rel = this.getRelation(sEl, tEl);

		// Mapping tên tiếng Việt cho Log
		const posName: Record<string, string> = {
			Year: 'Năm',
			Month: 'Tháng',
			Day: 'Ngày',
			Hour: 'Giờ',
		};

		if (rel === 'Sinh') {
			// Nguồn sinh Đích -> Nguồn mất lực, Đích được lợi
			this.decayPillarScore(sNodes, DECAY.FLOW_GENERATE_LOSS, `Sinh xuất cho ${posName[target]}`);
			const gain = sScore * 0.3; // Hiệu suất sinh
			this.boostPillarScore(tNodes, gain, tEl, `Được ${posName[src]} sinh nhập`);
			logs.push(
				`Dòng chảy ${posName[src]} -> ${posName[target]}: Tương sinh (+${gain.toFixed(2)}đ)`,
			);
		} else if (rel === 'Khac') {
			// Nguồn khắc Đích -> Nguồn hao lực, Đích bị thương
			this.decayPillarScore(sNodes, DECAY.FLOW_OVERCOME_LOSS, `Khắc xuất ${posName[target]}`);
			this.decayPillarScore(tNodes, 0.4, `Bị ${posName[src]} khắc nhập`);
			logs.push(`Dòng chảy ${posName[src]} -> ${posName[target]}: Tương khắc (Tổn hao)`);
		} else if (rel === 'Hoa') {
			const boost = sScore * 0.1;
			this.boostPillarScore(tNodes, boost, tEl, `Tỷ hòa với ${posName[src]}`);
			logs.push(`Dòng chảy ${posName[src]} -> ${posName[target]}: Tỷ hòa (+${boost.toFixed(2)}đ)`);
		}
	}

	private determineStructureAndStrength(nodes: EnergyNode[], dmStem: HeavenlyStem, logs: string[]) {
		const dmNode = nodes.find((n) => n.source === 'Day' && n.type === 'Stem');
		const dmEl = dmNode?.transformTo || dmNode?.element || this.getStemElement(dmStem);
		const dmScore = dmNode?.currentScore || 0;

		const elScores = this.aggregateScores(nodes);
		const godScores = this.calculateGodScores(nodes, dmEl, dmStem);

		const party = godScores.TyKien + godScores.KiepTai + godScores.ChinhAn + godScores.ThienAn;
		const total = Object.values(elScores).reduce((a, b) => a + b, 0);
		const enemy = total - party;

		// Logic VuLong: So sánh điểm Nhật chủ với Địch mạnh nhất
		// Nếu Nhật chủ > Địch + 1 -> Vượng
		const isVwang = dmScore >= 5.0; // Đây là ngưỡng ước lượng, có thể cần tinh chỉnh thêm theo thực tế

		logs.push(`\n>> Phân tích Cường Nhược:`);
		logs.push(`   Phe Ta (Ấn+Tỷ): ${party.toFixed(1)}`);
		logs.push(`   Phe Địch (Tài+Quan+Thực): ${enemy.toFixed(1)}`);
		logs.push(`   => Kết luận: ${isVwang ? 'Thân Vượng' : 'Thân Nhược'}`);

		return {
			centerZone: {
				dayMasterScore: dmScore,
				partyScore: party,
				enemyScore: enemy,
				diffScore: party - enemy,
				isVwang,
				isStrongVwang: false,
				isWeakVwang: false,
			},
			structure: isVwang ? 'Thân Vượng' : 'Thân Nhược',
			structureType: 'Nội Cách',
			godScores,
			dmElement: dmEl,
		};
	}

	private calculateLimitScoreProfile(
		center: CenterZoneAnalysis,
		godScores: Record<TenGod, number>,
		dmEl: FiveElement,
		structType: string,
		logs: string[],
	): LimitScoreProfile {
		let dung: FiveElement[] = [],
			hy: FiveElement[] = [],
			ky: FiveElement[] = [],
			hung: FiveElement[] = [];
		const map = TEN_GODS_MAPPING[dmEl];
		const getEl = (g: string) => (map as any)[g] as FiveElement;

		// Tính điểm phe Ta
		const scoreIndource = godScores.ChinhAn + godScores.ThienAn; // Ấn
		const scoreSelf = godScores.TyKien + godScores.KiepTai; // Tỷ

		if (structType.includes('Ngoại')) {
			// Logic Ngoại cách (Tòng/Hóa) - Giữ nguyên như cũ hoặc tinh chỉnh sau
			if (center.isWeakVwang) {
				// Tòng
				dung.push(
					getEl('ChinhTai'),
					getEl('ThienTai'),
					getEl('ChinhQuan'),
					getEl('ThatSat'),
					getEl('ThucThan'),
					getEl('ThuongQuan'),
				);
				ky.push(getEl('ChinhAn'), getEl('ThienAn'), getEl('TyKien'), getEl('KiepTai'));
			} else {
				// Độc vượng
				dung.push(getEl('TyKien'), getEl('KiepTai'), getEl('ChinhAn'), getEl('ThienAn'));
				ky.push(getEl('ChinhTai'), getEl('ThienTai'), getEl('ChinhQuan'), getEl('ThatSat'));
			}
		} else {
			// NỘI CÁCH (CHÍNH CÁCH)
			if (center.isVwang) {
				// --- THÂN VƯỢNG ---
				logs.push('>> Thân Vượng: Cần Khắc/Tiết/Hao.');
				// Nếu Vượng do Ấn nhiều -> Dụng Tài phá Ấn (Ưu tiên 1), Hỷ Thực Thương.
				if (scoreIndource > scoreSelf) {
					dung.push(getEl('ChinhTai'), getEl('ThienTai'));
					hy.push(getEl('ThucThan'), getEl('ThuongQuan'), getEl('ChinhQuan'), getEl('ThatSat'));
				} else {
					// Vượng do Tỷ Kiếp -> Dụng Quan Sát (Ưu tiên 1), Hỷ Tài/Thực.
					dung.push(getEl('ChinhQuan'), getEl('ThatSat'));
					hy.push(getEl('ThucThan'), getEl('ThuongQuan'), getEl('ChinhTai'), getEl('ThienTai'));
				}

				ky.push(getEl('ChinhAn'), getEl('ThienAn'), getEl('TyKien'), getEl('KiepTai'));

				// Hung thần (Khắc dụng thần)
				if (dung.includes(getEl('ChinhTai'))) hung.push(getEl('KiepTai')); // Kiếp tài
				if (dung.includes(getEl('ChinhQuan'))) hung.push(getEl('ThuongQuan')); // Thương quan
			} else {
				// --- THÂN NHƯỢC ---
				logs.push('>> Thân Nhược: Cần Sinh/Trợ.');

				// Logic VuLong: Chọn hành cứu giải mạnh nhất làm Dụng, hành hỗ trợ làm Hỷ.
				// Thường lấy Ấn làm Dụng thần đầu tiên cho thân nhược.
				dung.push(getEl('ChinhAn'), getEl('ThienAn'));
				hy.push(getEl('TyKien'), getEl('KiepTai'));

				ky.push(
					getEl('ChinhQuan'),
					getEl('ThatSat'),
					getEl('ThucThan'),
					getEl('ThuongQuan'),
					getEl('ChinhTai'),
					getEl('ThienTai'),
				);

				// Hung thần nguy hiểm nhất cho thân nhược là Tài (vì Tài phá Ấn - Phá dụng thần)
				hung.push(getEl('ChinhTai'), getEl('ThienTai'));
			}
		}

		// --- LỌC TRÙNG LẶP (FIX LỖI UI) ---
		const unique = (arr: FiveElement[]) => [...new Set(arr)];
		dung = unique(dung);
		hy = unique(hy);
		ky = unique(ky);
		hung = unique(hung);

		// Loại bỏ Hỷ thần nếu nó trùng với Dụng thần (để Dụng thần ưu tiên hiển thị)
		hy = hy.filter((el) => !dung.includes(el));
		// Loại bỏ Kỵ thần nếu trùng Hung thần
		ky = ky.filter((el) => !hung.includes(el));

		// Mapping điểm số
		const scores: Record<string, number> = { Kim: 0, Mộc: 0, Thủy: 0, Hỏa: 0, Thổ: 0 };

		// Gán điểm theo thứ tự ưu tiên: Hung > Dụng > Kỵ > Hỷ
		// (Lưu ý: Logic đè điểm để đảm bảo một hành chỉ có 1 điểm số duy nhất)
		const allElements: FiveElement[] = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];
		allElements.forEach((el) => {
			if (hung.includes(el)) scores[el] = LIMIT_SCORES.HUNG_THAN;
			else if (dung.includes(el)) scores[el] = LIMIT_SCORES.DUNG_THAN;
			else if (ky.includes(el)) scores[el] = LIMIT_SCORES.KY_THAN;
			else if (hy.includes(el)) scores[el] = LIMIT_SCORES.HY_THAN;
			else scores[el] = LIMIT_SCORES.NHAN_THAN;
		});

		return { dungThan: dung, hyThan: hy, kyThan: ky, hungThan: hung, scores };
	}

	// ---------------------------------------------------------------------
	// UTILITIES & DATA ACCESS
	// ---------------------------------------------------------------------

	private createPillarFromLunarName(name: string, pos: PillarPosition): any {
		const parts = name.trim().split(' ');
		return this.createPillarFromIndex(
			HEAVENLY_STEMS.indexOf(parts[0] as any),
			EARTHLY_BRANCHES.indexOf(parts[1] as any),
			pos,
		);
	}
	private createPillarFromIndex(c: number, b: number, pos: PillarPosition): any {
		const stem = HEAVENLY_STEMS[c];
		const branch = EARTHLY_BRANCHES[b];
		return {
			position: pos,
			canIndex: c,
			chiIndex: b,
			stem,
			branch,
			stemElement: this.getStemElement(stem),
			branchElement: this.getBranchMainElement(branch),
		};
	}
	private getHourPillar(h: number, dIdx: number) {
		const chi = Math.floor((h + 1) / 2) % 12;
		const can = ((dIdx % 5) * 2 + chi) % 10;
		return this.createPillarFromIndex(can, chi, 'Hour');
	}
	private getYearPillar(lunar: any, term: string) {
		let { canIndex, chiIndex } = this.createPillarFromLunarName(lunar.getYearName(), 'Year');
		// Logic chuyển năm theo Lập Xuân (Tháng 12 chưa lập xuân thì vẫn năm cũ, tháng 1 chưa lập xuân thì lùi năm)
		const month = lunar.get().month;
		if (month === 12 && ['Lập xuân', 'Vũ thủy'].includes(term)) {
			canIndex = (canIndex + 1) % 10;
			chiIndex = (chiIndex + 1) % 12;
		}
		return this.createPillarFromIndex(canIndex, chiIndex, 'Year');
	}
	private getMonthPillar(yIdx: number, term: string) {
		const chi = SOLAR_TERM_TO_BRANCH_INDEX[term] || 2;
		let mOff = chi - 2;
		if (mOff < 0) mOff += 12;
		const can = ((yIdx % 5) * 2 + 2 + mOff) % 10;
		return this.createPillarFromIndex(can, chi, 'Month');
	}
	private getCommanderStem(chi: EarthlyBranch, days: number): HeavenlyStem {
		const rules = MONTH_COMMANDER_RULES[chi];
		let sum = 0;
		for (const r of rules) {
			sum += r.days;
			if (days <= sum) return r.stem;
		}
		return rules[rules.length - 1].stem;
	}
	private getStemElement(s: HeavenlyStem): FiveElement {
		if (['Giáp', 'Ất'].includes(s)) return 'Mộc';
		if (['Bính', 'Đinh'].includes(s)) return 'Hỏa';
		if (['Mậu', 'Kỷ'].includes(s)) return 'Thổ';
		if (['Canh', 'Tân'].includes(s)) return 'Kim';
		return 'Thủy';
	}
	private getBranchMainElement(b: EarthlyBranch): FiveElement {
		return this.getStemElement(HIDDEN_STEMS[b].find((h) => h.isMain)!.stem);
	}
	private calculateStemPower(stem: HeavenlyStem, branch: EarthlyBranch) {
		const stage = LIFE_CYCLE_TABLE[stem][branch];
		return { stage, score: LIFE_CYCLE_SCORES[stage] };
	}
	private getRelation(e1: FiveElement, e2: FiveElement) {
		if (e1 === e2) return 'Hoa';
		if (ELEMENT_RELATIONS[e1].generate === e2) return 'Sinh';
		if (ELEMENT_RELATIONS[e2].generate === e1) return 'DuocSinh';
		if (ELEMENT_RELATIONS[e1].overcome === e2) return 'Khac';
		return 'BiKhac';
	}
	private aggregateScores(nodes: EnergyNode[]) {
		const s = { Kim: 0, Mộc: 0, Thủy: 0, Hỏa: 0, Thổ: 0 };
		nodes.forEach((n) => {
			if (!n.isBlocked) s[n.element] += n.currentScore;
		});
		return s;
	}
	private getPillarDominantElement(nodes: EnergyNode[]) {
		return nodes.reduce((a, b) => (a.currentScore > b.currentScore ? a : b)).element;
	}
	private getPillarTotalScore(nodes: EnergyNode[]) {
		return nodes.reduce((a, b) => a + b.currentScore, 0);
	}

	private applyDecay(n: EnergyNode, f: number, r: string) {
		const loss = n.currentScore * (1 - f);
		n.currentScore *= f;
		n.modifications.push({ reason: r, valueChange: -loss, factor: f });
		if (n.currentScore < 0.5) {
			n.isBlocked = true;
			n.currentScore = 0;
		}
	}
	private decayPillarScore(nodes: EnergyNode[], rate: number, r: string) {
		nodes.forEach((n) => {
			const loss = n.currentScore * rate;
			n.currentScore -= loss;
			n.modifications.push({ reason: r, valueChange: -loss, factor: 1 - rate });
		});
	}
	private boostPillarScore(nodes: EnergyNode[], amt: number, el: FiveElement, r: string) {
		const targets = nodes.filter((n) => n.element === el);
		if (targets.length) targets.forEach((n) => (n.currentScore += amt / targets.length));
		else if (nodes[0]) nodes[0].currentScore += amt;
	}
	private isValidStem(s: string): boolean {
		return HEAVENLY_STEMS.includes(s as any);
	}
	private calculateGodScores(
		nodes: EnergyNode[],
		dmElement: FiveElement,
		dmStemOriginal: HeavenlyStem,
	) {
		const godScores: Record<TenGod, number> = {
			TyKien: 0,
			KiepTai: 0,
			ThucThan: 0,
			ThuongQuan: 0,
			ChinhTai: 0,
			ThienTai: 0,
			ChinhQuan: 0,
			ThatSat: 0,
			ChinhAn: 0,
			ThienAn: 0,
		};
		const dmPolarity = STEM_POLARITY[dmStemOriginal];
		nodes.forEach((node) => {
			if (node.isBlocked || node.currentScore <= 0) return;
			let nodePolarity: 'Yang' | 'Yin';
			if (this.isValidStem(node.name)) nodePolarity = STEM_POLARITY[node.name as HeavenlyStem];
			else {
				// Fallback cho tàng can hoặc hóa khí không rõ can
				godScores[this.determineTenGod(dmElement, dmPolarity, node.element, 'Yang')] +=
					node.currentScore / 2;
				godScores[this.determineTenGod(dmElement, dmPolarity, node.element, 'Yin')] +=
					node.currentScore / 2;
				return;
			}
			const god = this.determineTenGod(dmElement, dmPolarity, node.element, nodePolarity);
			godScores[god] += node.currentScore;
		});
		return godScores;
	}
	private determineTenGod(
		dmEl: FiveElement,
		dmPol: 'Yang' | 'Yin',
		nodeEl: FiveElement,
		nodePol: 'Yang' | 'Yin',
	): TenGod {
		const same = dmPol === nodePol;
		const rel = this.getRelation(dmEl, nodeEl);
		switch (rel) {
			case 'Hoa':
				return same ? 'TyKien' : 'KiepTai';
			case 'Sinh':
				return same ? 'ThucThan' : 'ThuongQuan';
			case 'Khac':
				return same ? 'ThienTai' : 'ChinhTai';
			case 'BiKhac':
				return same ? 'ThatSat' : 'ChinhQuan';
			case 'DuocSinh':
				return same ? 'ThienAn' : 'ChinhAn';
		}
		return 'TyKien';
	}
	private blockPillarBranch(nodes: EnergyNode[], position: string, reason: string) {
		nodes.forEach((n) => {
			if (n.source === position && n.type === 'HiddenStem') {
				n.isBlocked = true;
				n.currentScore = 0;
				n.modifications.push({ reason, valueChange: 0, factor: 0 });
			}
		});
	}
	private getMaxGod(scores: Record<TenGod, number>, exclude: string[] = []): string | null {
		let max = -1,
			key = null;
		for (const [k, v] of Object.entries(scores)) {
			if (!exclude.includes(k) && v > max) {
				max = v;
				key = k;
			}
		}
		return key;
	}
}
