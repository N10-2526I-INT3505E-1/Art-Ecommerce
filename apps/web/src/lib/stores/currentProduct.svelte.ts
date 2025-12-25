/**
 * Store to track the currently viewed product
 * Used by AI Chat Widget to provide context-aware responses
 */

export interface CurrentProduct {
	id: string;
	name: string;
	price: number;
	description?: string;
	imageUrl?: string;
	categoryName?: string;
	tags?: string[];
}

// Export reactive state directly for Svelte 5 runes compatibility
let _currentProduct = $state<CurrentProduct | null>(null);

export const currentProductStore = {
	get value() {
		return _currentProduct;
	},

	set(product: CurrentProduct | null) {
		_currentProduct = product;
		console.log('🛍️ Current product updated:', product?.name ?? 'cleared');
	},

	clear() {
		_currentProduct = null;
		console.log('🛍️ Current product cleared');
	},
};
