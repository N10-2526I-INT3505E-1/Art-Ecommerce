// services/gateway/src/controllers/dashboard.controller.ts
import { SERVICES } from "../config";

// 1. Định nghĩa các Interface để TypeScript hiểu cấu trúc dữ liệu
interface OrderStats {
    total_revenue: number;
    pending_orders: number;
}

interface UserStats {
    total_users: number;
    new_users_today: number;
}

interface ProductStats {
    out_of_stock: number;
    total_products?: number; // Có thể có hoặc không
}

export const getAdminDashboardStats = async (ctx: any) => {
    const { headers, error } = ctx;

    try {
        // Gọi song song 3 dịch vụ
        const [ordersRes, usersRes, productsRes] = await Promise.all([
            fetch(`${SERVICES.ORDERS}/api/orders/stats`, { headers }),
            fetch(`${SERVICES.USERS}/api/users/stats`, { headers }),
            fetch(`${SERVICES.PRODUCTS}/api/products/stats`, { headers })
        ]);

        // 2. Ép kiểu (as ...) để sửa lỗi 'unknown'
        // Nếu fetch thất bại (res.ok == false), ta trả về object mặc định khớp với Interface
        const ordersData = (ordersRes.ok 
            ? await ordersRes.json() 
            : { total_revenue: 0, pending_orders: 0 }) as OrderStats;

        const usersData = (usersRes.ok 
            ? await usersRes.json() 
            : { total_users: 0, new_users_today: 0 }) as UserStats;

        const productsData = (productsRes.ok 
            ? await productsRes.json() 
            : { out_of_stock: 0 }) as ProductStats;

        // 3. Bây giờ bạn có thể truy cập thuộc tính mà không bị lỗi đỏ
        return {
            revenue: {
                // Ép sang Number() để an toàn nếu service trả về string
                total: Number(ordersData.total_revenue) || 0,
                currency: "VND"
            },
            orders: {
                pending: ordersData.pending_orders || 0,
            },
            users: {
                total: usersData.total_users || 0,
                new_today: usersData.new_users_today || 0
            },
            inventory: {
                alert: (productsData.out_of_stock > 0),
                out_of_stock_count: productsData.out_of_stock || 0
            }
        };

    } catch (err) {
        console.error("Dashboard Aggregation Error:", err);
        return error(502, "Failed to load dashboard data");
    }
};