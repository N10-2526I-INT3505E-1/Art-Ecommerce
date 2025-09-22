// src/services/paymentService.ts

// This interface can be simplified as we no longer pass the full order

export interface PaymentIntentResponse {
	success: boolean;
	paymentUrl?: string;
	transactionId?: string;
	error?: string;
}

/**
 * Simulates calling an external payment processor.
 */
export const createPaymentUrlFromProvider = async (amount:string): Promise<PaymentIntentResponse> => {

	// Simulate network delay
	await new Promise(resolve => setTimeout(resolve, 500));

	// Simulate a failure from the processor

	// On success, generate a fake URL and transaction ID
	const fakeTransactionId = `pi_${Date.now()}_${amount}`;
	const fakePaymentUrl = `https://mock-payment-processor.com/pay/${fakeTransactionId}`;

	return {
		success: true,
		paymentUrl: fakePaymentUrl,
		transactionId: fakeTransactionId,
	};
};