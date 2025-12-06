// services/gateway/types.ts

// Dữ liệu từ Order Service
export interface OrderItem {
    product_id: number;
    quantity: number;
    unit_price: number;
    // Các trường sẽ được merge thêm
    product_name?: string;
    product_image?: string;
}

export interface Order {
    id: number;
    user_id: number;
    status: 'pending' | 'paid' | 'shipped' | 'cancelled';
    total_amount: number;
    items: OrderItem[];
    created_at: string;
}

// Dữ liệu từ Product Service
export interface Product {
    id: number;
    name: string;
    price: number;
    image_url: string;
    slug: string;
}

// Dữ liệu trả về khi tạo thanh toán
export interface PaymentResponse {
    payment_url: string; // Link qua VNPay
    transaction_id: string;
}