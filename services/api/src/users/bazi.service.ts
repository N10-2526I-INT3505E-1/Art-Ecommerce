/**
 * src/users/bazi.service.ts
 *
 * BAZI QUANTITATIVE ENGINE (VULONG METHOD & TRICH THIEN TUY)
 *
 * Mô hình "Vùng Tâm" định lượng theo học giả Vũ Long:
 *  - Tứ trụ chỉ gồm 8 chữ chính (4 Can + 4 Chi), Chi chấm theo Bản Khí.
 *  - Vật lý khoảng cách: Can-Can, Can-Chi, Chi-Chi (khắc toàn lưới).
 *  - Vùng Tâm dùng HỆ SỐ SUY HAO (decay), cộng điểm Đắc Địa (Lộc/Kình Dương).
 *  - Cường nhược so sánh Thân với HÀNH ĐỊCH MẠNH NHẤT (không cộng gộp Ta vs Địch).
 */

import { SolarDate } from '@nghiavuive/lunar_date_vi';
import {
	BRANCH_CLASHES,
	BRANCH_HALF_COMBINATIONS,
	BRANCH_SEASONAL_COMBINATIONS,
	BRANCH_SIX_COMBINATIONS,
	BRANCH_TRI_COMBINATIONS,
	DAO_HOA,
	DICH_MA,
	EARTHLY_BRANCHES,
	ELEMENT_RELATIONS,
	FIVE_ELEMENTS,
	HEAVENLY_STEMS,
	HIDDEN_STEMS,
	LIFE_CYCLE_SCORES,
	LIFE_CYCLE_TABLE,
	PHYSICS,
	STEM_COMBINATIONS,
	TEN_GODS_MAPPING,
	THIEN_AT_QUY_NHAN,
	VAN_XUONG,
	VULONG_BRANCH_TO_STEM,
	VULONG_PHYSICS,
} from './bazi.constants';
import type { BaziInput } from './bazi.model';
import type {
	AuditLogItem,
	AuditLogSection,
	BaziChart,
	BaziResult,
	CenterZoneAnalysis,
	EarthlyBranch,
	EnergyNode,
	FiveElement,
	HeavenlyStem,
	Interaction,
	LimitScoreProfile,
	Pillar,
	PillarPosition,
} from './bazi.types';

const POSITION_INDEX: Record<PillarPosition, number> = { Year: 0, Month: 1, Day: 2, Hour: 3 };
const POSITION_LABEL: Record<PillarPosition, string> = {
	Year: 'Năm',
	Month: 'Tháng',
	Day: 'Ngày',
	Hour: 'Giờ',
};
const PILLAR_BY_POSITION: Record<PillarPosition, (c: BaziChart) => Pillar> = {
	Year: (c) => c.year,
	Month: (c) => c.month,
	Day: (c) => c.day,
	Hour: (c) => c.hour,
};

// 12 TIẾT (Jie) - mốc chuyển tháng Can Chi, xác định theo Kinh độ hoàng đạo Mặt Trời.
// Dùng để tính CHÍNH XÁC thời điểm giao tiết (không phụ thuộc tiết khí theo NGÀY của thư viện).
const TIET_TERMS: Array<{
	name: string;
	longitude: number; // Kinh độ hoàng đạo (độ)
	approxMonth: number;
	approxDay: number;
	branchIndex: number;
}> = [
	{ name: 'Tiểu hàn', longitude: 285, approxMonth: 1, approxDay: 6, branchIndex: 1 },
	{ name: 'Lập xuân', longitude: 315, approxMonth: 2, approxDay: 4, branchIndex: 2 },
	{ name: 'Kinh trập', longitude: 345, approxMonth: 3, approxDay: 6, branchIndex: 3 },
	{ name: 'Thanh minh', longitude: 15, approxMonth: 4, approxDay: 5, branchIndex: 4 },
	{ name: 'Lập hạ', longitude: 45, approxMonth: 5, approxDay: 6, branchIndex: 5 },
	{ name: 'Mang chủng', longitude: 75, approxMonth: 6, approxDay: 6, branchIndex: 6 },
	{ name: 'Tiểu thử', longitude: 105, approxMonth: 7, approxDay: 7, branchIndex: 7 },
	{ name: 'Lập thu', longitude: 135, approxMonth: 8, approxDay: 8, branchIndex: 8 },
	{ name: 'Bạch lộ', longitude: 165, approxMonth: 9, approxDay: 8, branchIndex: 9 },
	{ name: 'Hàn lộ', longitude: 195, approxMonth: 10, approxDay: 8, branchIndex: 10 },
	{ name: 'Lập đông', longitude: 225, approxMonth: 11, approxDay: 7, branchIndex: 11 },
	{ name: 'Đại tuyết', longitude: 255, approxMonth: 12, approxDay: 7, branchIndex: 0 },
];

const LAP_XUAN_LONGITUDE = 315;

// Thứ tự ra đòn theo chu trình ngũ hành: Thủy khắc Hỏa -> Hỏa khắc Kim ->
// Kim khắc Mộc -> Mộc khắc Thổ -> Thổ khắc Thủy. Kẻ khắc trước khóa nạn nhân.
const ELEMENT_ATTACK_ORDER: Record<FiveElement, number> = {
	Thủy: 1,
	Hỏa: 2,
	Kim: 3,
	Mộc: 4,
	Thổ: 5,
};

export class BaziAuditLogger extends Array<string> {
	public sections: AuditLogSection[] = [];
	private currentSection: AuditLogSection | null = null;

	public startSection(
		step: number,
		title: string,
		badge?: string,
		summary?: string,
	): AuditLogSection {
		let sec = this.sections.find((s) => s.step === step);
		if (!sec) {
			sec = { step, title, name: title, badge, summary, description: summary, items: [] };
			this.sections.push(sec);
		} else {
			sec.title = title;
			sec.name = title;
			if (badge) sec.badge = badge;
			if (summary) {
				sec.summary = summary;
				sec.description = summary;
			}
		}
		this.currentSection = sec;
		this.push(`\n--- BƯỚC ${step}: ${title.toUpperCase()} ---`);
		return sec;
	}

	public addItem(item: AuditLogItem, logLine?: string) {
		if (!this.currentSection) {
			this.startSection(0, 'Tổng Quan', 'Khởi Đầu');
		}
		this.currentSection!.items.push(item);
		if (logLine) {
			this.push(logLine);
		} else {
			const prefix = item.pillar ? `[Trụ ${POSITION_LABEL[item.pillar]}] ` : '';
			const tag = item.tag ? `[${item.tag}] ` : '';
			const delta =
				item.scoreChange !== undefined
					? ` (${item.scoreChange > 0 ? '+' : ''}${item.scoreChange.toFixed(2)} đv)`
					: '';
			this.push(`   * ${prefix}${tag}${item.title}: ${item.content}${delta}`);
		}
	}
}

export class BaziService {
	// ====================================================================
	// 0. LẬP TRỤ (ASTRONOMY)
	// ====================================================================

	private calculatePillars(birthDate: Date): BaziChart {
		// Xử lý Dạ Tý (23h-0h): Tính sang Can Chi ngày hôm sau
		const dateForDayPillar = new Date(birthDate);
		if (birthDate.getHours() >= 23) {
			dateForDayPillar.setDate(dateForDayPillar.getDate() + 1);
		}

		const solarObjForDay = new SolarDate(dateForDayPillar);
		const lunarObjForDay = solarObjForDay.toLunarDate();
		lunarObjForDay.init();

		const dayPillar = this.createPillarFromLunarName(lunarObjForDay.getDayName(), 'Day');
		const hourPillar = this.getHourPillar(birthDate.getHours(), dayPillar.canIndex);
		const yearPillar = this.getYearPillar(birthDate);
		const monthPillar = this.getMonthPillar(birthDate, yearPillar.canIndex);

		return { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar };
	}

	public async calculateBazi(input: Omit<BaziInput, 'user_id' | 'id'>) {
		const rawBirthDate = new Date(
			input.birth_year,
			input.birth_month - 1,
			input.birth_day,
			input.birth_hour,
			input.birth_minute,
		);

		// Mặc định kinh độ Hà Nội (105.85) nếu không có input.longitude
		const birthDate = this.getRealSolarTime(rawBirthDate, input.longitude || 105.85);

		// 1. Lập Trụ (Sử dụng giờ thực)
		const chart = this.calculatePillars(birthDate);

		// 2. Phân tích Năng lượng
		const analysis = this.analyzeChart(chart);

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

			center_analysis: analysis.centerZone,
			energy_flow: analysis.energyFlow,
			limit_score: analysis.limitScore,
			interactions: analysis.interactions,

			favorable_elements: analysis.limitScore.dungThan,
			party_score: analysis.centerZone.partyScore,
			enemy_score: analysis.centerZone.enemyScore,
			shen_sha: analysis.shenSha,

			// Structured Log Sections (8 bước)
			score_details: analysis.auditSections,

			// Legacy
			percentage_self: 0,
			luck_start_age: 0,
			element_scores: analysis.centerZone.elementScores,
			god_scores: {},
		};
	}

	/**
	 * CORE PIPELINE: Quy trình phân tích định lượng Vũ Long (7 bước).
	 */
	private analyzeChart(chart: BaziChart): BaziResult {
		const auditLogs = new BaziAuditLogger();
		auditLogs.push('--- BẮT ĐẦU PHÂN TÍCH (VULONG METHOD v4) ---');

		// BƯỚC 1: Khởi tạo 8 chữ chính (4 Can + 4 Chi), điểm gốc theo Lệnh tháng.
		auditLogs.startSection(
			1,
			'Khởi Tạo 8 Chữ & Điểm Lệnh Tháng',
			'Khởi Tạo',
			'Xác định 8 chữ chính và trạng thái 12 cung Trường Sinh tại Lệnh Tháng',
		);
		const nodes = this.initializeEnergyGraph(chart, auditLogs);

		// BƯỚC 2: Tương tác hóa hợp PHẢI chạy TRƯỚC để xác định hành thực tế sau hóa.
		auditLogs.startSection(
			2,
			'Tương Tác Hóa Hợp, Trói & Xung',
			'Hóa Hợp',
			'Xét Tam Hội, Tam Hợp, Bán Hợp, Lục Hợp, Lục Xung và Can Hợp',
		);
		const interactionResult = this.processInteractions(nodes, chart, auditLogs);

		// BƯỚC 3: Vật lý khoảng cách (khắc toàn lưới dựa trên hành thực tế sau hóa).
		auditLogs.startSection(
			3,
			'Vật Lý Khoảng Cách - Khắc Toàn Lưới',
			'Khắc Sát',
			'Sát thương ngũ hành theo khoảng cách và khóa hành động theo nguyên lý Vũ Long',
		);
		this.applyFullGridOvercoming(nodes, auditLogs);

		// BƯỚC 4: Dòng chảy nội bộ Can–Chi cùng trụ sinh cho nhau (Giả thiết 81-85).
		auditLogs.startSection(
			4,
			'Dòng Chảy Can Chi Nội Bộ',
			'Tương Sinh',
			'Can Chi cùng trụ tương sinh, chuyển giao năng lượng nội bộ',
		);
		const dmNodeForFlow = nodes.find((n) => n.source === 'Day' && n.type === 'Stem');
		const dmElementForFlow = dmNodeForFlow
			? dmNodeForFlow.transformTo || dmNodeForFlow.element
			: chart.day.stemElement;
		this.processInternalPillarFlow(nodes, dmElementForFlow, auditLogs);

		// BƯỚC 5: Tập trung điểm Vùng Tâm + Đắc Địa (Lộc/Kình Dương) + so sánh cường nhược.
		auditLogs.startSection(
			5,
			'Hội Tụ Vùng Tâm & Cường Nhược',
			'Vùng Tâm',
			'Hệ số suy hao khoảng cách, điểm Đắc Địa Lộc/Kình, và so sánh Thân vs Kẻ thù mạnh nhất',
		);
		const centerZone = this.calculateCenterZoneStrength(nodes, chart, auditLogs);

		// BƯỚC 6: Xác định cách cục (Nội Cách / Ngoại Cách - Tòng Cách).
		let structure = centerZone.isVwang ? 'Thân Vượng' : 'Thân Nhược';
		let structureType = 'Nội Cách';

		const totalChartScore = Object.values(centerZone.elementScores).reduce((a, b) => a + b, 0);
		const selfRatio = totalChartScore > 0 ? centerZone.partyScore / totalChartScore : 0;
		const hasRoot = centerZone.locScore > 0;
		// Tòng Cách (TTT Chương 12 & PDF 3 Trang 3): Thân cực nhược, không có Lộc/Kình Dương
		// và bị phe địch áp đảo -> theo hành vượng nhất của địch.
		if (!centerZone.isVwang && !hasRoot && selfRatio < 0.12) {
			structureType = 'Ngoại Cách (Tòng Cách)';
			const taiEl = this.getGodElement(centerZone.selfElement, 'ChinhTai');
			const quanEl = this.getGodElement(centerZone.selfElement, 'ChinhQuan');
			if (centerZone.maxEnemyElement === taiEl) structure = 'Cách Tòng Tài';
			else if (centerZone.maxEnemyElement === quanEl) structure = 'Cách Tòng Sát';
			else structure = 'Cách Tòng Nhi';
		}

		auditLogs.startSection(
			6,
			'Xác Định Cách Cục',
			'Cách Cục',
			'Phân loại Nội Cách hoặc Ngoại Cách (Tòng Cách) dựa trên thế lực toàn cục',
		);
		auditLogs.addItem({
			type: 'structure',
			level: 'accent',
			title: structure,
			content: `${structureType} - ${structure}. ${
				structureType.includes('Tòng')
					? 'Thân cực nhược, không có Lộc/Kình Dương, tòng theo thế vượng của kẻ địch áp đảo.'
					: 'Dựa trên cán cân cường nhược Vùng Tâm.'
			}`,
			tag: structureType,
		});

		// BƯỚC 7: Chọn Dụng Thần theo 5 Mẫu của Vũ Long.
		auditLogs.startSection(
			7,
			'Định Dụng Thần 5 Mẫu Vũ Long',
			'Dụng Thần',
			'Lựa chọn Dụng Thần, Hỷ Thần, Kỵ Thần, Hung Thần và bảng ma trận điểm hạn',
		);
		const limitScore = this.determineDungThanPatterns(chart, centerZone, auditLogs);

		// BƯỚC 8: Thần Sát.
		auditLogs.startSection(
			8,
			'Thần Sát Cát Hung',
			'Thần Sát',
			'Tra cứu Thiên Ất Quý Nhân, Văn Xương, Dịch Mã, Đào Hoa',
		);
		const shenSha = this.calculateShenSha(chart, auditLogs);

		return {
			pillars: chart,
			energyFlow: interactionResult.nodes,
			interactions: interactionResult.interactions,
			centerZone,
			structure,
			structureType,
			limitScore,
			shenSha,
			auditLogs: [...auditLogs],
			auditSections: auditLogs.sections,
		};
	}

	// ====================================================================
	// 1. KHỞI TẠO ĐỒ THỊ 8 CHỮ CHÍNH (BƯỚC 4)
	// ====================================================================

	private initializeEnergyGraph(chart: BaziChart, logs: string[]): EnergyNode[] {
		const nodes: EnergyNode[] = [];
		const monthBranch = chart.month.branch;
		const pillars: Pillar[] = [chart.year, chart.month, chart.day, chart.hour];

		logs.push(`\n--- KHỞI TẠO 8 CHỮ CHÍNH (LỆNH THÁNG ${monthBranch}) ---`);

		pillars.forEach((pillar) => {
			// 1. Thiên Can: điểm = trạng thái Sinh Vượng Tử Tuyệt tại lệnh tháng.
			const stemStage = LIFE_CYCLE_TABLE[pillar.stem][monthBranch];
			const stemScore = LIFE_CYCLE_SCORES[stemStage];
			nodes.push({
				id: `${pillar.position}_Stem`,
				source: pillar.position,
				type: 'Stem',
				name: pillar.stem,
				element: this.getStemElement(pillar.stem),
				lifeCycleStage: stemStage,
				baseScore: stemScore,
				currentScore: stemScore,
				isBlocked: false,
				isActionLocked: false,
				isCombined: false,
				modifications: [
					{
						reason: `Trạng thái ${stemStage} tại lệnh ${monthBranch}`,
						valueChange: 0,
						factor: 1,
					},
				],
			});

			// 2. Địa Chi: chấm theo Can quy chuẩn cố định của Vũ Long (PDF 4, Trang 20 & 22).
			const scoringStem = VULONG_BRANCH_TO_STEM[pillar.branch];
			const branchStage = LIFE_CYCLE_TABLE[scoringStem][monthBranch];
			const branchScore = LIFE_CYCLE_SCORES[branchStage];
			const sourceName = `Bản khí ${scoringStem}`;
			nodes.push({
				id: `${pillar.position}_Branch`,
				source: pillar.position,
				type: 'Branch',
				name: pillar.branch,
				element: this.getBranchMainElement(pillar.branch),
				branchOwner: pillar.branch,
				mainStem: scoringStem,
				lifeCycleStage: branchStage,
				baseScore: branchScore,
				currentScore: branchScore,
				isBlocked: false,
				isActionLocked: false,
				isCombined: false,
				modifications: [
					{
						reason: `${sourceName} trạng thái ${branchStage} tại lệnh ${monthBranch}`,
						valueChange: 0,
						factor: 1,
					},
				],
			});

			logs.push(
				`   * Trụ ${POSITION_LABEL[pillar.position]}: Can ${pillar.stem} (${stemStage} = ${stemScore.toFixed(2)}) | Chi ${pillar.branch} - ${sourceName} (${branchStage} = ${branchScore.toFixed(2)})`,
			);
			if ((logs as BaziAuditLogger).addItem) {
				(logs as BaziAuditLogger).addItem({
					type: 'init',
					level: 'info',
					title: `Can ${pillar.stem}`,
					content: `Hành ${this.getStemElement(pillar.stem)}, trạng thái ${stemStage} tại lệnh ${monthBranch}`,
					tag: 'Thiên Can',
					scoreChange: stemScore,
					pillar: pillar.position,
				});
				(logs as BaziAuditLogger).addItem({
					type: 'init',
					level: 'info',
					title: `Chi ${pillar.branch} (${sourceName})`,
					content: `Hành ${this.getBranchMainElement(pillar.branch)}, trạng thái ${branchStage} tại lệnh ${monthBranch}`,
					tag: 'Địa Chi',
					scoreChange: branchScore,
					pillar: pillar.position,
				});
			}
		});

		return nodes;
	}

	// ====================================================================
	// 2. VẬT LÝ KHOẢNG CÁCH - KHẮC TOÀN LƯỚI (BƯỚC 5)
	// ====================================================================

	private applyFullGridOvercoming(nodes: EnergyNode[], logs: string[]) {
		logs.push(`\n--- VẬT LÝ KHOẢNG CÁCH (KHẮC TOÀN LƯỚI VŨ LONG) ---`);

		const executeStrike = (
			source: EnergyNode,
			target: EnergyNode,
			rate: number,
			lockTarget: boolean,
			desc: string,
		) => {
			const damage = target.currentScore * rate;
			target.currentScore = Math.max(0, target.currentScore - damage);
			target.modifications.push({
				reason: `${source.name} khắc (${desc})`,
				valueChange: -damage,
				factor: rate,
			});
			if (lockTarget) target.isActionLocked = true;
			logs.push(
				`   > ${source.name} (${POSITION_LABEL[source.source]}) khắc ${target.name} (${POSITION_LABEL[target.source]}) [${desc}]: -${damage.toFixed(2)} đv${lockTarget ? ' [KHÓA HÀNH ĐỘNG]' : ''}`,
			);
			if ((logs as BaziAuditLogger).addItem) {
				(logs as BaziAuditLogger).addItem({
					type: 'overcome',
					level: lockTarget ? 'error' : 'warning',
					title: `${source.name} khắc ${target.name}`,
					content: `[${desc}] Sát thương -${damage.toFixed(2)} đv (${(rate * 100).toFixed(0)}%)${lockTarget ? ' - BỊ KHÓA HÀNH ĐỘNG' : ''}`,
					tag: lockTarget ? 'Khóa Hành Động' : 'Sát Thương',
					scoreChange: -damage,
					factor: rate,
					pillar: target.source,
				});
			}
		};

		// VÒNG 1: Khắc TRỰC TIẾP cùng trụ
		// Giả thiết 5d: Can Chi cùng trụ VẪN KHẮC NHAU kể cả khi một bên ở trong tổ hợp hợp hóa
		nodes.forEach((src) => {
			if (src.isBlocked || src.isActionLocked) return;
			const tgt = nodes.find((t) => t.source === src.source && t.type !== src.type && !t.isBlocked);
			if (!tgt) return;

			const srcEl = src.transformTo || src.element;
			const tgtEl = tgt.transformTo || tgt.element;
			if (this.getRelation(srcEl, tgtEl) !== 'Khac') return;

			// Giả thiết 72c: Nếu bên tấn công ở trong tổ hợp hợp hóa thì bên bị khắc KHÔNG bị khóa hành động
			const lockTarget = !src.isCombined;
			executeStrike(src, tgt, VULONG_PHYSICS.DAMAGE.DIRECT, lockTarget, 'Khắc trực tiếp cùng trụ');
		});

		// VÒNG 2: Khắc GẦN kề cận (gap === 0).
		// Thu thập trước, sắp theo chu trình ngũ hành, rồi mới thực thi (tránh race condition).
		const nearStrikes: Array<{ src: EnergyNode; tgt: EnergyNode }> = [];
		for (let i = 0; i < nodes.length; i++) {
			for (let j = 0; j < nodes.length; j++) {
				if (i === j) continue;
				const src = nodes[i];
				const tgt = nodes[j];
				if (!src || !tgt || src.isBlocked || tgt.isBlocked) continue;
				if (src.source === tgt.source) continue; // Đã xử lý ở Vòng 1
				// "Tham hợp vong khắc": chi đã nhập Hợp Hóa chỉ tác dụng NỘI BỘ TRỤ,
				// không khắc/vượt trụ (bắt buộc để giữ đúng Ví dụ 1: Tuất & Nhâm không khắc chéo).
				if (src.isCombined || tgt.isCombined) continue;

				const srcEl = src.transformTo || src.element;
				const tgtEl = tgt.transformTo || tgt.element;
				if (this.getRelation(srcEl, tgtEl) !== 'Khac') continue;

				const p1 = POSITION_INDEX[src.source];
				const p2 = POSITION_INDEX[tgt.source];
				const isSameRow = src.type === tgt.type;
				const gap = isSameRow ? Math.abs(p1 - p2) - 1 : Math.abs(p1 - p2);

				if (gap === 0) nearStrikes.push({ src, tgt });
			}
		}
		nearStrikes
			.sort(
				(a, b) =>
					ELEMENT_ATTACK_ORDER[a.src.transformTo || a.src.element] -
					ELEMENT_ATTACK_ORDER[b.src.transformTo || b.src.element],
			)
			.forEach(({ src, tgt }) => {
				if (src.isBlocked || src.isActionLocked || tgt.isBlocked) return;
				executeStrike(src, tgt, VULONG_PHYSICS.DAMAGE.NEAR, true, 'Khắc gần kề cận');
			});

		// VÒNG 3: Khắc XA (gap >= 1) - cũng sắp theo chu trình ngũ hành.
		const farStrikes: Array<{
			src: EnergyNode;
			tgt: EnergyNode;
			rate: number;
			desc: string;
		}> = [];
		for (let i = 0; i < nodes.length; i++) {
			for (let j = 0; j < nodes.length; j++) {
				if (i === j) continue;
				const src = nodes[i];
				const tgt = nodes[j];
				if (!src || !tgt || src.isBlocked || tgt.isBlocked) continue;
				if (src.source === tgt.source) continue;
				if (src.isCombined || tgt.isCombined) continue;

				const srcEl = src.transformTo || src.element;
				const tgtEl = tgt.transformTo || tgt.element;
				if (this.getRelation(srcEl, tgtEl) !== 'Khac') continue;

				const p1 = POSITION_INDEX[src.source];
				const p2 = POSITION_INDEX[tgt.source];
				const isSameRow = src.type === tgt.type;
				const gap = isSameRow ? Math.abs(p1 - p2) - 1 : Math.abs(p1 - p2);

				let rate = 0;
				let desc = '';
				if (gap === 1) {
					rate = VULONG_PHYSICS.DAMAGE.GAP_1; // 1/5
					desc = 'Khắc cách 1 ngôi';
				} else if (gap === 2) {
					rate = VULONG_PHYSICS.DAMAGE.GAP_2; // 1/10
					desc = 'Khắc cách 2 ngôi';
				} else if (gap >= 3) {
					rate = VULONG_PHYSICS.DAMAGE.GAP_3; // 1/20
					desc = 'Khắc cách 3 ngôi';
				}

				if (rate > 0) farStrikes.push({ src, tgt, rate, desc });
			}
		}
		farStrikes
			.sort(
				(a, b) =>
					ELEMENT_ATTACK_ORDER[a.src.transformTo || a.src.element] -
					ELEMENT_ATTACK_ORDER[b.src.transformTo || b.src.element],
			)
			.forEach(({ src, tgt, rate, desc }) => {
				if (src.isBlocked || src.isActionLocked || tgt.isBlocked) return;
				executeStrike(src, tgt, rate, false, desc);
			});

		// Khóa các thần có điểm < THRESHOLD_BLOCK (0.5 đv)
		nodes.forEach((node) => {
			if (!node.isBlocked && node.currentScore < VULONG_PHYSICS.THRESHOLD_BLOCK) {
				node.currentScore = 0;
				node.isBlocked = true;
				node.modifications.push({ reason: 'Blocked (Khí tuyệt)', valueChange: 0, factor: 0 });
			}
		});
	}

	// ====================================================================
	// 2b. DÒNG CHẢY NỘI BỘ CAN–CHI CÙNG TRỤ (GIẢ THIẾT 81–85)
	// ====================================================================

	/**
	 * Can và Chi cùng trụ sinh cho nhau (Đắc Địa / Tiết Khí).
	 * Giả thiết 85: chỉ sinh được khi can/chi CHỦ SINH có láng giềng kề cận trợ lực:
	 *   - Láng giềng SINH cho nó  -> truyền 1/2 đv.
	 *   - Láng giềng CÙNG HÀNH    -> truyền 1/3 đv.
	 * Giả thiết 82/45: bên CHỦ SINH KHÔNG mất điểm - chỉ mất 1/10 nếu nó là Thực Thương.
	 * Điều kiện tiên quyết: Can/Chi không bị khóa và không tham gia Hợp Hóa.
	 */
	private processInternalPillarFlow(nodes: EnergyNode[], dmElement: FiveElement, logs: string[]) {
		const getTransferRate = (chuEl: FiveElement, pIdx: number): number => {
			const neighbors = nodes.filter(
				(n) => !n.isBlocked && Math.abs(POSITION_INDEX[n.source] - pIdx) === 1,
			);
			// Láng giềng mang hành SINH cho chủ sinh -> 1/2.
			const hasMotherNeighbor = neighbors.some(
				(n) => this.getRelation(n.transformTo || n.element, chuEl) === 'Sinh',
			);
			if (hasMotherNeighbor) return 1 / 2;
			// Láng giềng CÙNG HÀNH với chủ sinh -> 1/3.
			const hasSameNeighbor = neighbors.some((n) => (n.transformTo || n.element) === chuEl);
			if (hasSameNeighbor) return 1 / 3;
			// Trụ cô lập -> KHÔNG được phép sinh cùng trụ.
			return 0;
		};

		// Thực Thương của Nhật Chủ = hành mà Nhật Chủ SINH RA (getRelation(dm, el) === 'Sinh').
		const isThucThuong = (el: FiveElement) => this.getRelation(dmElement, el) === 'Sinh';

		(['Year', 'Month', 'Day', 'Hour'] as PillarPosition[]).forEach((pos) => {
			const stem = nodes.find((n) => n.source === pos && n.type === 'Stem' && !n.isBlocked);
			const branch = nodes.find((n) => n.source === pos && n.type === 'Branch' && !n.isBlocked);
			if (!stem || !branch) return;
			if (stem.isActionLocked || branch.isActionLocked || stem.isCombined || branch.isCombined) {
				return;
			}

			const sEl = stem.transformTo || stem.element;
			const bEl = branch.transformTo || branch.element;
			const rel = this.getRelation(bEl, sEl);
			const pIdx = POSITION_INDEX[pos];

			if (rel === 'Sinh') {
				// Chi sinh Can cùng trụ (chủ sinh = Chi).
				const rate = getTransferRate(bEl, pIdx);
				if (rate <= 0) return;
				const transfer = branch.currentScore * rate;
				// Bên chủ sinh chỉ bị hao 1/10 nếu nó là Thực Thương.
				if (isThucThuong(bEl)) branch.currentScore -= branch.currentScore * 0.1;
				stem.currentScore += transfer;
				stem.modifications.push({
					reason: `Được chi ${POSITION_LABEL[pos]} sinh cùng trụ (${rate === 0.5 ? '1/2' : '1/3'})`,
					valueChange: transfer,
					factor: rate,
				});
				logs.push(
					`   + Trụ ${POSITION_LABEL[pos]}: Chi sinh Can (+${transfer.toFixed(2)} đv cho Can)`,
				);
				if ((logs as BaziAuditLogger).addItem) {
					(logs as BaziAuditLogger).addItem({
						type: 'flow',
						level: 'success',
						title: `Trụ ${POSITION_LABEL[pos]}: Chi sinh Can`,
						content: `Chi ${branch.name} sinh cho Can ${stem.name} (+${transfer.toFixed(2)} đv cho Can)`,
						tag: 'Chi Sinh Can',
						scoreChange: transfer,
						pillar: pos,
					});
				}
			} else if (rel === 'DuocSinh') {
				// Can sinh Chi cùng trụ (chủ sinh = Can).
				const rate = getTransferRate(sEl, pIdx);
				if (rate <= 0) return;
				const transfer = stem.currentScore * rate;
				if (isThucThuong(sEl)) stem.currentScore -= stem.currentScore * 0.1;
				branch.currentScore += transfer;
				branch.modifications.push({
					reason: `Được can ${POSITION_LABEL[pos]} sinh cùng trụ (${rate === 0.5 ? '1/2' : '1/3'})`,
					valueChange: transfer,
					factor: rate,
				});
				logs.push(
					`   + Trụ ${POSITION_LABEL[pos]}: Can sinh Chi (+${transfer.toFixed(2)} đv cho Chi)`,
				);
				if ((logs as BaziAuditLogger).addItem) {
					(logs as BaziAuditLogger).addItem({
						type: 'flow',
						level: 'success',
						title: `Trụ ${POSITION_LABEL[pos]}: Can sinh Chi`,
						content: `Can ${stem.name} sinh cho Chi ${branch.name} (+${transfer.toFixed(2)} đv cho Chi)`,
						tag: 'Can Sinh Chi',
						scoreChange: transfer,
						pillar: pos,
					});
				}
			}
		});
	}

	// ====================================================================
	// 3. TƯƠNG TÁC HÓA HỢP (INTERACTIONS)
	// ====================================================================

	private processInteractions(nodes: EnergyNode[], chart: BaziChart, logs: string[]) {
		const interactions: Interaction[] = [];
		logs.push(`\n--- TƯƠNG TÁC HÓA HỢP ---`);

		// 1. Tam Hội (lực mạnh nhất) -> 2. Tam Hợp -> 3. Bán Hợp
		this.processBranchGroup(nodes, 'TamHoi', logs, interactions);
		this.processBranchGroup(nodes, 'TamHop', logs, interactions);
		this.processHalfCombinations(nodes, logs, interactions);
		// 4. Lục Hợp -> 5. Lục Xung
		this.processAdjacency(nodes, 'LucHop', logs, interactions);
		this.processAdjacency(nodes, 'LucXung', logs, interactions);
		// 6. Ngũ Hợp Can
		this.processStemCombinations(nodes, chart, logs, interactions);

		if (interactions.length === 0 && (logs as BaziAuditLogger).addItem) {
			(logs as BaziAuditLogger).addItem({
				type: 'interaction',
				level: 'neutral',
				title: 'Không có biến động Hợp - Xung lớn',
				content: 'Tứ trụ bình hòa, không xuất hiện Tam Hội, Tam Hợp, Lục Hợp hay Lục Xung kề cận phá cách',
				tag: 'Bình Hòa',
			});
		}

		return { nodes, interactions };
	}

	private processBranchGroup(
		nodes: EnergyNode[],
		type: 'TamHoi' | 'TamHop',
		logs: string[],
		interactions: Interaction[],
	) {
		const dictionary = type === 'TamHoi' ? BRANCH_SEASONAL_COMBINATIONS : BRANCH_TRI_COMBINATIONS;
		const branchNodes = nodes.filter((n) => n.type === 'Branch' && !n.isBlocked);
		const checkedGroups = new Set<string>();

		Object.values(dictionary).forEach((config) => {
			const groupKey = [...config.group].sort().join('-');
			if (checkedGroups.has(groupKey)) return;
			checkedGroups.add(groupKey);

			const matched = config.group
				.map((b) => branchNodes.find((n) => n.branchOwner === b && !n.isCombined))
				.filter((n): n is EnergyNode => Boolean(n));
			if (matched.length !== 3) return;

			const resultEl = config.result;
			// Dẫn thần: Lệnh tháng cùng hành hóa cục, hoặc có Can thấu lộ cùng hành.
			const isMonthSupport = this.getEffectiveBranchElement(nodes, 'Month') === resultEl;
			const hasStemLead = nodes.some(
				(n) =>
					n.type === 'Stem' &&
					!n.isBlocked &&
					(n.transformTo || n.element) === resultEl &&
					n.currentScore > 0,
			);
			const allowTransform = isMonthSupport || hasStemLead;

			if (!allowTransform) {
				logs.push(`>> ${type}: ${config.group.join('-')} tụ khí nhưng KHÔNG HÓA (thiếu dẫn thần).`);
				return;
			}

			// Hóa cục CHỈ đổi hành (transformTo); GIỮ NGUYÊN điểm cơ sở (PDF 4 Trang 13).
			let total = 0;
			matched.forEach((n) => {
				n.transformTo = resultEl;
				n.isCombined = true;
				n.modifications.push({
					reason: `Tham gia ${type} hóa ${resultEl}`,
					valueChange: 0,
					factor: 1.0,
				});
				total += n.currentScore;
			});

			logs.push(
				`>> ${type}: ${config.group.join('-')} HÓA ${resultEl} thành công (giữ nguyên điểm cơ sở, tổng ${total.toFixed(2)}).`,
			);
			if ((logs as BaziAuditLogger).addItem) {
				(logs as BaziAuditLogger).addItem({
					type: 'interaction',
					level: 'accent',
					title: `${type === 'TamHoi' ? 'Tam Hội' : 'Tam Hợp'}: ${config.group.join(' - ')} Hóa ${resultEl}`,
					content: `Hóa cục thành công, hành chuyển sang ${resultEl}, bảo toàn tổng điểm cơ sở (${total.toFixed(2)} đv)`,
					tag: type === 'TamHoi' ? 'Tam Hội' : 'Tam Hợp',
					scoreChange: 0,
				});
			}
			interactions.push({
				type,
				participants: config.group,
				result: resultEl,
				score: total,
			});
		});
	}

	/**
	 * BÁN HỢP: 2 chi trong bộ Tam Hợp hóa cục nếu có Dẫn Thần thấu lộ.
	 * Giữ nguyên vị trí từng chi (không gom node) để bảo toàn hệ số suy hao Vùng Tâm.
	 */
	private processHalfCombinations(
		nodes: EnergyNode[],
		logs: string[],
		interactions: Interaction[],
	) {
		// PDF 4 Trang 20 Mục 3: Bán Hợp CHỈ xảy ra khi 2 chi KỀ CẬN nhau
		// (Tam Hợp / Tam Hội mới không cần gần nhau).
		const pairs: Array<[PillarPosition, PillarPosition]> = [
			['Year', 'Month'],
			['Month', 'Day'],
			['Day', 'Hour'],
		];

		pairs.forEach(([p1, p2]) => {
			const n1 = nodes.find(
				(n) => n.source === p1 && n.type === 'Branch' && !n.isBlocked && !n.isCombined,
			);
			const n2 = nodes.find(
				(n) => n.source === p2 && n.type === 'Branch' && !n.isBlocked && !n.isCombined,
			);
			if (!n1 || !n2 || !n1.branchOwner || !n2.branchOwner) return;

			const halfCombo = BRANCH_HALF_COMBINATIONS.find(
				(c) =>
					(c.pair[0] === n1.branchOwner && c.pair[1] === n2.branchOwner) ||
					(c.pair[1] === n1.branchOwner && c.pair[0] === n2.branchOwner),
			);
			if (!halfCombo) return;

			const resultEl = halfCombo.result;
			const isMonthSupport = this.getEffectiveBranchElement(nodes, 'Month') === resultEl;
			const hasStemLead = nodes.some(
				(n) =>
					n.type === 'Stem' &&
					!n.isBlocked &&
					(n.transformTo || n.element) === resultEl &&
					n.currentScore > 0,
			);
			if (!isMonthSupport && !hasStemLead) return;

			// Đổi hành cả 2 chi sang hành Hóa Cục, KHÔNG gom điểm (bảo toàn hệ số vị trí).
			n1.transformTo = resultEl;
			n1.isCombined = true;
			n1.modifications.push({ reason: `Bán Hợp hóa ${resultEl}`, valueChange: 0, factor: 0 });
			n2.transformTo = resultEl;
			n2.isCombined = true;
			n2.modifications.push({ reason: `Bán Hợp hóa ${resultEl}`, valueChange: 0, factor: 0 });

			logs.push(
				`>> Bán Hợp gần (${POSITION_LABEL[p1]}-${POSITION_LABEL[p2]}): ${n1.branchOwner}-${n2.branchOwner} HÓA ${resultEl} (Dẫn thần thấu lộ).`,
			);
			if ((logs as BaziAuditLogger).addItem) {
				(logs as BaziAuditLogger).addItem({
					type: 'interaction',
					level: 'accent',
					title: `Bán Hợp: ${n1.branchOwner} - ${n2.branchOwner} Hóa ${resultEl}`,
					content: `Bán Hợp kề cận giữa trụ ${POSITION_LABEL[p1]} và trụ ${POSITION_LABEL[p2]} hóa ${resultEl} thành công do có Dẫn Thần thấu lộ`,
					tag: 'Bán Hợp',
					scoreChange: 0,
					pillar: p1,
				});
			}
			interactions.push({
				type: 'TamHop',
				participants: [n1.branchOwner, n2.branchOwner],
				result: resultEl,
			});
		});
	}

	private processAdjacency(
		nodes: EnergyNode[],
		type: 'LucHop' | 'LucXung',
		logs: string[],
		interactions: Interaction[],
	) {
		const pairs: Array<[PillarPosition, PillarPosition]> = [
			['Year', 'Month'],
			['Month', 'Day'],
			['Day', 'Hour'],
		];

		pairs.forEach(([p1, p2]) => {
			const n1 = nodes.find((n) => n.source === p1 && n.type === 'Branch' && !n.isBlocked);
			const n2 = nodes.find((n) => n.source === p2 && n.type === 'Branch' && !n.isBlocked);
			if (!n1 || !n2 || !n1.branchOwner || !n2.branchOwner) return;

			if (type === 'LucXung' && BRANCH_CLASHES[n1.branchOwner] === n2.branchOwner) {
				// TTT Trang 24, 26: "Thổ xung tắc vượng" - Thìn-Tuất / Sửu-Mùi xung nhau
				// không làm suy suyển Bản khí Thổ (chỉ tổn thương tạp khí tàng trữ).
				const isEarthClash =
					(n1.transformTo || n1.element) === 'Thổ' && (n2.transformTo || n2.element) === 'Thổ';
				if (isEarthClash) {
					logs.push(
						`>> Lục Xung: ${n1.branchOwner} xung ${n2.branchOwner} (Thổ xung Thổ - Bản khí Thổ không suy suyển).`,
					);
					interactions.push({
						type: 'LucXung',
						participants: [n1.branchOwner, n2.branchOwner],
						result: 'EarthClash',
					});
					return;
				}

				const s1 = n1.currentScore;
				const s2 = n2.currentScore;

				if (s1 > s2 * 1.5) {
					this.applyNodeModification(
						n1,
						-s1 * PHYSICS.LOSS_CLASH_WIN,
						'Thắng xung',
						PHYSICS.LOSS_CLASH_WIN,
					);
					this.applyNodeModification(
						n2,
						-s2 * PHYSICS.LOSS_CLASH_LOSE,
						'Thua xung',
						PHYSICS.LOSS_CLASH_LOSE,
					);
					logs.push(`>> Lục Xung: ${n1.branchOwner} (Thắng) >> ${n2.branchOwner} (Thua)`);
				} else if (s2 > s1 * 1.5) {
					this.applyNodeModification(
						n1,
						-s1 * PHYSICS.LOSS_CLASH_LOSE,
						'Thua xung',
						PHYSICS.LOSS_CLASH_LOSE,
					);
					this.applyNodeModification(
						n2,
						-s2 * PHYSICS.LOSS_CLASH_WIN,
						'Thắng xung',
						PHYSICS.LOSS_CLASH_WIN,
					);
					logs.push(`>> Lục Xung: ${n1.branchOwner} (Thua) << ${n2.branchOwner} (Thắng)`);
				} else {
					this.applyNodeModification(
						n1,
						-s1 * PHYSICS.LOSS_CLASH_DRAW,
						'Xung hòa',
						PHYSICS.LOSS_CLASH_DRAW,
					);
					this.applyNodeModification(
						n2,
						-s2 * PHYSICS.LOSS_CLASH_DRAW,
						'Xung hòa',
						PHYSICS.LOSS_CLASH_DRAW,
					);
					logs.push(`>> Lục Xung: ${n1.branchOwner} == ${n2.branchOwner} (Lưỡng bại)`);
				}

				if ((logs as BaziAuditLogger).addItem) {
					(logs as BaziAuditLogger).addItem({
						type: 'interaction',
						level: 'warning',
						title: `Lục Xung: ${n1.branchOwner} xung ${n2.branchOwner}`,
						content: `Xung đối trực diện kề cận giữa trụ ${POSITION_LABEL[p1]} và trụ ${POSITION_LABEL[p2]}, làm suy giảm khí lực cả 2 bên`,
						tag: 'Lục Xung',
						pillar: p1,
					});
				}

				interactions.push({
					type: 'LucXung',
					participants: [n1.branchOwner, n2.branchOwner],
					result: 'Clash',
				});
				return;
			}

			if (type === 'LucHop') {
				const combo = BRANCH_SIX_COMBINATIONS[n1.branchOwner];
				if (!combo || combo.target !== n2.branchOwner) return;

				const resEl = combo.result;
				const isMonthSupport = this.getEffectiveBranchElement(nodes, 'Month') === resEl;
				const hasLead = nodes.some(
					(n) => n.type === 'Stem' && !n.isBlocked && (n.transformTo || n.element) === resEl,
				);

				if (hasLead || isMonthSupport) {
					// Giữ nguyên vị trí từng chi; chỉ đổi hành + bonus tại chỗ.
					[n1, n2].forEach((n) => {
						const before = n.currentScore;
						const after = before * VULONG_PHYSICS.FACTOR_TRANSFORM_BONUS;
						n.transformTo = resEl;
						n.isCombined = true;
						n.currentScore = after;
						n.modifications.push({
							reason: `Lục Hợp hóa ${resEl}`,
							valueChange: after - before,
							factor: VULONG_PHYSICS.FACTOR_TRANSFORM_BONUS,
						});
					});

					logs.push(`>> Lục Hợp: ${n1.branchOwner}-${n2.branchOwner} HÓA ${resEl}.`);
					if ((logs as BaziAuditLogger).addItem) {
						(logs as BaziAuditLogger).addItem({
							type: 'interaction',
							level: 'accent',
							title: `Lục Hợp: ${n1.branchOwner} hợp ${n2.branchOwner} Hóa ${resEl}`,
							content: `Hóa cục thành công tại trụ ${POSITION_LABEL[p1]} và trụ ${POSITION_LABEL[p2]} (hành chuyển sang ${resEl})`,
							tag: 'Lục Hợp Hóa',
							pillar: p1,
						});
					}
					interactions.push({
						type: 'LucHop',
						participants: [n1.branchOwner, n2.branchOwner],
						result: resEl,
					});
				} else {
					this.applyNodeModification(
						n1,
						-n1.currentScore * VULONG_PHYSICS.LOSS_COMBINE_BINDING,
						'Hợp trói',
						VULONG_PHYSICS.LOSS_COMBINE_BINDING,
					);
					this.applyNodeModification(
						n2,
						-n2.currentScore * VULONG_PHYSICS.LOSS_COMBINE_BINDING,
						'Hợp trói',
						VULONG_PHYSICS.LOSS_COMBINE_BINDING,
					);
					logs.push(`>> Lục Hợp: ${n1.branchOwner}-${n2.branchOwner} BỊ TRÓI (không hóa).`);
					if ((logs as BaziAuditLogger).addItem) {
						(logs as BaziAuditLogger).addItem({
							type: 'interaction',
							level: 'warning',
							title: `Lục Hợp: ${n1.branchOwner} hợp ${n2.branchOwner} Bị Trói`,
							content: `Thiếu dẫn thần thấu lộ, hai chi kề cận giữa trụ ${POSITION_LABEL[p1]} và trụ ${POSITION_LABEL[p2]} bị trói suy giảm khí lực`,
							tag: 'Hợp Trói',
							pillar: p1,
						});
					}
					interactions.push({
						type: 'LucHop',
						participants: [n1.branchOwner, n2.branchOwner],
						result: 'Bind',
					});
				}
			}
		});
	}

	private processStemCombinations(
		nodes: EnergyNode[],
		chart: BaziChart,
		logs: string[],
		interactions: Interaction[],
	) {
		const pairs: Array<[PillarPosition, PillarPosition]> = [
			['Year', 'Month'],
			['Month', 'Day'],
			['Day', 'Hour'],
		];

		pairs.forEach(([p1, p2]) => {
			const s1 = nodes.find((n) => n.source === p1 && n.type === 'Stem' && !n.isBlocked);
			const s2 = nodes.find((n) => n.source === p2 && n.type === 'Stem' && !n.isBlocked);
			if (!s1 || !s2) return;
			// Chống gắp đôi: một can đã tham gia Hợp thì không hợp tiếp với can khác.
			if (s1.isCombined || s2.isCombined) return;

			const combo = STEM_COMBINATIONS[s1.name as HeavenlyStem];
			if (!combo || combo.target !== s2.name) return;

			const resEl = combo.result;
			const realMonthEl = this.getEffectiveBranchElement(nodes, 'Month');

			// Tranh Hợp Thật (PDF 4 Trang 19, Mục b): nếu có >= 2 can cùng tên
			// cùng hợp với 1 can kia -> KHÔNG HÓA CỤC, cả hai bị Hợp Trói.
			const countS1 = nodes.filter(
				(n) => n.type === 'Stem' && !n.isBlocked && n.name === s1.name,
			).length;
			const countS2 = nodes.filter(
				(n) => n.type === 'Stem' && !n.isBlocked && n.name === s2.name,
			).length;
			if (countS1 >= 2 || countS2 >= 2) {
				logs.push(`>> Can Hợp: ${s1.name}-${s2.name} TRANH HỢP THẬT -> HỢP TRÓI (không hóa).`);
				this.applyNodeModification(
					s1,
					-s1.currentScore * VULONG_PHYSICS.LOSS_COMBINE_BINDING,
					'Hợp trói',
					VULONG_PHYSICS.LOSS_COMBINE_BINDING,
				);
				this.applyNodeModification(
					s2,
					-s2.currentScore * VULONG_PHYSICS.LOSS_COMBINE_BINDING,
					'Hợp trói',
					VULONG_PHYSICS.LOSS_COMBINE_BINDING,
				);
				s1.isCombined = true;
				s2.isCombined = true;
				interactions.push({ type: 'CanHop', participants: [s1.name, s2.name], result: 'Bind' });
				return;
			}

			// PDF 4 Trang 18, Mục 4a: nếu CAN NGÀY tham gia Hợp thì cục KHÔNG HÓA
			// khi trong tứ trụ xuất hiện hành Quan Sát của Hóa Cục (kể cả can tàng).
			const involvesDayMaster = s1.source === 'Day' || s2.source === 'Day';
			if (involvesDayMaster) {
				const killerElement = this.getCounterElement(resEl);
				const hasKiller =
					nodes.some((n) => !n.isBlocked && (n.transformTo || n.element) === killerElement) ||
					(Object.values(chart) as Pillar[]).some((p) =>
						HIDDEN_STEMS[p.branch].some((h) => this.getStemElement(h.stem) === killerElement),
					);
				if (hasKiller) {
					logs.push(
						`>> Can Ngày Hợp: ${s1.name}-${s2.name} BỊ PHÁ HÓA do có ${killerElement} (Quan Sát của Hóa Cục) -> HỢP TRÓI.`,
					);
					this.applyNodeModification(
						s1,
						-s1.currentScore * VULONG_PHYSICS.LOSS_COMBINE_BINDING,
						'Hợp trói',
						VULONG_PHYSICS.LOSS_COMBINE_BINDING,
					);
					this.applyNodeModification(
						s2,
						-s2.currentScore * VULONG_PHYSICS.LOSS_COMBINE_BINDING,
						'Hợp trói',
						VULONG_PHYSICS.LOSS_COMBINE_BINDING,
					);
					s1.isCombined = true;
					s2.isCombined = true;
					interactions.push({ type: 'CanHop', participants: [s1.name, s2.name], result: 'Bind' });
					return;
				}
			}

			if (realMonthEl === resEl) {
				s1.transformTo = resEl;
				s2.transformTo = resEl;

				const bonus1 = s1.currentScore * (VULONG_PHYSICS.FACTOR_TRANSFORM_BONUS - 1);
				const bonus2 = s2.currentScore * (VULONG_PHYSICS.FACTOR_TRANSFORM_BONUS - 1);
				this.applyNodeModification(
					s1,
					bonus1,
					'Hóa cục (Bonus)',
					VULONG_PHYSICS.FACTOR_TRANSFORM_BONUS,
				);
				this.applyNodeModification(
					s2,
					bonus2,
					'Hóa cục (Bonus)',
					VULONG_PHYSICS.FACTOR_TRANSFORM_BONUS,
				);
				s1.isCombined = true;
				s2.isCombined = true;

				logs.push(`>> Can Hợp: ${s1.name}-${s2.name} HÓA ${resEl} (đắc lệnh tháng).`);
				interactions.push({ type: 'CanHop', participants: [s1.name, s2.name], result: resEl });
			} else {
				this.applyNodeModification(
					s1,
					-s1.currentScore * VULONG_PHYSICS.LOSS_COMBINE_BINDING,
					'Hợp trói',
					VULONG_PHYSICS.LOSS_COMBINE_BINDING,
				);
				this.applyNodeModification(
					s2,
					-s2.currentScore * VULONG_PHYSICS.LOSS_COMBINE_BINDING,
					'Hợp trói',
					VULONG_PHYSICS.LOSS_COMBINE_BINDING,
				);
				s1.isCombined = true;
				s2.isCombined = true;
				logs.push(`>> Can Hợp: ${s1.name}-${s2.name} BỊ TRÓI (không hóa).`);
				interactions.push({ type: 'CanHop', participants: [s1.name, s2.name], result: 'Bind' });
			}
		});
	}

	// ====================================================================
	// 4. VÙNG TÂM & SO SÁNH CƯỜNG NHƯỢC (BƯỚC 6)
	// ====================================================================

	private calculateCenterZoneStrength(
		nodes: EnergyNode[],
		chart: BaziChart,
		logs: string[],
	): CenterZoneAnalysis {
		logs.push(`\n--- TẬP TRUNG ĐIỂM VÀO VÙNG TÂM (VŨ LONG) ---`);

		const dmStem = chart.day.stem;
		const dmNode = nodes.find((n) => n.source === 'Day' && n.type === 'Stem');
		if (!dmNode) throw new Error('Day Master missing');
		const dmElement = dmNode.transformTo || dmNode.element;

		const centerScores: Record<FiveElement, number> = {
			Kim: 0,
			Mộc: 0,
			Thủy: 0,
			Hỏa: 0,
			Thổ: 0,
		};

		// 1. Đưa các thần vào Vùng Tâm theo hệ số suy hao vị trí.
		nodes.forEach((node) => {
			if (node.isBlocked) return;
			const el = node.transformTo || node.element;
			const factor = this.getCenterDecayFactor(node);
			const finalScore = node.currentScore * factor;
			centerScores[el] += finalScore;

			if (finalScore > 0.01) {
				logs.push(
					`   * ${node.name} (${node.type === 'Stem' ? 'Can' : 'Chi'} ${POSITION_LABEL[node.source]}): ${node.currentScore.toFixed(2)} x ${factor.toFixed(3)} = ${finalScore.toFixed(2)} đv [${el}]`,
				);
				if ((logs as BaziAuditLogger).addItem) {
					(logs as BaziAuditLogger).addItem({
						type: 'decay',
						level: 'info',
						title: `${node.name} (${node.type === 'Stem' ? 'Can' : 'Chi'} ${POSITION_LABEL[node.source]})`,
						content: `Điểm gốc ${node.currentScore.toFixed(2)} x Hệ số ${factor.toFixed(3)} = ${finalScore.toFixed(2)} đv (Hành ${el})`,
						tag: factor === 1 ? 'Giữ 100%' : `Suy hao ${(factor * 100).toFixed(0)}%`,
						scoreChange: finalScore,
						factor,
						pillar: node.source,
					});
				}
			}
		});

		// 2. Cộng điểm Đắc Địa cho Nhật Chủ (Lộc / Kình Dương) tại chi Năm, Ngày, Giờ.
		let locTotal = 0;
		const khongVong = this.getKhongVongBranches(chart);
		(['Year', 'Day', 'Hour'] as PillarPosition[]).forEach((pos) => {
			const branch = PILLAR_BY_POSITION[pos](chart).branch;
			const stage = LIFE_CYCLE_TABLE[dmStem][branch];
			let extra = 0;
			let name = '';

			if (stage === 'LamQuan') {
				extra = VULONG_PHYSICS.LOC_SCORE;
				name = 'Lộc';
			} else if (stage === 'DeVuong') {
				extra = VULONG_PHYSICS.KINH_DUONG_SCORE;
				name = 'Kình Dương';
			}
			if (extra <= 0) return;

			// Không Vong (PDF 4, Trang 14 & 26): chi chứa Lộc/Kình Dương rơi vào
			// Tuần Không Vong thì điểm đắc địa bị vô hiệu hóa hoàn toàn.
			if (khongVong.has(branch)) {
				logs.push(
					`   ! Chi ${branch} chứa ${name} rơi vào Tuần Không Vong -> vô hiệu hóa điểm đắc địa.`,
				);
				if ((logs as BaziAuditLogger).addItem) {
					(logs as BaziAuditLogger).addItem({
						type: 'center',
						level: 'warning',
						title: `Tuần Không Vong: ${branch}`,
						content: `Chi ${branch} chứa ${name} rơi vào Tuần Không Vong -> Vô hiệu hóa điểm đắc địa.`,
						tag: 'Không Vong',
						pillar: pos,
					});
				}
				return;
			}

			// Giả thiết 72b: điểm Đắc Địa cũng bị giảm nếu chi chứa nó bị khắc
			// (khắc trực tiếp -> giảm 1/2; bị >= 2 lực khắc -> giảm 1/3).
			const branchNode = nodes.find((n) => n.source === pos && n.type === 'Branch');
			let damageFactor = 1.0;
			if (branchNode) {
				const khacMods = branchNode.modifications.filter(
					(m) => m.valueChange < 0 && m.reason.includes('khắc'),
				);
				const isDirectlyOvercome = khacMods.some((m) => m.reason.includes('Khắc trực tiếp'));
				if (isDirectlyOvercome) {
					damageFactor *= 1 - VULONG_PHYSICS.DAMAGE.DIRECT;
					logs.push(`   ! Điểm ${name} tại ${branch} bị khắc trực tiếp -> Giảm 50%`);
				} else if (khacMods.length >= 2) {
					damageFactor *= 1 - VULONG_PHYSICS.DAMAGE.NEAR;
					logs.push(`   ! Điểm ${name} tại ${branch} bị ${khacMods.length} lực khắc -> Giảm 33%`);
				}
			}

			// Chi Năm/Giờ nằm ngoài Vùng Tâm -> chịu suy hao.
			let factor = 1.0;
			if (pos === 'Year') factor = VULONG_PHYSICS.DECAY_INTO_CENTER.YearBranch;
			else if (pos === 'Hour') factor = VULONG_PHYSICS.DECAY_INTO_CENTER.HourBranch;

			const finalExtra = extra * damageFactor * factor;
			centerScores[dmElement] += finalExtra;
			locTotal += finalExtra;
			logs.push(
				`   + Nhật Chủ đắc ${name} tại chi ${branch} (${POSITION_LABEL[pos]}): +${finalExtra.toFixed(2)} đv`,
			);
			if ((logs as BaziAuditLogger).addItem) {
				(logs as BaziAuditLogger).addItem({
					type: 'center',
					level: 'accent',
					title: `Đắc Địa: ${name} (${branch})`,
					content: `Trụ ${POSITION_LABEL[pos]}: Đắc Địa cộng thêm +${finalExtra.toFixed(2)} đv vào Thân`,
					tag: name,
					scoreChange: finalExtra,
					pillar: pos,
				});
			}
		});

		// 3. Xác định các hành đối nghịch & hành địch mạnh nhất (Thực Thương/Tài/Quan Sát).
		const thucEl = this.getGodElement(dmElement, 'ThucThan');
		const taiEl = this.getGodElement(dmElement, 'ChinhTai');
		const quanEl = this.getGodElement(dmElement, 'ChinhQuan');
		const anEl = this.getGodElement(dmElement, 'ChinhAn');

		const enemyCandidates: Array<{ el: FiveElement; god: string }> = [
			{ el: thucEl, god: 'Thực Thương' },
			{ el: taiEl, god: 'Tài Tinh' },
			{ el: quanEl, god: 'Quan Sát' },
		];
		let maxEnemy = enemyCandidates[0] as { el: FiveElement; god: string };
		for (const candidate of enemyCandidates) {
			if (centerScores[candidate.el] > centerScores[maxEnemy.el]) maxEnemy = candidate;
		}

		// 4. QUY TẮC TỶ KIẾP ĐOÀN KẾT (PDF 4, Trang 23): CHỈ cứu Thân khi đang tạm Nhược.
		let countTyKiep = 0;
		nodes.forEach((n) => {
			if (!n.isBlocked && (n.transformTo || n.element) === dmElement) countTyKiep++;
		});
		if (centerScores[dmElement] < centerScores[maxEnemy.el]) {
			if (countTyKiep >= 5) {
				centerScores[dmElement] += 2.0;
				logs.push(
					`   + [QUY TẮC TỶ KIẾP] Thân nhược & có ${countTyKiep} Tỷ Kiếp -> +2.00 đv!`,
				);
				if ((logs as BaziAuditLogger).addItem) {
					(logs as BaziAuditLogger).addItem({
						type: 'center',
						level: 'success',
						title: 'Quy Tắc Tỷ Kiếp Đoàn Kết',
						content: `Thân nhược & có ${countTyKiep} Tỷ Kiếp -> Thân được cộng trợ lực +2.00 đv`,
						tag: 'Tỷ Kiếp Trợ Thân',
						scoreChange: 2.0,
					});
				}
			} else if (countTyKiep === 4) {
				centerScores[dmElement] += 1.0;
				logs.push(`   + [QUY TẮC TỶ KIẾP] Thân nhược & có 4 Tỷ Kiếp -> +1.00 đv!`);
				if ((logs as BaziAuditLogger).addItem) {
					(logs as BaziAuditLogger).addItem({
						type: 'center',
						level: 'success',
						title: 'Quy Tắc Tỷ Kiếp Đoàn Kết',
						content: `Thân nhược & có 4 Tỷ Kiếp -> Thân được cộng trợ lực +1.00 đv`,
						tag: 'Tỷ Kiếp Trợ Thân',
						scoreChange: 1.0,
					});
				}
			}
		}

		// 5. QUY TẮC KIÊU ẤN SINH 50% CHO THÂN (PDF 4, Trang 12, mục 11 & 193/194).
		const dmStage = LIFE_CYCLE_TABLE[dmStem][chart.month.branch];
		const canNgayDacLenh = ['TruongSinh', 'MocDuc', 'QuanDoi', 'LamQuan', 'DeVuong'].includes(
			dmStage,
		);
		const isAnBiggerThanThucAndTai =
			centerScores[anEl] > Math.max(centerScores[thucEl], centerScores[taiEl]);
		// Giả thiết 194: nếu Can Ngày KHÔNG đắc lệnh thì Thân phải >= max(Tài, Quan Sát).
		const isDMCapableWhenThatLenh =
			!canNgayDacLenh &&
			centerScores[dmElement] >= Math.max(centerScores[taiEl], centerScores[quanEl]);
		if (
			centerScores[dmElement] < centerScores[maxEnemy.el] &&
			isAnBiggerThanThucAndTai &&
			(canNgayDacLenh || isDMCapableWhenThatLenh)
		) {
			const anTransfer = centerScores[anEl] * 0.5;
			centerScores[dmElement] += anTransfer;
			logs.push(
				`   + [QUY TẮC 194] Kiêu Ấn (${anEl}) sinh 50% điểm (${anTransfer.toFixed(2)} đv) cho Thân!`,
			);
			if ((logs as BaziAuditLogger).addItem) {
				(logs as BaziAuditLogger).addItem({
					type: 'center',
					level: 'success',
					title: 'Quy Tắc Kiêu Ấn Trợ Thân (Quy Tắc 194)',
					content: `Kiêu Ấn (${anEl}) sinh 50% điểm (+${anTransfer.toFixed(2)} đv) cho Thân`,
					tag: 'Kiêu Ấn Sinh Thân',
					scoreChange: anTransfer,
				});
			}
		}

		const selfScore = centerScores[dmElement];
		const maxEnemyScore = centerScores[maxEnemy.el];
		const diff = selfScore - maxEnemyScore;
		const isVwang = diff >= VULONG_PHYSICS.THRESHOLD_OVERCOME;

		logs.push(`\n>> ĐIỂM VÙNG TÂM 5 HÀNH:`);
		logs.push(
			`   Kim ${centerScores.Kim.toFixed(2)} | Mộc ${centerScores.Mộc.toFixed(2)} | Thủy ${centerScores.Thủy.toFixed(2)} | Hỏa ${centerScores.Hỏa.toFixed(2)} | Thổ ${centerScores.Thổ.toFixed(2)}`,
		);
		logs.push(`   Điểm Thân (${dmElement}): ${selfScore.toFixed(2)} đv`);
		logs.push(
			`   Hành địch lớn nhất (${maxEnemy.god} - ${maxEnemy.el}): ${maxEnemyScore.toFixed(2)} đv`,
		);
		logs.push(`   Chênh lệch: ${diff.toFixed(2)} đv (cần >= 1.0 đv để Vượng)`);
		logs.push(`   => KẾT LUẬN: ${isVwang ? 'THÂN VƯỢNG' : 'THÂN NHƯỢC'}`);
		if ((logs as BaziAuditLogger).addItem) {
			(logs as BaziAuditLogger).addItem({
				type: 'conclusion',
				level: isVwang ? 'success' : 'warning',
				title: isVwang ? 'Kết Luận: Thân Vượng' : 'Kết Luận: Thân Nhược',
				content: `Thân (${dmElement}) = ${selfScore.toFixed(2)} đv | Địch Lớn Nhất (${maxEnemy.god} - ${maxEnemy.el}) = ${maxEnemyScore.toFixed(2)} đv | Hiệu số = ${diff.toFixed(2)} đv (Ngưỡng vượng >= 1.0 đv)`,
				tag: isVwang ? 'Thân Vượng' : 'Thân Nhược',
				scoreChange: diff,
			});
		}

		return {
			dayMasterScore: dmNode.currentScore,
			selfElement: dmElement,
			elementScores: centerScores,
			locScore: locTotal,
			partyScore: selfScore,
			enemyScore: maxEnemyScore,
			maxEnemyElement: maxEnemy.el,
			maxEnemyScore,
			diffScore: diff,
			isVwang,
			isStrongVwang: diff >= 15.0,
			isWeakVwang: diff <= -15.0,
		};
	}

	/**
	 * Hệ số suy hao khi nhập Vùng Tâm.
	 * Vùng trong (Can Tháng/Ngày/Giờ, Chi Ngày) = 1.0; vùng ngoài bị giảm theo PDF 4 Trang 11.
	 */
	private getCenterDecayFactor(node: EnergyNode): number {
		if (node.type === 'Stem') {
			return node.source === 'Year' ? VULONG_PHYSICS.DECAY_INTO_CENTER.YearStem : 1.0;
		}
		switch (node.source) {
			case 'Year':
				return VULONG_PHYSICS.DECAY_INTO_CENTER.YearBranch;
			case 'Month':
				return VULONG_PHYSICS.DECAY_INTO_CENTER.MonthBranch;
			case 'Hour':
				return VULONG_PHYSICS.DECAY_INTO_CENTER.HourBranch;
			default:
				return 1.0;
		}
	}

	// ====================================================================
	// 5. CHỌN DỤNG THẦN THEO 5 MẪU VŨ LONG (BƯỚC 7)
	// ====================================================================

	private determineDungThanPatterns(
		chart: BaziChart,
		center: CenterZoneAnalysis,
		logs: string[],
	): LimitScoreProfile {
		const dmElement = center.selfElement;
		const anEl = this.getGodElement(dmElement, 'ChinhAn');
		const tyEl = this.getGodElement(dmElement, 'TyKien');
		const thucEl = this.getGodElement(dmElement, 'ThucThan');
		const taiEl = this.getGodElement(dmElement, 'ChinhTai');
		const quanEl = this.getGodElement(dmElement, 'ChinhQuan');

		// Đếm Can/Chi Kiêu Ấn LỘ, đồng thời phát hiện Ấn nằm trong TẠP KHÍ TÀNG CAN
		// (PDF 4 Trang 21, Giả thiết 44: Mẫu 1 chỉ đúng khi KHÔNG có cả tạp khí của Ấn).
		let countAn = 0;
		let hasHiddenAn = false;
		[chart.year, chart.month, chart.day, chart.hour].forEach((p) => {
			if (p.stemElement === anEl) countAn++;
			if (p.branchElement === anEl) countAn++;
			const hiddens = HIDDEN_STEMS[p.branch];
			if (hiddens.some((h) => this.getStemElement(h.stem) === anEl)) hasHiddenAn = true;
		});
		const isAnDacLenh = chart.month.branchElement === anEl;

		let pattern = '';
		let dungThan: FiveElement[] = [];
		let hyThan: FiveElement[] = [];
		let kyThan: FiveElement[] = [];
		let hungThan: FiveElement[] = [];

		// =====================================================================
		// THÂN VƯỢNG (PDF 4, Trang 21-23): Thân & Ấn dấu (+), Thực/Tài/Quan dấu (-)
		// =====================================================================
		if (center.isVwang) {
			logs.push(`\n>> ĐỊNH DỤNG THẦN: THÂN VƯỢNG (Kiêu Ấn = ${countAn} can chi) -> Cần Khắc/Tiết.`);

			if (countAn === 0 && !hasHiddenAn) {
				// MẪU 1: Tuyệt đối không có Ấn -> Dụng Tài, Hỷ Thực Thương & Quan Sát.
				pattern = 'Mẫu 1 (Vượng không Ấn)';
				dungThan = [taiEl];
				hyThan = [thucEl, quanEl];
			} else if (countAn >= 3 || (countAn === 2 && isAnDacLenh)) {
				// MẪU 2: Kiêu Ấn nhiều -> Dụng Tài phá Ấn, KỴ Quan Sát.
				pattern = 'Mẫu 2 (Ấn nhiều - Dụng Tài phá Ấn)';
				dungThan = [taiEl];
				hyThan = [thucEl];
				hungThan.push(quanEl);
			} else if (countAn === 2 && !isAnDacLenh) {
				// MẪU 3: Kiêu Ấn đủ (đều thất lệnh) -> Dụng Thực Thương xì hơi Thân.
				pattern = 'Mẫu 3 (Ấn đủ - Dụng Thực Thương)';
				dungThan = [thucEl];
				hyThan = [taiEl, quanEl];
			} else {
				// MẪU 4: Kiêu Ấn ít -> Ưu tiên Quan Sát / Thực Thương.
				pattern = 'Mẫu 4 (Ấn ít - Dụng Quan Sát)';
				dungThan = [quanEl];
				hyThan = [taiEl, thucEl];
			}

			// Hung thần = hành khắc Dụng Thần chính.
			hungThan.push(this.getCounterElement(dungThan[0] as FiveElement));
			hungThan = [...new Set(hungThan)];

			// Kỵ thần = Thân và Kiêu Ấn (PDF 4, Trang 5).
			kyThan = [dmElement, anEl].filter((el) => !hungThan.includes(el));

			// =====================================================================
			// THÂN NHƯỢC (PDF 4, Trang 5 & 17-19): Thân & Ấn dấu (-), Thực/Tài/Quan dấu (+)
			// =====================================================================
		} else {
			logs.push(`\n>> ĐỊNH DỤNG THẦN: THÂN NHƯỢC -> Cần Sinh/Trợ.`);

			// NGOẠI LỆ 27/12: Mẫu từ diệt tử (Ấn > Thân >= 20 đv) -> Ấn thành Kỵ, Dụng Tỷ Kiếp.
			if (center.elementScores[anEl] - center.elementScores[dmElement] >= 20.0) {
				pattern = 'Ngoại lệ 27/12 (Mẫu từ diệt tử - Dụng Tỷ Kiếp)';
				dungThan = [tyEl];
				hyThan = [];
				hungThan = [quanEl];
				kyThan = [anEl, taiEl, thucEl];
			} else {
				// Kỵ thần số 1 = hành địch mạnh nhất trong Thực / Tài / Quan.
				const enemyScores = [
					{ el: quanEl, type: 'Quan Sát', score: center.elementScores[quanEl] },
					{ el: taiEl, type: 'Tài Tinh', score: center.elementScores[taiEl] },
					{ el: thucEl, type: 'Thực Thương', score: center.elementScores[thucEl] },
				].sort((a, b) => b.score - a.score);
				const primaryEnemy = enemyScores[0] as {
					el: FiveElement;
					type: string;
					score: number;
				};

				if (primaryEnemy.type === 'Quan Sát' || primaryEnemy.type === 'Thực Thương') {
					// MẪU 5a: Kỵ 1 là Quan Sát / Thực Thương -> Dụng Kiêu Ấn, Hỷ Tỷ Kiếp.
					pattern = `Mẫu 5a (Kỵ ${primaryEnemy.type} - Dụng Kiêu Ấn)`;
					dungThan = [anEl];
					hyThan = [tyEl];
				} else {
					// MẪU 5b: Kỵ 1 là Tài Tinh -> Dụng Tỷ Kiếp gánh Tài, Hỷ Kiêu Ấn.
					pattern = 'Mẫu 5b (Kỵ Tài - Dụng Tỷ Kiếp)';
					dungThan = [tyEl];
					hyThan = [anEl];
				}

				// Hung thần = hành khắc Dụng Thần chính.
				hungThan = [this.getCounterElement(dungThan[0] as FiveElement)];

				// Kỵ thần = các hành địch còn lại (Thực, Tài, Quan).
				kyThan = [quanEl, taiEl, thucEl].filter(
					(el) => !hungThan.includes(el) && !dungThan.includes(el) && !hyThan.includes(el),
				);
			}
		}

		const clean = (arr: FiveElement[]) => [...new Set(arr)];
		dungThan = clean(dungThan);
		hyThan = clean(hyThan).filter((e) => !dungThan.includes(e));
		hungThan = clean(hungThan).filter((e) => !dungThan.includes(e) && !hyThan.includes(e));
		kyThan = clean(kyThan).filter(
			(e) => !dungThan.includes(e) && !hyThan.includes(e) && !hungThan.includes(e),
		);

		// Định danh CHỮ cụ thể nắm vai trò Dụng Thần chính (PDF 4 Trang 21, Mục 2):
		// ưu tiên Can lộ (Năm -> Tháng -> Giờ), rồi Can tàng Bản khí / Tạp khí.
		const primaryDung = dungThan[0] as FiveElement | undefined;
		let primaryGodName = '';
		if (primaryDung) {
			for (const pos of ['Year', 'Month', 'Hour'] as PillarPosition[]) {
				const p = PILLAR_BY_POSITION[pos](chart);
				if (p.stemElement === primaryDung) {
					primaryGodName = `${p.stem} ở Can ${POSITION_LABEL[pos]}`;
					break;
				}
			}
			if (!primaryGodName) {
				for (const pos of ['Year', 'Month', 'Day', 'Hour'] as PillarPosition[]) {
					const p = PILLAR_BY_POSITION[pos](chart);
					const match = HIDDEN_STEMS[p.branch].find(
						(h) => this.getStemElement(h.stem) === primaryDung,
					);
					if (match) {
						primaryGodName = `${match.stem} tàng trong chi ${p.branch} (${POSITION_LABEL[pos]})`;
						break;
					}
				}
			}
		}

		// BẢNG ĐIỂM HẠN VŨ LONG (PDF 4, Trang 5): Dụng -1.0 | Hỷ -0.5 | Kỵ +0.5 | Hung +1.0.
		const scores: Record<string, number> = {};
		FIVE_ELEMENTS.forEach((el) => {
			if (dungThan.includes(el)) scores[el] = -1.0;
			else if (hyThan.includes(el)) scores[el] = -0.5;
			else if (hungThan.includes(el)) scores[el] = 1.0;
			else scores[el] = 0.5;
		});

		logs.push(`   => ${pattern}`);
		logs.push(`      * Dụng Thần (-1.0): [${dungThan.join(', ')}]`);
		logs.push(`      * Hỷ Thần   (-0.5): [${hyThan.join(', ')}]`);
		logs.push(`      * Kỵ Thần   (+0.5): [${kyThan.join(', ')}]`);
		logs.push(`      * Hung Thần (+1.0): [${hungThan.join(', ')}]`);
		logs.push(`>> DỤNG THẦN CHÍNH XÁC ĐỊNH: [ ${primaryGodName || primaryDung || 'Không'} ]`);

		if ((logs as BaziAuditLogger).addItem) {
			const logger = logs as BaziAuditLogger;
			logger.addItem({
				type: 'dungthan',
				level: 'accent',
				title: `Mẫu Định Dụng: ${pattern}`,
				content: `Phù hợp quy tắc 5 Mẫu Vũ Long. Dụng thần chính: ${primaryGodName || primaryDung || 'Không xác định'}.`,
				tag: 'Cách Cục Mẫu',
			});
			if (dungThan.length > 0) {
				logger.addItem({
					type: 'dungthan',
					level: 'good',
					title: `Dụng Thần: [${dungThan.join(', ')}]`,
					content: `Hành cốt lõi cân bằng mệnh cục. Khi gặp hành này hạn tính hệ số -1.0 (Đại Cát).`,
					tag: 'Dụng Thần',
					scoreChange: -1.0,
				});
			}
			if (hyThan.length > 0) {
				logger.addItem({
					type: 'dungthan',
					level: 'good',
					title: `Hỷ Thần: [${hyThan.join(', ')}]`,
					content: `Hành trợ lực cho Dụng Thần hoặc che chở bản thân. Hạn tính hệ số -0.5 (Tiểu Cát).`,
					tag: 'Hỷ Thần',
					scoreChange: -0.5,
				});
			}
			if (kyThan.length > 0) {
				logger.addItem({
					type: 'dungthan',
					level: 'warning',
					title: `Kỵ Thần: [${kyThan.join(', ')}]`,
					content: `Hành gây hao tổn hoặc sinh cho kẻ thù mạnh. Hạn tính hệ số +0.5 (Tiểu Hung).`,
					tag: 'Kỵ Thần',
					scoreChange: 0.5,
				});
			}
			if (hungThan.length > 0) {
				logger.addItem({
					type: 'dungthan',
					level: 'danger',
					title: `Hung Thần: [${hungThan.join(', ')}]`,
					content: `Hành trực tiếp công kích hoặc phá vỡ Dụng Thần. Hạn tính hệ số +1.0 (Đại Hung).`,
					tag: 'Hung Thần',
					scoreChange: 1.0,
				});
			}
		}

		return { pattern, dungThan, hyThan, kyThan, hungThan, scores };
	}

	// ====================================================================
	// 6. THẦN SÁT (BƯỚC 8)
	// ====================================================================

	private calculateShenSha(chart: BaziChart, logs?: BaziAuditLogger | string[]): string[] {
		const result: string[] = [];
		const dm = chart.day.stem;
		const branches: EarthlyBranch[] = [
			chart.year.branch,
			chart.month.branch,
			chart.day.branch,
			chart.hour.branch,
		];

		const logger = logs as BaziAuditLogger | undefined;

		// 1. Thiên Ất Quý Nhân (tra Can Ngày và Can Năm).
		const thienAtTargets = [...THIEN_AT_QUY_NHAN[dm], ...THIEN_AT_QUY_NHAN[chart.year.stem]];
		branches.forEach((b) => {
			if (thienAtTargets.includes(b)) {
				const name = `Thiên Ất Quý Nhân (${b})`;
				result.push(name);
				if (logger?.addItem) {
					logger.addItem({
						type: 'shensha',
						level: 'good',
						title: name,
						content: `Chi ${b} mang Thiên Ất Quý Nhân phù trợ Can Ngày ${dm} / Can Năm ${chart.year.stem}, hóa hung thành cát`,
						tag: 'Cát Thần',
					});
				}
			}
		});

		// 2. Văn Xương Quý Nhân (tra Can Ngày).
		const vanXuong = VAN_XUONG[dm];
		if (branches.includes(vanXuong)) {
			const name = `Văn Xương (${vanXuong})`;
			result.push(name);
			if (logger?.addItem) {
				logger.addItem({
					type: 'shensha',
					level: 'good',
					title: name,
					content: `Chi ${vanXuong} là Văn Xương vị của Can Ngày ${dm}, chủ về học vấn, tư chất văn chương sáng dạ`,
					tag: 'Cát Thần',
				});
			}
		}

		// 3. Dịch Mã (tra Chi Ngày).
		const dichMa = DICH_MA[chart.day.branch];
		if (branches.includes(dichMa)) {
			const name = `Dịch Mã (${dichMa})`;
			result.push(name);
			if (logger?.addItem) {
				logger.addItem({
					type: 'shensha',
					level: 'info',
					title: name,
					content: `Chi ${dichMa} là Dịch Mã ứng với Chi Ngày ${chart.day.branch}, chủ về di chuyển, du học, thay đổi môi trường`,
					tag: 'Biến Động',
				});
			}
		}

		// 4. Đào Hoa / Hàm Trì (tra Chi Ngày).
		const daoHoa = DAO_HOA[chart.day.branch];
		if (branches.includes(daoHoa)) {
			const name = `Đào Hoa (${daoHoa})`;
			result.push(name);
			if (logger?.addItem) {
				logger.addItem({
					type: 'shensha',
					level: 'accent',
					title: name,
					content: `Chi ${daoHoa} là Đào Hoa của Chi Ngày ${chart.day.branch}, tăng sức hút cá nhân, phong lưu, duyên dáng`,
					tag: 'Tình Duyên',
				});
			}
		}

		const uniqueResult = [...new Set(result)];
		if (uniqueResult.length === 0 && logger?.addItem) {
			logger.addItem({
				type: 'shensha',
				level: 'neutral',
				title: 'Không có Thần Sát nổi bật',
				content: 'Tứ trụ không xuất hiện các vị Thiên Ất, Văn Xương, Dịch Mã hoặc Đào Hoa chiếu mệnh chính',
				tag: 'Bình Hòa',
			});
		}

		return uniqueResult;
	}

	// ====================================================================
	// HELPER: QUẢN LÝ STATE & LOGGING
	// ====================================================================

	private applyNodeModification(
		node: EnergyNode,
		delta: number,
		reason: string,
		factor: number = 0,
	) {
		if (node.isBlocked) return;

		node.currentScore += delta;
		if (node.currentScore < 0) node.currentScore = 0;

		node.modifications.push({ reason, valueChange: delta, factor });

		if (node.currentScore < VULONG_PHYSICS.THRESHOLD_BLOCK) {
			node.currentScore = 0;
			node.isBlocked = true;
			node.modifications.push({ reason: 'Blocked (Khí tuyệt)', valueChange: 0, factor: 0 });
		}
	}

	// ====================================================================
	// HELPER FUNCTIONS (UTILS)
	// ====================================================================

	private getEffectiveBranchElement(nodes: EnergyNode[], pos: PillarPosition): FiveElement {
		const node = nodes.find((n) => n.source === pos && n.type === 'Branch');
		if (!node) throw new Error(`Branch node missing at ${pos}`);
		return node.transformTo || node.element;
	}

	private getGodElement(dmElement: FiveElement, god: string): FiveElement {
		const map = TEN_GODS_MAPPING[dmElement] as Record<string, FiveElement>;
		return map[god] as FiveElement;
	}

	/**
	 * Tuần Không Vong tính theo TRỤ NGÀY: 2 chi không nằm trong tuần (xún) của Can Chi ngày.
	 * Không Vong = 2 chi liền trước chi đầu tuần.
	 */
	private getKhongVongBranches(chart: BaziChart): Set<EarthlyBranch> {
		const headChi = (((chart.day.chiIndex - chart.day.canIndex) % 12) + 12) % 12;
		const empty1 = (((headChi - 1) % 12) + 12) % 12;
		const empty2 = (((headChi - 2) % 12) + 12) % 12;
		return new Set<EarthlyBranch>([
			EARTHLY_BRANCHES[empty1] as EarthlyBranch,
			EARTHLY_BRANCHES[empty2] as EarthlyBranch,
		]);
	}

	private getCounterElement(el: FiveElement): FiveElement {
		const map: Record<FiveElement, FiveElement> = {
			Kim: 'Hỏa',
			Mộc: 'Kim',
			Thủy: 'Thổ',
			Hỏa: 'Thủy',
			Thổ: 'Mộc',
		};
		return map[el];
	}

	private createPillarFromLunarName(name: string, pos: PillarPosition): Pillar {
		const parts = name.trim().split(' ');
		return this.createPillarFromIndex(
			HEAVENLY_STEMS.indexOf(parts[0] as HeavenlyStem),
			EARTHLY_BRANCHES.indexOf(parts[1] as EarthlyBranch),
			pos,
		);
	}

	private createPillarFromIndex(c: number, b: number, pos: PillarPosition): Pillar {
		const stem = HEAVENLY_STEMS[c] as HeavenlyStem;
		const branch = EARTHLY_BRANCHES[b] as EarthlyBranch;
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

	private getHourPillar(h: number, dIdx: number): Pillar {
		const chi = Math.floor((h + 1) / 2) % 12;
		const can = ((dIdx % 5) * 2 + chi) % 10;
		return this.createPillarFromIndex(can, chi, 'Hour');
	}

	/**
	 * Trụ Năm xác định theo THỜI ĐIỂM GIAO TIẾT LẬP XUÂN chính xác (giờ/phút, không theo ngày).
	 * Năm Can Chi của năm Dương lịch Y bắt đầu từ lúc Mặt Trời tới kinh độ 315°.
	 */
	private getYearPillar(birthDate: Date): Pillar {
		const y = birthDate.getFullYear();
		const lapXuan = this.getSolarTermMoment(y, LAP_XUAN_LONGITUDE, 2, 4);
		const baziYear = birthDate.getTime() >= lapXuan.getTime() ? y : y - 1;
		const canIndex = (((baziYear - 4) % 10) + 10) % 10;
		const chiIndex = (((baziYear - 4) % 12) + 12) % 12;
		return this.createPillarFromIndex(canIndex, chiIndex, 'Year');
	}

	private getMonthPillar(birthDate: Date, yIdx: number): Pillar {
		const chi = this.getMonthBranchIndexBySolarTerm(birthDate);
		let mOff = chi - 2;
		if (mOff < 0) mOff += 12;
		const can = ((yIdx % 5) * 2 + 2 + mOff) % 10;
		return this.createPillarFromIndex(can, chi, 'Month');
	}

	/**
	 * Tìm Chi của tháng theo Tiết giao GẦN NHẤT (chính xác tới giờ/phút).
	 */
	private getMonthBranchIndexBySolarTerm(birthDate: Date): number {
		const y = birthDate.getFullYear();
		const moments: Array<{ time: number; branchIndex: number }> = [];
		for (const year of [y - 1, y, y + 1]) {
			for (const term of TIET_TERMS) {
				const moment = this.getSolarTermMoment(
					year,
					term.longitude,
					term.approxMonth,
					term.approxDay,
				);
				moments.push({ time: moment.getTime(), branchIndex: term.branchIndex });
			}
		}
		moments.sort((a, b) => a.time - b.time);

		const birthTime = birthDate.getTime();
		let chosen = moments[0];
		for (const m of moments) {
			if (m.time <= birthTime) chosen = m;
			else break;
		}
		return chosen ? chosen.branchIndex : 2;
	}

	// --- ASTRONOMY HELPERS: thời điểm giao tiết theo Kinh độ Mặt Trời ---

	private toJulian(date: Date): number {
		return date.getTime() / 86400000 + 2440587.5;
	}

	private fromJulian(jd: number): Date {
		return new Date((jd - 2440587.5) * 86400000);
	}

	/** Kinh độ hoàng đạo biểu kiến của Mặt Trời (độ) - Meeus low precision. */
	private sunApparentLongitude(jd: number): number {
		const rad = Math.PI / 180;
		const T = (jd - 2451545.0) / 36525;
		const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
		const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
		const Mr = M * rad;
		const C =
			(1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
			(0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
			0.000289 * Math.sin(3 * Mr);
		const trueLong = L0 + C;
		const omega = 125.04 - 1934.136 * T;
		const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * rad);
		return ((lambda % 360) + 360) % 360;
	}

	/** Thời điểm Mặt Trời đạt kinh độ `longitude` (độ) trong năm `year`. */
	private getSolarTermMoment(
		year: number,
		longitude: number,
		approxMonth: number,
		approxDay: number,
	): Date {
		let jd = this.toJulian(new Date(Date.UTC(year, approxMonth - 1, approxDay, 12, 0, 0)));
		for (let i = 0; i < 12; i++) {
			let diff = longitude - this.sunApparentLongitude(jd);
			diff = (((diff + 180) % 360) + 360) % 360 - 180;
			jd += diff / 0.9856473;
			if (Math.abs(diff) < 1e-7) break;
		}
		return this.fromJulian(jd);
	}

	private getStemElement(s: HeavenlyStem): FiveElement {
		if (['Giáp', 'Ất'].includes(s)) return 'Mộc';
		if (['Bính', 'Đinh'].includes(s)) return 'Hỏa';
		if (['Mậu', 'Kỷ'].includes(s)) return 'Thổ';
		if (['Canh', 'Tân'].includes(s)) return 'Kim';
		return 'Thủy';
	}

	private getBranchMainStem(b: EarthlyBranch): HeavenlyStem {
		const mainStemObj = HIDDEN_STEMS[b].find((h) => h.isMain);
		if (!mainStemObj) throw new Error(`Invalid branch config for ${b}`);
		return mainStemObj.stem;
	}

	private getBranchMainElement(b: EarthlyBranch): FiveElement {
		return this.getStemElement(this.getBranchMainStem(b));
	}

	private getRelation(e1: FiveElement, e2: FiveElement) {
		if (e1 === e2) return 'Hoa';
		if (ELEMENT_RELATIONS[e1].generate === e2) return 'Sinh';
		if (ELEMENT_RELATIONS[e2].generate === e1) return 'DuocSinh';
		if (ELEMENT_RELATIONS[e1].overcome === e2) return 'Khac';
		return 'BiKhac';
	}

	/**
	 * Helper: Tính giờ mặt trời chân (Real Solar Time)
	 * Công thức: Giờ đồng hồ + (Kinh độ nơi sinh - Kinh độ múi giờ) * 4 phút + EoT
	 */
	private getRealSolarTime(date: Date, longitude: number = 105.85, timezone: number = 7): Date {
		const dayOfYear = Math.floor(
			(date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
		);

		const b = (2 * Math.PI * (dayOfYear - 81)) / 365;
		const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);

		const standardMeridian = timezone * 15;
		const longitudeCorrection = (longitude - standardMeridian) * 4;
		const totalCorrectionMinutes = longitudeCorrection + eot;

		return new Date(date.getTime() + totalCorrectionMinutes * 60000);
	}
}
