// services/gateway/controllers/order.controller.ts
import { SERVICES } from "../config";
import type { Order, Product } from "../types";

export const getOrderDetail = async (ctx: any) => {
    const { params, user, error } = ctx;
    const orderId = params.id;

    try {
        // BƯỚC 1: Lấy thông tin đơn hàng
        const orderRes = await fetch(`${SERVICES.ORDERS}/api/orders/${orderId}`, {
            headers: {
                "X-User-Id": user?.id.toString() || "", 
            }
        });

        if (!orderRes.ok) {
            const errBody = await orderRes.json();
            return error(orderRes.status, errBody);
        }

        // 🔥 SỬA LỖI Ở ĐÂY: Thêm "as Order"
        const order = await orderRes.json() as Order;

        if (!order.items || order.items.length === 0) {
            return order;
        }

        // BƯỚC 2: Data Aggregation (Lấy thông tin Product)
        const productIds = [...new Set(order.items.map(item => item.product_id))];

        const productPromises = productIds.map(id => 
            fetch(`${SERVICES.PRODUCTS}/api/products/${id}`)
                .then(res => res.ok ? res.json() as Promise<Product> : null)
                .catch(() => null) 
        );

        const products = await Promise.all(productPromises);

        const productMap: Record<number, Product> = {};
        products.forEach(p => {
            if (p) productMap[p.id] = p;
        });

        // BƯỚC 3: Merge dữ liệu
        const enrichedItems = order.items.map(item => {
            const product = productMap[item.product_id];
            return {
                ...item,
                product_name: product?.name || "Sản phẩm không tồn tại",
                product_image: product?.image_url || null,
                product_slug: product?.slug || null
            };
        });

        return {
            ...order,
            items: enrichedItems
        };

    } catch (err) {
        console.error(`❌ Order Detail Error [${orderId}]:`, err);
        return error(502, "Failed to load order details");
    }
};