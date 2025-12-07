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
			username: string;
			email: string;
			first_name: string;
			last_name: string;
			role: 'user' | 'operator' | 'manager';
			dob?: string | null;
			birth_hour?: string | null; // From the original user model
		}

		/**
		 * Represents the full Bazi profile object returned from the API.
		 * This aligns with your `BaziProfileResponseSchema`.
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

			// Calculated Bazi Data
			year_stem: number;
			year_branch: number;
			month_stem: number;
			month_branch: number;
			day_stem: number;
			day_branch: number;
			hour_stem: number;
			hour_branch: number;

			// Analysis Results (can be null if not yet calculated)
			day_master_status?: string | null;
			structure_type?: string | null;
			structure_name?: string | null;
			analysis_reason?: string | null;
			shen_sha?: string[] | null;
			god_scores?: Record<string, number> | null;
			score_details?: Array<{
				source: string;
				element: string;
				score: number;
				notes: string;
			}> | null;
			party_score?: number | null;
			enemy_score?: number | null;
			percentage_self?: number | null;
			interactions?: {
				tamHoi: string | null;
				sanHe: string | null;
				lucXung: number[];
				isMonthChanged: boolean;
			} | null;
			favorable_elements?: {
				dung_than: string[];
				hy_than: string[];
				ky_than: string[];
				cuu_than: string[];
				nhan_than: string[];
			} | null;
			element_scores?: Record<string, number> | null;
			luck_start_age?: number | null;

			// Timestamps
			created_at: string;
			updated_at: string;
		}
	}
}

export {};
