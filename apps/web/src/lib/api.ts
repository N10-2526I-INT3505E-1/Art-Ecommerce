import ky from 'ky';

// Cấu hình client (Trỏ về Backend của bạn)
const api = ky.create({
    prefixUrl: 'http://localhost:3000/products', 
    retry: 0
});

// Định nghĩa kiểu dữ liệu (Interface)
export interface Product {
    id: number;
    name: string;
    price: number;
    imageUrl: string;
    description?: string;
    category?: { name: string };
    tags?: { name: string }[];
}

export interface Category {
    id: number;
    name: string;
}

// === CÁC HÀM GỌI API ===

// 1. Lấy danh sách danh mục (Cho Menu)
export const getCategories = async () => {
    return await api.get('categories').json<Category[]>();
};

// 2. Lấy danh sách sản phẩm (Cho Trang chủ & Tìm kiếm)
// params có thể là: { page: 1, limit: 10, search: 'ngua', categoryId: 5 }
export const getProducts = async (params: Record<string, any> = {}) => {
    const searchParams = new URLSearchParams();
    // Chỉ thêm các tham số có giá trị
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            searchParams.append(key, String(value));
        }
    });
    
    return await api.get('', { searchParams }).json<{
        data: Product[];
        pagination: any;
    }>();
};

// 3. Lấy chi tiết 1 sản phẩm
export const getProductById = async (id: string) => {
    return await api.get(id).json<Product>();
};

// 4. Gửi Tags để AI gợi ý
export const getAIRecommendations = async (tags: string[]) => {
    return await api.post('recommend', { json: { tags } }).json<Product[]>();
};