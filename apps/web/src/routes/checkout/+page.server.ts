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

		// Clean Phone Number
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

		// 4. Calculate Totals (Server-side)
		const FREE_SHIPPING_THRESHOLD = 10_000_000;
		const SHIPPING_FEE = 50_000;
		const TAX_RATE = 0.1;

		const subtotal = cartItems.reduce(
			(sum: number, item: any) => sum + Number(item.price) * item.quantity,
			0,
		);
		const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
		const tax = Math.round(subtotal * TAX_RATE);
		const total = Math.round(subtotal + tax + shipping);

		// 5. Construct Payload matching OpenAPI /orders/ schema
		const orderPayload = {
			user_id: locals.user.id,
			total_amount: total,
			status: 'pending', // Enum: pending, paid, etc.
			shipping_address: {
				address: address,
				phone: cleanPhone,
				ward: ward,
				state: province,
				country: 'Vietnam',
				postal_code: null,
				is_default: 0,
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
		const client = api({ fetch, request });

		try {
			// Call POST /orders/
			// Based on OpenAPI, this returns { order: {...}, items: [...], paymentUrl: string|null }
			const response = await client
				.post('orders/', {
					json: orderPayload,
					retry: 0, // Prevent double charging on network glitches
				})
				.json<{
					order: { id: string };
					items: any[];
					paymentUrl?: string | null;
				}>();

			if (!response?.order?.id) {
				throw new Error('Không nhận được mã đơn hàng từ hệ thống.');
			}

			// Check for paymentUrl directly from the Order response
			if (response.paymentUrl) {
				// Return the URL to the frontend so it can handle the redirect
				return {
					success: true,
					paymentUrl: response.paymentUrl,
				};
			} else {
				// If no payment URL (e.g. total is 0 or system error), logic depends on business rules.
				// Assuming standard flow requires payment:
				throw new Error('Hệ thống không trả về đường dẫn thanh toán.');
			}
		} catch (err: any) {
			console.error('Checkout Error:', err);

			let apiError = 'Có lỗi xảy ra khi xử lý đơn hàng.';

			if (err.response) {
				try {
					const body = await err.response.json();
					apiError = body.summary || body.message || body.error || apiError;
				} catch (e) {
					/* ignore */
				}
			}

			return fail(500, { message: apiError });
		}
	},
} satisfies Actions;
