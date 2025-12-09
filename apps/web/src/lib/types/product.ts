// src/lib/types/product.ts
export interface ProductTag {
	id: string;
	name: string;
	type: 'auto' | 'manual';
}

export interface ProductCategory {
	name: string;
	slug: string;
}

export interface Product {
	id: string;
	name: string;
	price: number;
	imageUrl: string;
	description: string;
	slug: string;
	stock: number;
	category: ProductCategory | null;
	sourceUrl: string;
	tags: ProductTag[];
	images: string[];
	rating: number;
	reviewCount: number;
}
