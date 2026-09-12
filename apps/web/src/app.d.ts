// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: User | null;
		}

		interface PageData {
			user?: User;
			baziProfile?: BaziProfile | null;
		}
		// interface Platform {}

		// --- TYPE DEFINITIONS ---

		/**
		 * Represents the user object stored in `locals`.
		 * This is based on your user service's safe response schema.
		 */
		interface User {
			id: string;
			email: string;
			username: string;
			first_name: string;
			last_name: string;
			role: 'user' | 'operator' | 'manager';
			created_at: string;
			updated_at: string;
		}

		interface UserAddress {
			id: number;
			user_id: string;
			address: string;
			phone: string;
			state: string;
			postal_code: string | null;
			country: string;
			is_default: number; // 0 hoặc 1
			created_at: string;
			updated_at: string;
		}

		interface BaziEnergyModification {
			reason: string;
			valueChange: number;
			factor?: number;
		}

		interface BaziEnergyNode {
			id: string;
			source: 'Year' | 'Month' | 'Day' | 'Hour';
			type: 'Stem' | 'Branch';
			name: string;
			element: string;
			branchOwner?: string;
			mainStem?: string;
			lifeCycleStage: string;
			baseScore: number;
			currentScore: number;
			isBlocked: boolean;
			isActionLocked: boolean;
			isCombined: boolean;
			transformTo?: string;
			modifications: BaziEnergyModification[];
		}

		interface BaziCenterAnalysis {
			dayMasterScore: number;
			selfElement: string;
			elementScores: Record<string, number>;
			locScore: number;
			partyScore: number;
			enemyScore: number;
			maxEnemyElement: string;
			maxEnemyScore: number;
			diffScore: number;
			isVwang: boolean;
			isStrongVwang: boolean;
			isWeakVwang: boolean;
		}

		interface BaziLimitScoreProfile {
			pattern: string;
			dungThan: string[];
			hyThan: string[];
			kyThan: string[];
			hungThan: string[];
			scores: Record<string, number>;
		}

		interface BaziInteraction {
			type: 'TamHoi' | 'TamHop' | 'LucHop' | 'LucXung' | 'CanHop';
			participants: string[];
			result: string;
			score?: number;
			description?: string;
		}

		interface BaziAuditLogItem {
			type: string;
			level: string;
			title: string;
			content: string;
			tag?: string;
			pillar?: string;
			scoreChange?: number;
			currentScore?: number;
			metadata?: Record<string, any>;
		}

		interface BaziAuditLogSection {
			step: number;
			name: string;
			badge: string;
			description?: string;
			items: BaziAuditLogItem[];
		}

		/**
		 * Represents the full Bazi profile object returned from the API.
		 */
		interface BaziProfile {
			id: string;
			user_id: string;
			profile_name: string;

			// Input Data
			gender: 'male' | 'female';
			birth_day: number;
			birth_month: number;
			birth_year: number;
			birth_hour: number;
			birth_minute: number;
			longitude?: number | null;
			timezone_offset?: number | null;

			// Calculated Bazi Data (Stems & Branches as text names)
			year_stem: string;
			year_branch: string;
			month_stem: string;
			month_branch: string;
			day_stem: string;
			day_branch: string;
			hour_stem: string;
			hour_branch: string;

			// Analysis Results (Vu Long Engine)
			day_master_status?: string | null;
			structure_type?: string | null;
			structure_name?: string | null;
			analysis_reason?: string | null;
			shen_sha?: string[] | null;

			// Complex JSON Data
			center_analysis?: BaziCenterAnalysis | null;
			energy_flow?: BaziEnergyNode[] | null;
			limit_score?: BaziLimitScoreProfile | null;
			interactions?: BaziInteraction[] | null;

			// Summary & Legacy fields
			favorable_elements?: string[] | null;
			party_score?: number | null;
			enemy_score?: number | null;
			element_scores?: Record<string, number> | null;
			god_scores?: Record<string, number> | null;
			score_details?: BaziAuditLogSection[] | any | null;
			percentage_self?: number | null;
			luck_start_age?: number | null;

			// Timestamps
			created_at: string;
			updated_at: string;
		}
	}
}

export {};
