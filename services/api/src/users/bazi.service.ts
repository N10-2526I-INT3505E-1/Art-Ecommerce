/**
 * src/users/bazi.service.ts
 *
 * BAZI QUANTITATIVE ENGINE (VULONG METHOD & TRICH THIEN TUY)
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
	LIFE_CYCLE_SCORES,
	PHYSICS, // Import cấu hình vật lý chuẩn hóa
} from './bazi.constants';

export class BaziService {
	// ====================================================================
	// 0. LẬP TRỤ (ASTRONOMY)
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
		const analysis = this.analyzeChart(chart, birthDate);

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

			// Legacy
			percentage_self: 0,
			luck_start_age: 0,
			element_scores: {},
			god_scores: {},
			score_details: [],
			shen_sha: [],
		};
	}

	/**
	 * CORE PIPELINE: Quy trình phân tích định lượng Vũ Long
	 */
	private analyzeChart(chart: BaziChart, inputDate: Date): BaziResult {
		const auditLogs: string[] = [];
		auditLogs.push(`--- BẮT ĐẦU PHÂN TÍCH (VULONG METHOD v3) ---`);

		// BƯỚC 1: KHỞI TẠO (INITIALIZATION)
		// Tính điểm gốc dựa trên Lệnh tháng (Quan trọng nhất theo TTT Chương 15)
		let nodes = this.initializeEnergyGraph(chart, inputDate, auditLogs);

		// BƯỚC 2: VẬT LÝ KHOẢNG CÁCH (DISTANCE PHYSICS)
		// Áp dụng suy hao do Khắc gần/xa TRƯỚC khi xét hợp hóa.
		// TTT Chương 18: "Địa chiến gấp như hỏa", xung khắc làm giảm lực.
		this.applyDistancePhysics(nodes, auditLogs);

		// BƯỚC 3: TƯƠNG TÁC HÓA HỌC (INTERACTIONS)
		// Xử lý Hợp/Hóa/Xung. Chỉ những thần còn lực (chưa Blocked) mới tham gia.
		const interactionResult = this.processInteractions(nodes, chart.month.branch, auditLogs);
		nodes = interactionResult.nodes;

		// BƯỚC 4: VÙNG TÂM & DÒNG CHẢY (CENTER ZONE FLOW)
		// Tính toán lực tụ về Nhật chủ theo định nghĩa Vũ Long (Can Tháng, Can Giờ, Chi Ngày)
		// TTT Chương 19 (Nguyên Lưu): Dòng chảy phải được tính toán.
		const centerAnalysis = this.calculateCenterZoneStrength(nodes, chart, auditLogs);

		// BƯỚC 5: KẾT LUẬN CƯỜNG NHƯỢC
		const strengthResult = this.finalizeStructure(centerAnalysis, auditLogs);

		// BƯỚC 6: ĐIỂM HẠN (LIMIT SCORES)
		// Xác định Dụng/Hỷ/Kỵ/Hung thần
		const limitProfile = this.calculateLimitScoreProfile(
			strengthResult.centerZone,
			strengthResult.godScores,
			strengthResult.dmElement,
			strengthResult.structureType,
			auditLogs,
		);

		return {
			pillars: chart,
			energyFlow: nodes,
			interactions: interactionResult.interactions,
			centerZone: strengthResult.centerZone,
			structure: strengthResult.structure,
			structureType: strengthResult.structureType,
			limitScore: limitProfile,
			auditLogs: auditLogs,
		};
	}

	// ====================================================================
	// 2. VẬT LÝ KHOẢNG CÁCH (DISTANCE PHYSICS)
	// ====================================================================

	private applyDistancePhysics(nodes: EnergyNode[], logs: string[]) {
		logs.push(`\n--- VẬT LÝ KHOẢNG CÁCH (KHẮC GẦN/XA) ---`);

		const stems = [
			nodes.find((n) => n.source === 'Year' && n.type === 'Stem'),
			nodes.find((n) => n.source === 'Month' && n.type === 'Stem'),
			nodes.find((n) => n.source === 'Day' && n.type === 'Stem'),
			nodes.find((n) => n.source === 'Hour' && n.type === 'Stem'),
		];

		// 1. Duyệt j > i để tránh lặp lại cặp (Double Count)
		for (let i = 0; i < stems.length; i++) {
			for (let j = i + 1; j < stems.length; j++) {
				const nodeA = stems[i];
				const nodeB = stems[j];

				if (!nodeA || !nodeB || nodeA.isBlocked || nodeB.isBlocked) continue;

				const distance = Math.abs(i - j);
				// getRelation(A, B): Trả về quan hệ của A đối với B
				const relation = this.getRelation(nodeA.element, nodeB.element);

				let attacker: EnergyNode | null = null;
				let defender: EnergyNode | null = null;

				// Xác định ai khắc ai
				if (relation === 'Khac') {
					attacker = nodeA;
					defender = nodeB;
				} else if (relation === 'BiKhac') {
					attacker = nodeB;
					defender = nodeA;
				}

				if (attacker && defender) {
					let distDesc = '';
					let decayRate = 0; // Tỉ lệ suy giảm cho Defender (Bị khắc)

					if (distance === 1) {
						decayRate = PHYSICS.LOSS_CLASH_NEAR;
						distDesc = 'Khắc gần';
					} else if (distance === 2) {
						decayRate = PHYSICS.LOSS_CLASH_GAP_1;
						distDesc = 'Khắc cách 1 ngôi';
					} else if (distance === 3) {
						decayRate = PHYSICS.LOSS_CLASH_GAP_2;
						distDesc = 'Khắc cách 2 ngôi';
					}

					// Tính toán tổn thất
					// Attacker (Khắc xuất): Mất lực ít (hao tổn khí) * (1/distance)
					const drainAttacker =
						attacker.currentScore * PHYSICS.LOSS_OVERCOME_SOURCE * (1 / distance);

					// Defender (Khắc nhập): Mất lực nhiều (bị thương) * decayRate
					const damageDefender = defender.currentScore * decayRate;

					this.applyNodeModification(
						attacker,
						-drainAttacker,
						`Khắc xuất ${defender.name} (${distDesc})`,
						PHYSICS.LOSS_OVERCOME_SOURCE,
					);
					this.applyNodeModification(
						defender,
						-damageDefender,
						`Bị ${attacker.name} khắc (${distDesc})`,
						decayRate,
					);

					logs.push(
						`> ${attacker.name} khắc ${defender.name} (${distDesc}): ${attacker.name} hao ${drainAttacker.toFixed(2)}, ${defender.name} mất ${damageDefender.toFixed(2)}`,
					);
				}
			}
		}
	}

	// ====================================================================
	// 3. TƯƠNG TÁC HÓA HỌC (INTERACTIONS)
	// ====================================================================

	private processInteractions(nodes: EnergyNode[], monthBranch: EarthlyBranch, logs: string[]) {
		let currentNodes = [...nodes];
		const interactions: Interaction[] = []; // Thu thập kết quả tương tác

		// 1. Tam Hội (Seasonal) - Lực mạnh nhất
		const seasonalRes = this.processBranchGroup(currentNodes, 'TamHoi', monthBranch, logs);
		currentNodes = seasonalRes.nodes;
		interactions.push(...seasonalRes.interactions);

		// 2. Tam Hợp (Tri-Harmony)
		const tripleRes = this.processBranchGroup(currentNodes, 'TamHop', monthBranch, logs);
		currentNodes = tripleRes.nodes;
		interactions.push(...tripleRes.interactions);

		// 3. Lục Hợp (Six-Harmony)
		const sixRes = this.processAdjacency(currentNodes, 'LucHop', monthBranch, logs);
		currentNodes = sixRes.nodes;
		interactions.push(...sixRes.interactions);

		// 4. Lục Xung (Six-Clash) - TTT: "Địa chiến gấp như hỏa"
		const clashRes = this.processAdjacency(currentNodes, 'LucXung', monthBranch, logs);
		currentNodes = clashRes.nodes;
		interactions.push(...clashRes.interactions);

		// 5. Ngũ Hợp Can (Stem Combination) - TTT Chương 13: Hóa Tượng
		const stemRes = this.processStemCombinations(currentNodes, monthBranch, logs);
		currentNodes = stemRes.nodes;
		interactions.push(...stemRes.interactions);

		return { nodes: currentNodes, interactions };
	}

	// ====================================================================
	// 4. VÙNG TÂM & DÒNG CHẢY (CENTER ZONE)
	// ====================================================================

	private calculateCenterZoneStrength(nodes: EnergyNode[], chart: BaziChart, logs: string[]) {
		logs.push(`\n--- PHÂN TÍCH VÙNG TÂM (NGUYÊN LƯU) ---`);

		const dmNode = nodes.find((n) => n.source === 'Day' && n.type === 'Stem');
		if (!dmNode) throw new Error('Day Master missing');
		const dmElement = dmNode.transformTo || dmNode.element;

		// 1. Dòng chảy Nội bộ (Gốc dưỡng Ngọn)
		// Đặc biệt quan trọng cho Trụ Ngày (Nhật Chủ ngồi trên Chi)
		(['Year', 'Month', 'Day', 'Hour'] as PillarPosition[]).forEach((pos) => {
			this.processRootToStemFlow(nodes, pos, logs);
		});

		// 2. Dòng chảy giữa các trụ (Thiên can)
		// Năm -> Tháng (Suy hao do xa)
		this.processPillarToPillarFlow(nodes, 'Year', 'Month', logs, PHYSICS.FACTOR_FLOW_INTO_CENTER);
		// Tháng -> Ngày (Lực mạnh)
		this.processPillarToPillarFlow(nodes, 'Month', 'Day', logs, 1.0);
		// Giờ -> Ngày (Lực mạnh)
		this.processPillarToPillarFlow(nodes, 'Hour', 'Day', logs, 1.0);

		// 3. Tổng hợp lực lượng Vùng Tâm
		let partyScore = 0;
		let enemyScore = 0;

		// Cập nhật lại điểm Nhật chủ sau khi được sinh/khắc (Quan trọng!)
		const dmCurrentScore = dmNode.currentScore;
		partyScore += dmCurrentScore;

		// Duyệt qua TẤT CẢ các node để tính điểm, áp dụng Trọng Số (Weighting)
		// Thay vì filter hạn chế, ta duyệt hết và gán trọng số
		nodes.forEach((node) => {
			if (node.isBlocked) return;
			if (node.id === dmNode.id) return; // Bỏ qua Nhật chủ đã tính

			// A. Xác định Trọng số vị trí (Weighting)
			let weight = 1.0;
			let positionNote = '';

			if (node.source === 'Month') {
				if (node.type === 'HiddenStem') {
					// Chi Tháng: Nếu là Bản khí (Main) hoặc Hóa cục -> Trọng số cao nhất
					if (node.isCombined || node.id.includes('_0')) {
						weight = PHYSICS.WEIGHT_MONTH_BRANCH; // 2.5
						positionNote = ' [Lệnh Tháng x2.5]';
					} else {
						weight = 0.5; // Tạp khí tháng tính thấp
					}
				} else {
					weight = PHYSICS.WEIGHT_MONTH_HOUR_STEM; // 1.2
				}
			} else if (node.source === 'Hour') {
				if (node.type === 'HiddenStem') {
					// Chi Giờ: Bản khí tính hệ số
					if (node.id.includes('_0'))
						weight = PHYSICS.WEIGHT_HOUR_BRANCH; // 1.2
					else weight = 0.3;
				} else {
					weight = PHYSICS.WEIGHT_MONTH_HOUR_STEM; // 1.2
				}
			} else if (node.source === 'Day') {
				if (node.type === 'HiddenStem') {
					weight = PHYSICS.WEIGHT_DAY_BRANCH; // 1.5 (Cung phu thê)
					positionNote = ' [Chi Ngày x1.5]';
				}
			} else if (node.source === 'Year') {
				// Trụ năm xa, lực tác động vào vùng tâm giảm
				weight = PHYSICS.WEIGHT_YEAR; // 0.8
				// Nếu là tàng can trụ năm thì giảm nữa
				if (node.type === 'HiddenStem') weight *= 0.5;
			}

			// B. Tính điểm cuối cùng
			const el = node.transformTo || node.element;
			const finalScore = node.currentScore * weight;
			const relation = this.getRelation(el, dmElement);

			// C. Phân loại Phe
			switch (relation) {
				case 'Hoa': // Tỷ Kiếp (Bạn)
				case 'Sinh': // Ấn (Mẹ)
					partyScore += finalScore;
					break;

				case 'Khac': // Quan Sát (Kẻ thù)
				case 'DuocSinh': // Thực Thương (Con - Xì hơi)
					enemyScore += finalScore;
					break;

				case 'BiKhac': // Tài (Vợ/Cha - Hao sức quản lý)
					// Tài làm hao tổn khí lực. Tính vào phe địch.
					// Vũ Long: Hệ số hao tài nhẹ hơn khắc quan.
					const wealthDrain = finalScore * PHYSICS.LOSS_WEALTH_EXHAUSTION * weight;
					// Lưu ý: wealthDrain là phần Nhật chủ mất đi, nên cộng vào EnemyScore (sức cản trở)
					enemyScore += wealthDrain;
					break;
			}

			// Log chi tiết các thành phần quan trọng (> 1.0 điểm)
			if (finalScore > 1.0) {
				const side = relation === 'Hoa' || relation === 'Sinh' ? '(+Ta)' : '(-Địch)';
				logs.push(
					`   - ${node.name} (${node.source}): ${node.currentScore.toFixed(2)} x ${weight} = ${finalScore.toFixed(2)} ${side} ${positionNote}`,
				);
			}
		});

		const diff = partyScore - enemyScore;
		const isVwang = diff >= PHYSICS.THRESHOLD_VWANG;

		logs.push(`\n>> KẾT QUẢ CÂN BẰNG LỰC LƯỢNG:`);
		logs.push(`   Phe Ta (Thân + Ấn + Tỷ): ${partyScore.toFixed(2)}`);
		logs.push(`   Phe Địch (Thực + Tài + Quan): ${enemyScore.toFixed(2)}`);
		logs.push(`   Hiệu số (Ta - Địch): ${diff.toFixed(2)}`);
		logs.push(`   => KẾT LUẬN: ${isVwang ? 'THÂN VƯỢNG' : 'THÂN NHƯỢC'}`);

		return {
			centerZone: {
				dayMasterScore: dmCurrentScore,
				partyScore,
				enemyScore,
				diffScore: diff,
				isVwang,
				isStrongVwang: diff >= 15.0,
				isWeakVwang: diff <= -15.0,
			},
			dmElement,
			godScores: this.calculateGodScores(nodes, dmElement, chart.day.stem),
		};
	}

	/**
	 * Xử lý Dòng chảy Nội bộ Trụ (Internal Flow): Gốc (Chi) tác động lên Ngọn (Can).
	 * Đây là bước quyết định Can có "Thông căn" (Rooted) hay "Hư phù" (Floating).
	 */
	private processRootToStemFlow(nodes: EnergyNode[], position: PillarPosition, logs: string[]) {
		// 1. Lấy Node Thiên Can
		const stemNode = nodes.find((n) => n.source === position && n.type === 'Stem' && !n.isBlocked);
		if (!stemNode) return;

		// 2. Lấy danh sách Tàng Can
		const branchNodes = nodes.filter(
			(n) => n.source === position && n.type === 'HiddenStem' && !n.isBlocked,
		);
		if (branchNodes.length === 0) return;

		// 3. Xác định Hành của Chi (Dùng Bản Khí Tĩnh - Static Main Qi)
		// Lấy branchOwner từ node đầu tiên tìm thấy để tra cứu bản khí
		const branchName = branchNodes[0].branchOwner;
		if (!branchName) return;

		// Hàm này (xem bên dưới) sẽ trả về hành của bản khí (VD: Sửu -> Thổ) bất kể điểm số
		const branchMainEl = this.getBranchMainElement(branchName);
		const branchTotalScore = this.getPillarTotalScore(branchNodes); // Tổng lực của chi

		// Hành của Can (Xét cả trường hợp đã hóa)
		const stemEl = stemNode.transformTo || stemNode.element;

		// 4. Xác định mối quan hệ
		const rel = this.getRelation(branchMainEl, stemEl);
		const posName = { Year: 'Năm', Month: 'Tháng', Day: 'Ngày', Hour: 'Giờ' }[position];

		switch (rel) {
			case 'Hoa':
				// [TỶ HÒA] - Can Chi đồng khí (VD: Kỷ Sửu -> Thổ Thổ)
				// Cộng hưởng: Can được cường hóa
				const resonance = branchTotalScore * 0.2;
				this.applyNodeModification(stemNode, resonance, `Thông căn chi ${posName} (Đồng khí)`);

				// Cộng điểm cho các tàng can cùng hành (Cộng hưởng ngược)
				branchNodes.forEach((b) => {
					if (b.element === stemEl) {
						this.applyNodeModification(b, resonance * 0.5, `Cộng hưởng với Can`);
					}
				});
				logs.push(`   + Nội bộ trụ ${posName}: Can Chi đồng khí (+${resonance.toFixed(2)})`);
				break;

			case 'Sinh':
				// [CHI SINH CAN] - Đắc Địa (VD: Giáp Tý -> Thủy sinh Mộc)
				const gain = branchTotalScore * PHYSICS.GAIN_GENERATE_TARGET;
				this.applyNodeModification(stemNode, gain, `Được chi ${posName} sinh`);

				// Chi bị tiết khí
				branchNodes.forEach((b) => {
					// Chỉ trừ điểm các tàng can sinh ra Can hoặc là bản khí
					if (this.getRelation(b.element, stemEl) === 'Sinh' || b.element === branchMainEl) {
						const loss = b.currentScore * PHYSICS.LOSS_GENERATE_SOURCE;
						this.applyNodeModification(b, -loss, `Sinh xuất cho Can`);
					}
				});
				logs.push(`   + Nội bộ trụ ${posName}: Chi sinh Can (+${gain.toFixed(2)})`);
				break;

			case 'Khac':
				// [CHI KHẮC CAN] - Tiệt Cước (VD: Giáp Thân -> Kim khắc Mộc)
				const damage = stemNode.currentScore * PHYSICS.LOSS_OVERCOME_TARGET;
				this.applyNodeModification(stemNode, -damage, `Bị chi ${posName} khắc (Tiệt cước)`);
				logs.push(`   - Nội bộ trụ ${posName}: Chi khắc Can (Tiệt cước) (-${damage.toFixed(2)})`);
				break;

			case 'DuocSinh':
				// [CAN SINH CHI] - Tiết Khí (VD: Giáp Ngọ -> Mộc sinh Hỏa)
				const drain = stemNode.currentScore * PHYSICS.LOSS_GENERATE_SOURCE;
				this.applyNodeModification(stemNode, -drain, `Sinh xuất cho chi ${posName}`);

				// Chi được sinh
				branchNodes.forEach((b) => {
					if (this.getRelation(stemEl, b.element) === 'Sinh') {
						this.applyNodeModification(b, drain * 0.8, `Được Can sinh`);
					}
				});
				logs.push(`   - Nội bộ trụ ${posName}: Can sinh Chi (Tiết khí) (-${drain.toFixed(2)})`);
				break;

			case 'BiKhac':
				// [CAN KHẮC CHI] - Cái Đầu (VD: Giáp Tuất -> Mộc khắc Thổ)
				const exertion = stemNode.currentScore * PHYSICS.LOSS_OVERCOME_SOURCE;
				this.applyNodeModification(stemNode, -exertion, `Khắc chi ${posName} (Cái đầu)`);

				branchNodes.forEach((b) => {
					if (this.getRelation(stemEl, b.element) === 'Khac') {
						const injury = b.currentScore * PHYSICS.LOSS_OVERCOME_TARGET * 0.5;
						this.applyNodeModification(b, -injury, `Bị Can khắc`);
					}
				});
				logs.push(`   - Nội bộ trụ ${posName}: Can khắc Chi (Cái đầu) (-${exertion.toFixed(2)})`);
				break;
		}
	}

	/**
	 * Dòng chảy giữa 2 trụ (Năm -> Tháng)
	 */
	private processPillarToPillarFlow(
		nodes: EnergyNode[],
		src: PillarPosition,
		target: PillarPosition,
		logs: string[],
		flowFactor: number,
	) {
		// Lấy Node Can của nguồn và đích
		const sStem = nodes.find((n) => n.source === src && n.type === 'Stem' && !n.isBlocked);
		const tStem = nodes.find((n) => n.source === target && n.type === 'Stem' && !n.isBlocked);

		if (!sStem || !tStem) return;

		const sEl = sStem.transformTo || sStem.element;
		const tEl = tStem.transformTo || tStem.element;
		const rel = this.getRelation(sEl, tEl);

		const posName: Record<string, string> = {
			Year: 'Năm',
			Month: 'Tháng',
			Day: 'Ngày',
			Hour: 'Giờ',
		};

		// Lực tác động dựa trên điểm hiện tại của Can nguồn
		const effectiveForce = sStem.currentScore * flowFactor;

		if (rel === 'Sinh') {
			// Nguồn sinh Đích (VD: Giáp Mộc -> Đinh Hỏa)
			const gain = effectiveForce * PHYSICS.GAIN_GENERATE_TARGET;
			const loss = sStem.currentScore * PHYSICS.LOSS_GENERATE_SOURCE * flowFactor; // Hao lực nguồn

			this.applyNodeModification(sStem, -loss, `Sinh xuất cho ${posName[target]}`);
			this.applyNodeModification(tStem, gain, `Được ${posName[src]} sinh nhập`);

			logs.push(`${posName[src]} -> ${posName[target]}: Sinh nhập (+${gain.toFixed(2)})`);
		} else if (rel === 'Khac') {
			// Nguồn khắc Đích
			const damage = effectiveForce * PHYSICS.LOSS_OVERCOME_TARGET;
			const exertion = sStem.currentScore * PHYSICS.LOSS_OVERCOME_SOURCE * flowFactor;

			this.applyNodeModification(sStem, -exertion, `Khắc xuất ${posName[target]}`);
			this.applyNodeModification(tStem, -damage, `Bị ${posName[src]} khắc nhập`);

			logs.push(`${posName[src]} -> ${posName[target]}: Khắc nhập (-${damage.toFixed(2)})`);
		}
		// Các trường hợp Tỷ hòa hoặc Được sinh thường không tính là dòng chảy chính trong mô hình này
	}

	// ====================================================================
	// 5. KẾT LUẬN CẤU TRÚC (STRUCTURE FINALIZATION)
	// ====================================================================

	/**
	 * Tổng hợp kết quả phân tích Vùng Tâm để đưa ra kết luận Thân Vượng/Nhược.
	 * @param analysisResult Kết quả trả về từ calculateCenterZoneStrength
	 * @param logs Mảng log để ghi chú
	 */
	private finalizeStructure(
		analysisResult: {
			centerZone: CenterZoneAnalysis;
			dmElement: FiveElement;
			godScores: Record<TenGod, number>;
		},
		logs: string[],
	) {
		const { centerZone, dmElement, godScores } = analysisResult;
		const { partyScore, enemyScore, diffScore, isVwang } = centerZone;

		logs.push(`\n>> TỔNG KẾT CƯỜNG NHƯỢC (VÙNG TÂM):`);
		logs.push(`   Phe Ta (Ấn + Tỷ): ${partyScore.toFixed(2)}`);
		logs.push(`   Phe Địch (Tài + Quan + Thực): ${enemyScore.toFixed(2)}`);
		logs.push(`   Chênh lệch (Ta - Địch): ${diffScore.toFixed(2)}`);

		// Logic Vũ Long:
		// Nếu chênh lệch >= 1.0 (ngưỡng an toàn) -> Vượng/Nhược rõ ràng.
		// Nếu chênh lệch nhỏ (vùng xám), cần xét thêm Tiết khí (đã được tính trong điểm gốc)
		// và xu hướng dòng chảy. Ở đây ta dùng kết quả isVwang đã tính ở bước trước.

		const structureName = isVwang ? 'Thân Vượng' : 'Thân Nhược';
		logs.push(`   => KẾT LUẬN: ${structureName}`);

		// Xác định loại cách cục (Nội cách vs Ngoại cách)
		// Mặc định là Nội cách. Ngoại cách (Tòng) xảy ra khi một phe cực yếu (< mức chết) và phe kia cực mạnh.
		// Tạm thời giữ logic cơ bản, có thể mở rộng logic Tòng cách tại đây.
		const structureType = 'Nội Cách';

		return {
			centerZone,
			structure: structureName,
			structureType,
			godScores,
			dmElement,
		};
	}

	// ====================================================================
	// HELPER: QUẢN LÝ STATE & LOGGING
	// ====================================================================

	/**
	 * Hàm trung tâm quản lý thay đổi điểm số.
	 * Đảm bảo mọi thay đổi đều được ghi log và kiểm tra ngưỡng Blocked.
	 */
	private applyNodeModification(
		node: EnergyNode,
		delta: number,
		reason: string,
		factor: number = 0,
	) {
		if (node.isBlocked) return;

		node.currentScore += delta;
		if (node.currentScore < 0) node.currentScore = 0;

		node.modifications.push({
			reason: reason,
			valueChange: delta,
			factor: factor,
		});

		if (node.currentScore < PHYSICS.THRESHOLD_BLOCK) {
			node.currentScore = 0;
			node.isBlocked = true;
			node.modifications.push({ reason: 'Blocked (Khí tuyệt)', valueChange: 0, factor: 0 });
		}
	}

	// ====================================================================
	// CÁC HÀM XỬ LÝ NHÓM CHI TIẾT (BRANCH GROUPS)
	// ====================================================================

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
		const interactions: Interaction[] = [];
		const checkedGroups = new Set<string>();

		Object.values(dictionary).forEach((config) => {
			const groupKey = config.group.sort().join('-');
			if (checkedGroups.has(groupKey)) return;
			checkedGroups.add(groupKey);

			const matchedNodesMap = new Map<EarthlyBranch, EnergyNode[]>();
			activeNodes.forEach((node) => {
				if (config.group.includes(node.branchOwner!)) {
					if (!matchedNodesMap.has(node.branchOwner!)) matchedNodesMap.set(node.branchOwner!, []);
					matchedNodesMap.get(node.branchOwner!)!.push(node);
				}
			});

			if (matchedNodesMap.size === 3) {
				const resultEl = config.result;

				// 1. Dẫn thần là Lệnh tháng (Chi tháng) phải cùng hành với Hóa cục
				const monthMainEl = this.getBranchMainElement(monthBranch);
				const isMonthSupport = monthMainEl === resultEl;

				// 2. Dẫn thần là Can thấu lộ: Phải là Can cùng hành hóa cục, KHÔNG bị khắc, và phải có lực (không Blocked)
				// Ưu tiên Can Năm hoặc Can Tháng, Can Giờ
				const hasStemLead = nodes.some(
					(n) =>
						n.type === 'Stem' && !n.isBlocked && n.element === resultEl && n.currentScore > 2.0,
				);

				// 3. Logic Vũ Long: Tam Hội lực rất mạnh, Tam Hợp cần dẫn thần rõ ràng
				let allowTransform = false;
				if (type === 'TamHoi') {
					// Tam hội quá mạnh, chỉ cần có khí dẫn hoặc lệnh tháng ủng hộ là hóa
					allowTransform = isMonthSupport || hasStemLead;
				} else {
					// Tam hợp cần điều kiện khắt khe hơn: Lệnh tháng hoặc Can dẫn phải mạnh
					allowTransform =
						isMonthSupport || (hasStemLead && monthMainEl !== this.getCounterElement(resultEl));
				}

				// Vũ Long: Tam hợp/Tam hội lực rất mạnh, đôi khi không cần lệnh tháng vẫn hóa nếu có Can dẫn vượng
				if (allowTransform) {
					logs.push(
						`>> ${type}: ${config.group.join('-')} HÓA ${resultEl} thành công (Dẫn thần: ${isMonthSupport ? 'Lệnh tháng' : 'Can thấu'}).`,
					);

					const participants = [
						matchedNodesMap.get(config.group[0])![0],
						matchedNodesMap.get(config.group[1])![0],
						matchedNodesMap.get(config.group[2])![0],
					];

					// Tính tổng điểm gốc
					const totalScore = participants.reduce((sum, n) => sum + n.currentScore, 0);

					// Tạo Node Hóa Cục Mới
					nodes.push({
						id: `${type}_${resultEl}_${Date.now()}`, // Unique ID
						source: 'Month', // Hóa cục thường quy về lệnh tháng
						type: 'HiddenStem', // Coi như một tàng can cực mạnh
						name: `${type} ${resultEl}`,
						element: resultEl,
						lifeCycleStage: 'DeVuong', // Hóa cục luôn Vượng
						baseScore: totalScore,
						currentScore: totalScore * PHYSICS.FACTOR_TRANSFORM_BONUS,
						isBlocked: false,
						isCombined: true,
						modifications: [
							{
								reason: 'Hóa cục thành công',
								valueChange: 0,
								factor: PHYSICS.FACTOR_TRANSFORM_BONUS,
							},
						],
					});

					// Vô hiệu hóa các chi cũ (đã tham gia hợp)
					participants.forEach((p) => {
						const originalScore = p.currentScore;
						p.currentScore = 0;
						p.isBlocked = true;
						p.modifications.push({
							reason: `Tham gia ${type}`,
							valueChange: -originalScore,
							factor: 0,
						});
					});

					interactions.push({
						type: type,
						participants: config.group,
						result: resultEl,
						score: totalScore * PHYSICS.FACTOR_TRANSFORM_BONUS,
					});
				} else {
					logs.push(
						`>> ${type}: ${config.group.join('-')} tụ khí nhưng KHÔNG HÓA (Thiếu dẫn thần).`,
					);
					// Có thể thêm logic "Hợp trói" nhẹ ở đây nếu muốn, nhưng Tam hợp thường không hóa vẫn trợ lực nhau
				}
			}
		});
		return { nodes, interactions };
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
		const interactions: Interaction[] = [];

		pairs.forEach((pair) => {
			const n1 = getMain(pair.p1);
			const n2 = getMain(pair.p2);
			if (!n1 || !n2 || !n1.branchOwner || !n2.branchOwner) return;

			if (type === 'LucXung' && BRANCH_CLASHES[n1.branchOwner] === n2.branchOwner) {
				const s1 = n1.currentScore;
				const s2 = n2.currentScore;

				// Logic Vũ Long: Mạnh thắng Yếu (Gấp 1.5 lần)
				if (s1 > s2 * 1.5) {
					// N1 Thắng: Mất ít (30%)
					// N2 Thua: Mất nhiều (70%)
					this.applyNodeModification(
						n1,
						-s1 * PHYSICS.LOSS_CLASH_WIN,
						`Thắng xung ${n2.branchOwner}`,
						PHYSICS.LOSS_CLASH_WIN,
					);
					this.applyNodeModification(
						n2,
						-s2 * PHYSICS.LOSS_CLASH_LOSE,
						`Thua xung ${n1.branchOwner}`,
						PHYSICS.LOSS_CLASH_LOSE,
					);
					logs.push(`>> Lục Xung: ${n1.branchOwner} (Thắng) >> ${n2.branchOwner} (Thua)`);
				} else if (s2 > s1 * 1.5) {
					this.applyNodeModification(
						n1,
						-s1 * PHYSICS.LOSS_CLASH_LOSE,
						`Thua xung ${n2.branchOwner}`,
						PHYSICS.LOSS_CLASH_LOSE,
					);
					this.applyNodeModification(
						n2,
						-s2 * PHYSICS.LOSS_CLASH_WIN,
						`Thắng xung ${n1.branchOwner}`,
						PHYSICS.LOSS_CLASH_WIN,
					);
					logs.push(`>> Lục Xung: ${n1.branchOwner} (Thua) << ${n2.branchOwner} (Thắng)`);
				} else {
					// Hòa: Cả hai cùng tổn thất trung bình (50%)
					this.applyNodeModification(
						n1,
						-s1 * PHYSICS.LOSS_CLASH_DRAW,
						`Xung hòa ${n2.branchOwner}`,
						PHYSICS.LOSS_CLASH_DRAW,
					);
					this.applyNodeModification(
						n2,
						-s2 * PHYSICS.LOSS_CLASH_DRAW,
						`Xung hòa ${n1.branchOwner}`,
						PHYSICS.LOSS_CLASH_DRAW,
					);
					logs.push(`>> Lục Xung: ${n1.branchOwner} == ${n2.branchOwner} (Lưỡng bại)`);
				}
				interactions.push({
					type: 'LucXung',
					participants: [n1.branchOwner, n2.branchOwner],
					result: 'Clash',
				});
			} else if (type === 'LucHop') {
				const combo = BRANCH_SIX_COMBINATIONS[n1.branchOwner];
				if (combo && combo.target === n2.branchOwner) {
					const resEl = combo.result;
					const monthEl = this.getBranchMainElement(monthBranch);
					const hasLead = nodes.some(
						(n) => n.type === 'Stem' && !n.isBlocked && n.element === resEl,
					);

					if (hasLead || monthEl === resEl) {
						logs.push(`>> Lục Hợp: ${n1.branchOwner}-${n2.branchOwner} HÓA ${resEl}`);
						n1.element = resEl;
						n1.name = `Hợp Hóa ${resEl}`;
						// Gom điểm n2 vào n1 và bonus
						const total = n1.currentScore + n2.currentScore;
						const newScore = total * PHYSICS.FACTOR_TRANSFORM_BONUS;
						const delta = newScore - n1.currentScore;

						this.applyNodeModification(
							n1,
							delta,
							'Hợp hóa (Gom & Bonus)',
							PHYSICS.FACTOR_TRANSFORM_BONUS,
						);

						// Block n2
						const originalN2Score = n2.currentScore; // Save before modifying
						n2.currentScore = 0;
						n2.isBlocked = true;
						n2.modifications.push({
							reason: `Hợp nhập vào ${n1.branchOwner}`,
							valueChange: -originalN2Score, // ✅ Use saved value
							factor: 0,
						});

						interactions.push({
							type: 'LucHop',
							participants: [n1.branchOwner, n2.branchOwner],
							result: resEl,
						});
					} else {
						// Hợp trói
						const loss1 = -n1.currentScore * PHYSICS.LOSS_COMBINE_BINDING;
						const loss2 = -n2.currentScore * PHYSICS.LOSS_COMBINE_BINDING;
						this.applyNodeModification(n1, loss1, 'Hợp trói', PHYSICS.LOSS_COMBINE_BINDING);
						this.applyNodeModification(n2, loss2, 'Hợp trói', PHYSICS.LOSS_COMBINE_BINDING);
						interactions.push({
							type: 'LucHop',
							participants: [n1.branchOwner, n2.branchOwner],
							result: 'Bind',
						});
					}
				}
			}
		});
		return { nodes, interactions };
	}

	private processStemCombinations(nodes: EnergyNode[], monthBranch: EarthlyBranch, logs: string[]) {
		const getStem = (pos: string) =>
			nodes.find((n) => n.source === pos && n.type === 'Stem' && !n.isBlocked);
		const pairs = [
			{ p1: 'Year', p2: 'Month' },
			{ p1: 'Month', p2: 'Day' },
			{ p1: 'Day', p2: 'Hour' },
		];
		const interactions: Interaction[] = [];

		pairs.forEach((pair) => {
			const s1 = getStem(pair.p1);
			const s2 = getStem(pair.p2);
			if (s1 && s2) {
				const combo = STEM_COMBINATIONS[s1.name as HeavenlyStem];
				if (combo && combo.target === s2.name) {
					const resEl = combo.result;

					// Vũ Long: Can hợp hóa cần Chi Tháng (Lệnh) làm dẫn thần.
					// Hoặc Chi tháng đã hóa cục thành hành đó.

					// Lấy hành thực tế của Chi tháng (check xem chi tháng có bị hóa cục trước đó không)
					const monthTamNode = nodes.find(
						(n) => n.source === 'Month' && n.isCombined && !n.isBlocked,
					);
					const realMonthEl = monthTamNode
						? monthTamNode.element
						: this.getBranchMainElement(monthBranch);

					// Điều kiện hóa: Lệnh tháng phải cùng hành với Hóa khí
					if (realMonthEl === resEl) {
						logs.push(`>> Can Hợp: ${s1.name}-${s2.name} HÓA ${resEl} (Đắc lệnh tháng).`);

						// Cập nhật hành mới cho cả 2 can
						s1.transformTo = resEl;
						s2.transformTo = resEl;

						// Tăng điểm do hóa khí thành công
						const bonus1 = s1.currentScore * (PHYSICS.FACTOR_TRANSFORM_BONUS - 1);
						const bonus2 = s2.currentScore * (PHYSICS.FACTOR_TRANSFORM_BONUS - 1);

						this.applyNodeModification(
							s1,
							bonus1,
							'Hóa cục (Bonus)',
							PHYSICS.FACTOR_TRANSFORM_BONUS,
						);
						this.applyNodeModification(
							s2,
							bonus2,
							'Hóa cục (Bonus)',
							PHYSICS.FACTOR_TRANSFORM_BONUS,
						);

						interactions.push({ type: 'CanHop', participants: [s1.name, s2.name], result: resEl });
					} else {
						logs.push(`>> Can Hợp: ${s1.name}-${s2.name} BỊ TRÓI (Không hóa, mất lệnh).`);

						// Hợp mà không hóa thì cả 2 đều mất lực (tham hợp quên sinh/khắc)
						// Giảm 80% lực (PHYSICS.LOSS_COMBINE_BINDING)
						const loss1 = -s1.currentScore * PHYSICS.LOSS_COMBINE_BINDING;
						const loss2 = -s2.currentScore * PHYSICS.LOSS_COMBINE_BINDING;

						this.applyNodeModification(s1, loss1, 'Hợp trói', PHYSICS.LOSS_COMBINE_BINDING);
						this.applyNodeModification(s2, loss2, 'Hợp trói', PHYSICS.LOSS_COMBINE_BINDING);

						interactions.push({ type: 'CanHop', participants: [s1.name, s2.name], result: 'Bind' });
					}
				}
			}
		});
		return { nodes, interactions };
	}

	// ====================================================================
	// HELPER FUNCTIONS (UTILS)
	// ====================================================================

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
		const scoreIndource = godScores.ChinhAn + godScores.ThienAn;
		const scoreSelf = godScores.TyKien + godScores.KiepTai;

		// TTT Chương 18: "Trung hòa là quý". Vượng thì ức, Nhược thì phù.
		if (center.isVwang) {
			logs.push('>> Định Dụng Thần: Thân Vượng -> Cần Khắc/Tiết.');
			if (scoreIndource > scoreSelf) {
				// Vượng do Ấn (Mẹ sinh) -> Dụng Tài phá Ấn
				dung.push(getEl('ChinhTai'), getEl('ThienTai'));
				hy.push(getEl('ThucThan'), getEl('ThuongQuan'));
			} else {
				// Vượng do Tỷ Kiếp -> Dụng Quan Sát
				dung.push(getEl('ChinhQuan'), getEl('ThatSat'));
				hy.push(getEl('ChinhTai'), getEl('ThienTai'));
			}
			ky.push(getEl('ChinhAn'), getEl('ThienAn'), getEl('TyKien'), getEl('KiepTai'));
		} else {
			logs.push('>> Định Dụng Thần: Thân Nhược -> Cần Sinh/Trợ.');
			dung.push(getEl('ChinhAn'), getEl('ThienAn'));
			hy.push(getEl('TyKien'), getEl('KiepTai'));
			ky.push(
				getEl('ThucThan'),
				getEl('ThuongQuan'),
				getEl('ChinhTai'),
				getEl('ThienTai'),
				getEl('ChinhQuan'),
				getEl('ThatSat'),
			);
		}

		// Hung thần là cái khắc Dụng thần
		dung.forEach((dEl) => {
			hung.push(ELEMENT_RELATIONS[dEl].overcome);
		});

		const unique = (arr: FiveElement[]) => [...new Set(arr)];
		dung = unique(dung);
		hy = unique(hy);
		ky = unique(ky);
		hung = unique(hung);
		hy = hy.filter((e) => !dung.includes(e));
		ky = ky.filter((e) => !hung.includes(e));

		const scores: Record<string, number> = { Kim: 0, Mộc: 0, Thủy: 0, Hỏa: 0, Thổ: 0 };
		const allElements: FiveElement[] = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];

		const SCORES = { DUNG: -1.0, HY: -0.5, KY: 0.5, HUNG: 1.0, NHAN: 0.1 };

		allElements.forEach((el) => {
			if (hung.includes(el)) scores[el] = SCORES.HUNG;
			else if (dung.includes(el)) scores[el] = SCORES.DUNG;
			else if (ky.includes(el)) scores[el] = SCORES.KY;
			else if (hy.includes(el)) scores[el] = SCORES.HY;
			else scores[el] = SCORES.NHAN;
		});

		return { dungThan: dung, hyThan: hy, kyThan: ky, hungThan: hung, scores };
	}

	// --- Basic Utils & Initializers ---
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
		if (lunar.get().month === 12 && ['Lập xuân', 'Vũ thủy'].includes(term)) {
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
	private initializeEnergyGraph(chart: BaziChart, inputDate: Date, logs: string[]): EnergyNode[] {
		const nodes: EnergyNode[] = [];
		const pillars: Pillar[] = [chart.year, chart.month, chart.day, chart.hour];
		const monthBranch = chart.month.branch;
		const daysSinceTerm = this.calculateDaysSinceSolarTerm(inputDate);
		const commanderStem = this.getCommanderStem(monthBranch, daysSinceTerm);

		logs.push(
			`>> Lệnh tháng ${monthBranch}, Tư lệnh: ${commanderStem} (Ngày thứ ${daysSinceTerm}).`,
		);

		pillars.forEach((pillar) => {
			const stemInfo = this.calculateStemPower(pillar.stem, monthBranch);
			let stemScore = stemInfo.score;
			if (pillar.stem === commanderStem) {
				stemScore *= 1.2;
				logs.push(`> Can ${pillar.stem} đắc lệnh (Tư lệnh).`);
			}
			// ID deterministic: Position_Type
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

			if (pillar.position === 'Month') {
				this.createMonthBranchNodes(nodes, pillar, commanderStem, monthBranch);
			} else {
				this.createStaticBranchNodes(nodes, pillar, monthBranch);
			}
		});
		return nodes;
	}

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
			if (h.stem === commander) {
				ratio = h.isMain ? 1.0 : 0.5;
				note = h.isMain ? ' (Bản khí)' : ' (Tạp khí)';
			} else {
				if (!h.isMain) ratio = 0.1;
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

	private createStaticBranchNodes(nodes: EnergyNode[], pillar: Pillar, monthCmd: EarthlyBranch) {
		const hiddens = HIDDEN_STEMS[pillar.branch];
		hiddens.forEach((h, idx) => {
			const info = this.calculateStemPower(h.stem, monthCmd);
			const score = info.score * h.ratio;
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

	/**
	 * Tính số ngày từ Tiết Lệnh (Jie Qi) gần nhất đến ngày sinh.
	 * QUAN TRỌNG: Phải phân biệt Tiết (Jie - Đầu tháng) và Khí (Qi - Giữa tháng).
	 * Tư lệnh được tính từ ngày Giao Tiết đầu tháng.
	 */
	private calculateDaysSinceSolarTerm(inputDate: Date): number {
		const JIE_TERMS = [
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

		let currentDate = new Date(inputDate);
		currentDate.setHours(12, 0, 0, 0);

		for (let daysAgo = 0; daysAgo < 40; daysAgo++) {
			const sDate = new SolarDate(currentDate);
			const lDate = sDate.toLunarDate();
			lDate.init();

			const termName = lDate.getSolarTerm();

			if (JIE_TERMS.includes(termName)) {
				// Kiểm tra xem ngày hôm qua có phải tiết khác không (để xác định đúng điểm giao)
				const prevDate = new Date(currentDate);
				prevDate.setDate(prevDate.getDate() - 1);
				const sPrev = new SolarDate(prevDate);
				const lPrev = sPrev.toLunarDate();
				lPrev.init();

				if (termName !== lPrev.getSolarTerm()) {
					return daysAgo;
				}
			}
			currentDate.setDate(currentDate.getDate() - 1);
		}
		return 1; // Fallback
	}

	private getCounterElement(el: FiveElement): FiveElement {
		// Trả về hành khắc hành đầu vào (dùng để check Dẫn thần)
		const map: Record<FiveElement, FiveElement> = {
			Kim: 'Hỏa',
			Mộc: 'Kim',
			Thủy: 'Thổ',
			Hỏa: 'Thủy',
			Thổ: 'Mộc',
		};
		return map[el];
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
		// Tìm tàng can chính (isMain = true) trong cấu hình HIDDEN_STEMS
		const mainStemObj = HIDDEN_STEMS[b].find((h) => h.isMain);
		if (!mainStemObj) throw new Error(`Invalid branch config for ${b}`);
		return this.getStemElement(mainStemObj.stem);
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
	private getPillarDominantElement(nodes: EnergyNode[]) {
		return nodes.reduce((a, b) => (a.currentScore > b.currentScore ? a : b)).element;
	}
	private getPillarTotalScore(nodes: EnergyNode[]) {
		return nodes.reduce((a, b) => a + b.currentScore, 0);
	}
	private boostPillarScore(nodes: EnergyNode[], amt: number, el: FiveElement, r: string) {
		const targets = nodes.filter((n) => n.element === el);
		if (targets.length)
			targets.forEach((n) => this.applyNodeModification(n, amt / targets.length, r));
		else if (nodes[0]) this.applyNodeModification(nodes[0], amt, r);
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
				// Fallback cho tàng can hoặc hóa khí không rõ tên can
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

	/**
	 * Helper: Tính giờ mặt trời chân (Real Solar Time)
	 * Công thức: Giờ đồng hồ + (Kinh độ nơi sinh - Kinh độ múi giờ) * 4 phút + EoT
	 * @param date Giờ trên đồng hồ
	 * @param longitude Kinh độ nơi sinh (VD: Hà Nội = 105.85)
	 * @param timezone Múi giờ (VD: 7)
	 */
	private getRealSolarTime(date: Date, longitude: number = 105.85, timezone: number = 7): Date {
		const dayOfYear = Math.floor(
			(date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
		);

		// Công thức gần đúng Equation of Time (EoT) - đơn vị phút
		const b = (2 * Math.PI * (dayOfYear - 81)) / 365;
		const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);

		// Chênh lệch kinh độ (4 phút cho mỗi độ)
		// 15 độ = 1 giờ. Múi giờ 7 = 105 độ đông.
		const standardMeridian = timezone * 15;
		const longitudeCorrection = (longitude - standardMeridian) * 4;

		const totalCorrectionMinutes = longitudeCorrection + eot;

		return new Date(date.getTime() + totalCorrectionMinutes * 60000);
	}
}
