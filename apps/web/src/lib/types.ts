// apps/web/src/lib/types.ts

export interface Category {
    id: number;
    name: string;
    slug: string | null;
    description: string | null;
}

export interface Product {
    id: number;
    name: string;
    price: number;
    imageUrl: string;
    description: string | null;
    categoryId: number | null;
    sourceUrl: string | null;
}