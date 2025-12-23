import { date } from 'drizzle-orm/mysql-core';
import { PAYMENT_ENDPOINT, VNP_VERSION } from 'vnpay/constants';
import { HashAlgorithm, ProductCode, VnpLocale } from 'vnpay/enums';
import { dateFormat, resolveUrlString } from 'vnpay/utils';
import { VNPay } from 'vnpay/vnpay';

const vnp_TmnCode = process.env.VNP_TMNCODE || '';
const vnp_HashSecret = process.env.VNP_HASHSECRET || '';

const vnpay = new VNPay({
	tmnCode: vnp_TmnCode,
	secureSecret: vnp_HashSecret,
	vnpayHost: 'https://sandbox.vnpayment.vn',
	queryDrAndRefundHost: 'https://sandbox.vnpayment.vn', // tùy chọn, trường hợp khi url của querydr và refund khác với url khởi tạo thanh toán (thường sẽ sử dụng cho production)

	testMode: true, // tùy chọn, ghi đè vnpayHost thành sandbox nếu là true
	// hashAlgorithm: 'SHA512', // tùy chọn

	/**
	 * Bật/tắt ghi log
	 * Nếu enableLog là false, loggerFn sẽ không được sử dụng trong bất kỳ phương thức nào
	 */
	enableLog: true, // tùy chọn

	/**
	 * Hàm `loggerFn` sẽ được gọi để ghi log khi enableLog là true
	 * Mặc định, loggerFn sẽ ghi log ra console
	 * Bạn có thể cung cấp một hàm khác nếu muốn ghi log vào nơi khác
	 *
	 * `ignoreLogger` là một hàm không làm gì cả
	 */
	// loggerFn: ignoreLogger, // tùy chọn

	/**
	 * Tùy chỉnh các đường dẫn API của VNPay
	 * Thường không cần thay đổi trừ khi:
	 * - VNPay cập nhật đường dẫn của họ
	 * - Có sự khác biệt giữa môi trường sandbox và production
	 */
	endpoints: {
		paymentEndpoint: 'paymentv2/vpcpay.html',
		queryDrRefundEndpoint: 'merchant_webapi/api/transaction',
		getBankListEndpoint: 'qrpayauth/api/merchant/get_bank_list',
	}, // tùy chọn
});

export const createVNPPaymentUrl = async (amount: number, id: string): Promise<string> => {
	console.log('Creating VNPay payment URL for transaction ID:', id, 'with amount:', amount);
	const createDate = new Date(new Date().getTime() + 7 * 60 * 60 * 1000); // GMT+7
	const expireDate = new Date(createDate.getTime() + 15 * 60 * 1000); // 15 minutes later
	const paymentUrl = vnpay.buildPaymentUrl({
		vnp_Amount: amount,
		vnp_IpAddr: '1.1.1.1',
		vnp_TxnRef: id,
		vnp_OrderInfo: 'Thanh toan don hang ' + id,
		vnp_OrderType: ProductCode.Other,
		//vnp_ReturnUrl: 'https://www.google.com/',
		vnp_ReturnUrl: 'https://novus.io.vn/orders',
		vnp_Locale: VnpLocale.VN, // 'vn' hoặc 'en'
		vnp_CreateDate: dateFormat(createDate), // tùy chọn, mặc định là thời gian hiện tại
		vnp_ExpireDate: dateFormat(expireDate), // tùy chọn
	});

	return paymentUrl;
};

