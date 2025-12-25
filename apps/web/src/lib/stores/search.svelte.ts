import { api } from '$lib/api-client';

export interface SearchHit {
	id: string;
	name: string;
	description: string;
	price: number;
	imageUrl: string;
	categoryName: string;
	tags: string[];
	_formatted?: {
		name?: string;
		description?: string;
	};
}

export interface SearchResult {
	hits: SearchHit[];
	query: string;
	processingTimeMs: number;
	totalHits: number;
	limit: number;
}

export interface SearchSuggestion {
	id: string;
	name: string;
}

export interface SearchFacets {
	categories: string[];
	tags: string[];
}

export interface SearchParams {
	q?: string;
	category?: string;
	minPrice?: number;
	maxPrice?: number;
	tags?: string;
	sort?: string;
	limit?: number;
}

class SearchStore {
	// State
	query = $state('');
	results = $state<SearchHit[]>([]);
	suggestions = $state<SearchSuggestion[]>([]);
	facets = $state<SearchFacets>({ categories: [], tags: [] });
	isLoading = $state(false);
	isLoadingSuggestions = $state(false);
	totalHits = $state(0);
	processingTimeMs = $state(0);
	error = $state<string | null>(null);

	// Debounce timer
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Search products with filters
	 */
	async search(params: SearchParams = {}) {
		this.isLoading = true;
		this.error = null;

		try {
			const searchParams = new URLSearchParams();

			if (params.q) searchParams.set('q', params.q);
			if (params.category) searchParams.set('category', params.category);
			if (params.minPrice) searchParams.set('minPrice', params.minPrice.toString());
			if (params.maxPrice) searchParams.set('maxPrice', params.maxPrice.toString());
			if (params.tags) searchParams.set('tags', params.tags);
			if (params.sort) searchParams.set('sort', params.sort);
			if (params.limit) searchParams.set('limit', params.limit.toString());

			const response = await api.get(`search?${searchParams.toString()}`).json<SearchResult>();

			this.results = response.hits;
			this.totalHits = response.totalHits ?? 0;
			this.processingTimeMs = response.processingTimeMs;
			this.query = params.q || '';

			return response;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Search failed';
			console.error('Search error:', err);
			return null;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Get search suggestions (autocomplete)
	 */
	async getSuggestions(query: string, limit: number = 5) {
		if (!query || query.length < 2) {
			this.suggestions = [];
			return [];
		}

		this.isLoadingSuggestions = true;

		try {
			const response = await api
				.get(`v1/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`)
				.json<{ suggestions: SearchSuggestion[] }>();

			this.suggestions = response.suggestions;
			return response.suggestions;
		} catch (err) {
			console.error('Suggestions error:', err);
			return [];
		} finally {
			this.isLoadingSuggestions = false;
		}
	}

	/**
	 * Get search suggestions with debounce
	 */
	getSuggestionsDebounced(query: string, delay: number = 300) {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			this.getSuggestions(query);
		}, delay);
	}

	/**
	 * Load available facets (categories and tags)
	 */
	async loadFacets() {
		try {
			const response = await api.get('search/facets').json<SearchFacets>();
			this.facets = response;
			return response;
		} catch (err) {
			console.error('Facets error:', err);
			return null;
		}
	}

	/**
	 * Clear search results
	 */
	clear() {
		this.query = '';
		this.results = [];
		this.suggestions = [];
		this.totalHits = 0;
		this.error = null;
	}

	/**
	 * Clear suggestions only
	 */
	clearSuggestions() {
		this.suggestions = [];
	}
}

// Export singleton instance
export const searchStore = new SearchStore();
