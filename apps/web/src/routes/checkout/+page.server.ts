import { api } from '$lib/server/http';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Server-side auth check
	if (!locals.user) {
		throw redirect(302, '/login?redirect=/checkout');
	}
	return {
		user: locals.user,
	};
};

export const actions = {
	default: async ({ request, locals, fetch }) => {
		const formData = await request.formData();

		// 1. Auth Check
		if (!locals.user) {
			return fail(401, { message: 'Vui lòng đăng nhập lại.' });
		}

		// 2. Extract Data
		const email = formData.get('email') as string;
		const fullName = formData.get('fullName') as string;
		const phone = formData.get('phone') as string;
		const province = formData.get('province') as string;
		const ward = formData.get('ward') as string;
		const address = formData.get('address') as string;
		const cartItemsJson = formData.get('cartItems') as string;

		// 3. Validation & Parsing
		if (!phone || !address || !ward || !province) {
			return fail(400, { message: 'Vui lòng điền đầy đủ thông tin giao hàng.' });
		}

		// Clean Phone Number (Remove spaces/dots to match regex ^[0-9]{9,11}$)
		const cleanPhone = phone.replace(/\D/g, '');
		if (cleanPhone.length < 9 || cleanPhone.length > 11) {
			return fail(400, { message: 'Số điện thoại không hợp lệ.' });
		}

		let cartItems: any[];
		try {
			cartItems = JSON.parse(cartItemsJson);
			if (!Array.isArray(cartItems) || cartItems.length === 0) {
				throw new Error();
			}
		} catch (e) {
			return fail(400, { message: 'Giỏ hàng lỗi. Vui lòng thử lại.' });
		}

		// 4. Calculate Totals (Server-side source of truth)
		const FREE_SHIPPING_THRESHOLD = 10_000_000;
		const SHIPPING_FEE = 50_000;
		const TAX_RATE = 0.1;

		const subtotal = cartItems.reduce(
			(sum: number, item: any) => sum + Number(item.price) * item.quantity,
			0,
		);
		const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
		const tax = Math.round(subtotal * TAX_RATE);
		const total = Math.round(subtotal + tax + shipping); // Ensure Integer

		// 5. Construct Payload matching your API Schema exactly
		const orderPayload = {
			user_id: locals.user.id,
			total_amount: total,
			status: 'pending',
			shipping_address: {
				address: address,
				phone: cleanPhone,
				ward: ward,
				state: province,
				country: 'Vietnam',
				// 'postal_code' and 'is_default' are optional in your schema, so we omit them to be safe
			},
			items: cartItems.map((item: any) => ({
				product_id: String(item.id),
				quantity: Number(item.quantity),
				price_per_item: Number(item.price),
				product_snapshot: {
					name: item.name,
					image: item.image,
					material: item.material || 'Standard',
				},
			})),
		};

		// 6. Execute API Calls
		const client = api({ fetch, request }); // Pass context to propagate Auth Cookies

		try {
			console.log('Creating Order:', JSON.stringify(orderPayload, null, 2));

			// A. Create Order
			const orderRes = await client
				.post('orders/', { json: orderPayload })
				.json<{ order: { id: string } }>();

			if (!orderRes?.order?.id) {
				throw new Error('Không nhận được mã đơn hàng từ hệ thống.');
			}

			// B. Create Payment
			const paymentPayload = {
				order_id: orderRes.order.id,
				amount: total,
				payment_gateway: 'vnpay',
			};

			const paymentRes = await client
				.post('payments/', { json: paymentPayload })
				.json<{ paymentUrl: string }>();

			if (paymentRes.paymentUrl) {
				return { success: true, paymentUrl: paymentRes.paymentUrl };
			} else {
				return fail(500, { message: 'Lỗi khởi tạo cổng thanh toán VNPay.' });
			}
		} catch (err: any) {
			console.error('Checkout Error:', err);

			// Try to parse backend error message
			let apiError = 'Có lỗi xảy ra khi xử lý đơn hàng.';
			if (err.response) {
				try {
					const body = await err.response.json();
					console.error('API Error Body:', body);
					// Extract validation message if available
					if (body.summary) apiError = body.summary;
					else if (body.message) apiError = body.message;
					else if (body.error) apiError = body.error;
				} catch (e) {
					/* ignore */
				}
			}

			return fail(500, { message: apiError });
		}
	},
} satisfies Actions;
