import { getProducts } from '$lib/api';

export const load = async () => {
    try {
        // Lấy 8 sản phẩm mới nhất
        const res = await getProducts({ limit: 8 });
        return { products: res.data || [] };
    } catch (e) {
        console.error("Lỗi load trang chủ:", e);
        return { products: [] };
    }
};