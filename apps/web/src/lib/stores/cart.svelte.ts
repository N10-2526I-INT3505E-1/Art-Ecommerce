// src/lib/stores/cart.svelte.ts
import { browser } from '$app/environment';

export interface CartItem {
	id: string | number;
	name: string;
	price: number;
	quantity: number;
	image: string;
	stock: number;
	material?: string;
	slug: string;
}

class CartStore {
	items = $state<CartItem[]>([]);
	savedItems = $state<CartItem[]>([]);

	constructor() {
		if (browser) {
			const storedCart = localStorage.getItem('novus_cart');
			const storedSaved = localStorage.getItem('novus_saved');

			if (storedCart) this.items = JSON.parse(storedCart);
			if (storedSaved) this.savedItems = JSON.parse(storedSaved);
		}
	}

	// Persist to LocalStorage
	private save() {
		if (browser) {
			localStorage.setItem('novus_cart', JSON.stringify(this.items));
			localStorage.setItem('novus_saved', JSON.stringify(this.savedItems));
		}
	}

	addItem(product: any, quantity: number) {
		const existingItem = this.items.find((i) => i.id === product.id);

		if (existingItem) {
			const newQty = Math.min(existingItem.quantity + quantity, existingItem.stock);
			existingItem.quantity = newQty;
		} else {
			this.items.push({
				id: product.id,
				name: product.name,
				price: product.price,
				quantity: quantity,
				image: product.images?.[0] || product.imageUrl || '',
				stock: product.stock,
				material: product.category?.name || 'N/A', // Mapping category to material for display
				slug: product.slug || '',
			});
		}
		this.save();
	}

	removeItem(id: string | number) {
		this.items = this.items.filter((i) => i.id !== id);
		this.save();
	}

	updateQuantity(id: string | number, delta: number) {
		const item = this.items.find((i) => i.id === id);
		if (item) {
			const newQty = item.quantity + delta;
			if (newQty > 0 && newQty <= item.stock) {
				item.quantity = newQty;
				this.save();
			}
		}
	}

	saveForLater(id: string | number) {
		const item = this.items.find((i) => i.id === id);
		if (item) {
			this.savedItems.push(item);
			this.removeItem(id);
			this.save();
		}
	}

	moveToCart(id: string | number) {
		const item = this.savedItems.find((i) => i.id === id);
		if (item) {
			this.items.push(item);
			this.savedItems = this.savedItems.filter((i) => i.id !== id);
			this.save();
		}
	}

	removeSavedItem(id: string | number) {
		this.savedItems = this.savedItems.filter((i) => i.id !== id);
		this.save();
	}

	restoreItem(item: CartItem) {
		this.items.push(item);
		this.save();
	}
}

export const cart = new CartStore();
