import { getCategories } from '$lib/api';

export const load = async () => {
    try {
        const categories = await getCategories();
        return { categories };
    } catch (e) {
        console.error("Lỗi load menu:", e);
        return { categories: [] };
    }
};