import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { InternalServerError, NotFoundError } from '@common/errors/httpErrors';
import crypto from 'node:crypto';
import { stringify } from 'qs';

// 1. MOCK CÁC MODULE BÊN NGOÀI
const mockTx = {
	insert: mock(() => ({
		values: mock(() => ({
			returning: mock(() => []),
		})),
	})),
};
const mockDbClient = {
	transaction: mock(async (cb: any) => cb(mockTx)),
	update: mock(() => ({
		set: mock(() => ({
			where: mock(() => ({
				returning: mock(() => []),
			})),
		})),
	})),
	query: {
		paymentsTable: {
			findFirst: mock(() => Promise.resolve(null)),
		},
	},
};
mock.module('./db', () => ({ db: mockDbClient }));
mock.module('./paymentHandle/vnpayPaymentHandle', () => ({
	createVNPPaymentUrl: mock(() => Promise.resolve('https://sandbox.vnpayment.vn/payment_url')),
}));
mock.module('./payment.model', () => ({
	schema: {
		paymentsTable: { id: 'id', order_id: 'order_id', transaction_id: 'transaction_id' },
	},
}));

// 2. IMPORT SERVICE SAU KHI ĐÃ MOCK
import { PaymentIPN, PaymentService } from '@payment/payment.service';

// Helper để tạo chữ ký VNPay hợp lệ
const createValidVnpayQuery = (secret: string, params: Record<string, any>) => {
	const sortedParams: Record<string, any> = {};
	Object.keys(params)
		.sort()
		.forEach((key) => {
			sortedParams[key] = params[key];
		});
	const signData = stringify(sortedParams, { encode: false });
	const hmac = crypto.createHmac('sha512', secret);
	const signed = hmac.update(signData).digest('hex');
	return { ...params, vnp_SecureHash: signed };
};

describe('PaymentService', () => {
	let service: PaymentService;

	beforeEach(() => {
		mock.restore();
		service = new PaymentService(mockDbClient as any);
	});

	// Sửa lỗi typo: "Tạo sản phẩm" -> "Tạo thanh toán"
	describe('Tạo thanh toán (Create Payment)', () => {
		test('TC-PAY-01: Tạo thanh toán mới với thông tin hợp lệ, DB hoạt động bình thường', async () => {
			const mockNewPayment = {
				id: 1,
				order_id: 100,
				amount: '50000',
				payment_gateway: 'vnpay',
				transaction_id: 'trans-123',
				status: 'pending',
			};
			mockTx.insert = mock(() => ({
				values: mock(() => ({ returning: mock(() => [mockNewPayment]) })),
			}));

			const result = await service.createPayment(100, 50000, 'vnpay');

			expect(result).toHaveProperty('id', 1);
			expect(result).toHaveProperty('paymentUrl');
			expect(result.status).toBe('pending');
		});

		test('TC-PAY-02: Tạo thanh toán thất bại do lỗi DB', async () => {
			mockDbClient.transaction = mock(() => {
				throw new Error('DB Connection Failed');
			});
			service = new PaymentService(mockDbClient as any);

			await expect(service.createPayment(100, 50000, 'vnpay')).rejects.toThrow(
				new InternalServerError('Payment create failed'),
			);
		});

		test('TC-PAY-03: Tạo thanh toán nhưng DB không trả về bản ghi (newPayment == null)', async () => {
			mockTx.insert = mock(() => ({
				values: mock(() => ({ returning: mock(() => []) })), // Trả về mảng rỗng
			}));

			await expect(service.createPayment(100, 50000, 'vnpay')).rejects.toThrow(
				new InternalServerError('Payment create failed'),
			);
		});
	});

	describe('Cập nhật trạng thái thanh toán (Update Status)', () => {
		test('TC-PAY-04: Cập nhật trạng thái thành công khi input là ID có tồn tại', async () => {
			const mockUpdatedPayment = { id: 1, status: 'completed' };
			mockDbClient.update = mock(() => ({
				set: mock(() => ({ where: mock(() => ({ returning: mock(() => [mockUpdatedPayment]) })) })),
			}));

			const result = await service.updatePaymentStatus(1, 'completed');
			expect(result).toEqual(mockUpdatedPayment);
		});

		test('TC-PAY-05: Ném lỗi NotFoundError khi cập nhật trạng thái với ID không tồn tại', async () => {
			mockDbClient.update = mock(() => ({
				set: mock(() => ({ where: mock(() => ({ returning: mock(() => []) })) })),
			}));

			await expect(service.updatePaymentStatus(999, 'completed')).rejects.toThrow(
				new NotFoundError('Payment with ID 999 not found.'),
			);
		});

		test('TC-PAY-06: Ném lỗi InternalServerError khi cập nhật thất bại do lỗi kết nối DB', async () => {
			mockDbClient.update = mock(() => {
				throw new Error('DB Error');
			});

			await expect(service.updatePaymentStatus(1, 'completed')).rejects.toThrow(
				new InternalServerError('Failed to update payment status'),
			);
		});
	});

	describe('Lấy thông tin thanh toán (Get Payment)', () => {
		test('TC-PAY-07: Lấy thông tin thành công khi input là ID có tồn tại', async () => {
			const mockPayment = { id: 1, amount: '10000' };
			mockDbClient.query.paymentsTable.findFirst = mock(() => Promise.resolve(mockPayment));

			const result = await service.getPaymentById(1);
			expect(result).toEqual(mockPayment);
		});

		test('TC-PAY-08: Ném lỗi NotFoundError khi lấy thông tin với ID không tồn tại', async () => {
			mockDbClient.query.paymentsTable.findFirst = mock(() => Promise.resolve(null));

			await expect(service.getPaymentById(999)).rejects.toThrow(
				new NotFoundError('Payment with ID 999 not found.'),
			);
		});

		test('TC-PAY-09: Ném lỗi InternalServerError khi lấy thông tin thất bại do lỗi kết nối DB', async () => {
			mockDbClient.query.paymentsTable.findFirst = mock(() =>
				Promise.reject(new Error('DB Error')),
			);

			await expect(service.getPaymentById(1)).rejects.toThrow(
				new InternalServerError('Failed to retrieve payment'),
			);
		});
	});
});

describe('Xử lý IPN VNPAY (PaymentIPN Handler)', () => {
	let paymentIPN: PaymentIPN;
	const secretKey = 'MOCK_SECRET_KEY';

	beforeEach(() => {
		mock.restore();
		process.env.VNPAY_HASH_SECRET = secretKey;
		paymentIPN = new PaymentIPN(mockDbClient as any);
	});

	afterEach(() => {
		delete process.env.VNPAY_HASH_SECRET;
	});

	test('TC-PAY-10: Xử lý IPN thành công và cập nhật trạng thái thanh toán', async () => {
		const txnRef = 'valid-transaction-id';
		const query = createValidVnpayQuery(secretKey, {
			vnp_TxnRef: txnRef,
			vnp_Amount: '1000000',
			vnp_ResponseCode: '00',
		});
		mockDbClient.query.paymentsTable.findFirst = mock((args: any) => {
			if (args.where.right.value === txnRef) {
				return Promise.resolve({
					id: 1,
					transaction_id: txnRef,
					amount: '10000',
					status: 'pending',
				});
			}
			return Promise.resolve(null);
		});
		mockDbClient.update = mock(() => ({
			set: mock(() => ({ where: mock(() => Promise.resolve()) })),
		}));

		const result = await paymentIPN.handleVnpayIpn(query);
		expect(result).toEqual({ RspCode: '00', Message: 'success' });
		expect(mockDbClient.update).toHaveBeenCalled();
	});

	test('TC-PAY-11: Xử lý IPN thất bại khi checksum không hợp lệ', async () => {
		const query = { vnp_TxnRef: '123', vnp_SecureHash: 'fake_hash' };
		const result = await paymentIPN.handleVnpayIpn(query);
		expect(result).toEqual({ RspCode: '97', Message: 'Fail checksum' });
	});

	test('TC-PAY-12: Xử lý IPN thất bại khi transaction (vnp_TxnRef) không tồn tại', async () => {
		const query = createValidVnpayQuery(secretKey, { vnp_TxnRef: 'not-found-id' });
		mockDbClient.query.paymentsTable.findFirst = mock(() => Promise.resolve(null)); // Không tìm thấy

		const result = await paymentIPN.handleVnpayIpn(query);
		expect(result).toEqual({ RspCode: '01', Message: 'Order not found' });
	});

	test('TC-PAY-13: Xử lý IPN thất bại khi số tiền không khớp', async () => {
		const query = createValidVnpayQuery(secretKey, { vnp_TxnRef: '123', vnp_Amount: '2000000' });
		mockDbClient.query.paymentsTable.findFirst = mock(() => Promise.resolve({ amount: '10000' }));

		const result = await paymentIPN.handleVnpayIpn(query);
		expect(result).toEqual({ RspCode: '04', Message: 'Invalid amount' });
	});

	test('TC-PAY-14: Xử lý IPN thất bại khi đơn hàng đã được xác nhận trước đó', async () => {
		const query = createValidVnpayQuery(secretKey, { vnp_TxnRef: '123', vnp_Amount: '1000000' });
		mockDbClient.query.paymentsTable.findFirst = mock(
			() => Promise.resolve({ amount: '10000', status: 'paid' }), // Trạng thái đã thanh toán
		);

		const result = await paymentIPN.handleVnpayIpn(query);
		expect(result).toEqual({ RspCode: '02', Message: 'Order already confirmed' });
	});

	test('TC-PAY-15: Xử lý IPN thất bại do lỗi DB không xác định', async () => {
		const query = createValidVnpayQuery(secretKey, { vnp_TxnRef: '123' });
		mockDbClient.query.paymentsTable.findFirst = mock(() =>
			Promise.reject(new Error('Unexpected DB Error')),
		);

		const result = await paymentIPN.handleVnpayIpn(query);
		expect(result).toEqual({ RspCode: '99', Message: 'Unknown error' });
	});
});
