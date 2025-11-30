import {
    ConflictError,
    InternalServerError,
    NotFoundError,
    UnauthorizedError,
} from '@common/errors/httpErrors';
import { Elysia, t } from 'elysia';
import { paymentsTable, schema } from './payment.model';
import { db as mainDb } from './db';
import { eq } from 'drizzle-orm';
import { createVNPPaymentUrl } from './paymentHandle/vnpayPaymentHandle';
import crypto from 'crypto';
import { stringify } from 'qs';
import { main, randomUUIDv7 } from 'bun';
import {sql} from "drizzle-orm";

type DbClient = typeof mainDb;

export class PaymentService {
    private db: DbClient;
    private paymentsTable: typeof schema.paymentsTable;

    constructor(db?: DbClient) {
        this.db = db || mainDb;
        this.paymentsTable = schema.paymentsTable;
    }

    createPayment = async (order_id: number, amount: number, payment_gateway: string) => {
        try {
        const transactionId = Bun.randomUUIDv7();
            const [newPayment] = await this.db.transaction(async (tx) => {
            const result = await tx.insert(this.paymentsTable)
                .values({
                    order_id: order_id,
                    amount: amount.toString(),
                    payment_gateway: payment_gateway,
                    transaction_id: transactionId,
                    status: 'pending'
                })
                .returning(); // Return the newly created record

            return result;
        });

        if (newPayment == null) {
				throw new Error('Payment initialization failed.');
		}
        const paymentUrl = createVNPPaymentUrl(Number(newPayment.amount), newPayment.transaction_id || '');
        const apiResponse = {
				id: newPayment.id,
				order_id: newPayment.order_id,
				amount: newPayment.amount, // Numeric is returned as a string
				payment_gateway: newPayment.payment_gateway,
				status: newPayment.status,
				transaction_id: newPayment.transaction_id,
				paymentUrl: (await paymentUrl),
			};
        return apiResponse;
        } catch (error) {
            console.error('Transaction failed:', error);
            throw new InternalServerError('Payment create failed')
        }
    }

    async updatePaymentStatus(id: number, status: 'completed' | 'failed' | 'cancelled' | 'pending') {
        try {
        const [updatedPayment] = await this.db.update(this.paymentsTable)
            .set({ status: status })
            .where(eq(this.paymentsTable.id, id))
            .returning();

        if (!updatedPayment) {
            throw new NotFoundError(`Payment with ID ${id} not found.`);
        }
        

        return updatedPayment;
        } catch (error) {
            console.error('Failed to update payment status:', error);
            throw new InternalServerError('Failed to update payment status');
        }
    }

    async getPaymentById(id: number) {
        try {
        const payment = await this.db.query.paymentsTable.findFirst({
				where: eq(this.paymentsTable.id, Number(id))
			});
        if (!payment) {
            throw new NotFoundError(`Payment with ID ${id} not found.`);
        }
        return payment;
        } catch (error) {
            console.error('Failed to retrieve payment:', error);
            throw new InternalServerError('Failed to retrieve payment');
        }
    }
}

// Helper function to sort object keys
function sortObject(obj: Record<string, any>): Record<string, any> {
	const sorted: Record<string, any> = {};
	const keys = Object.keys(obj).sort();
	for (const key of keys) {
		sorted[key] = obj[key];
	}
	return sorted;
}

export class PaymentIPN {

    private db: typeof mainDb;
    private paymentsTable: typeof schema.paymentsTable;

    constructor(db: typeof mainDb) {
        this.db = db;
        this.paymentsTable = schema.paymentsTable;
    }
    
    async handleVnpayIpn(query: Record<string, any>) {
        try {
            const vnp_Params = { ...query };
            const secureHash = vnp_Params['vnp_SecureHash'] as string;
            delete vnp_Params['vnp_SecureHash'];
            delete vnp_Params['vnp_SecureHashType'];

            const sortedParams = sortObject(vnp_Params);
            const secretKey = process.env.VNPAY_HASH_SECRET || '';
            const signData = stringify(sortedParams, { encode: false });
            const hmac = crypto.createHmac('sha512', secretKey);
            const signed = hmac.update(signData).digest('hex');

            if (secureHash !== signed) {
                return {
                    RspCode: '97',
                    Message: 'Fail checksum'
                }
            };

            const orderId = vnp_Params['vnp_TxnRef'] as string;
            const rspCode = vnp_Params['vnp_ResponseCode'] as string;
            const amount = vnp_Params['vnp_Amount'] as string;

            // Find the payment record by order ID
            const foundPayment = await this.db.query.paymentsTable.findFirst({
                where: eq(this.paymentsTable.order_id, Number(orderId))
            });

            if (!foundPayment) {
                return {
                    RspCode: '01',
                    Message: 'Order not found'
                };
            }

            // Verify amount
            const expectedAmount = Number(foundPayment.amount) * 100; // VNPay amount is in smallest currency unit
            if (Number(amount) !== expectedAmount) {
                return {
                    RspCode: '04',
                    Message: 'Invalid amount'
                };
            }

            // Check if order is already confirmed
            if (foundPayment.status === 'paid') {
                return {
                    RspCode: '02',
                    Message: 'Order already confirmed'
                };
            }

            // Update payment status based on response code
            if (rspCode === '00') {
                await this.db.update(this.paymentsTable)
                    .set({ status: 'paid' })
                    .where(eq(this.paymentsTable.id, foundPayment.id));

                return {
                    RspCode: '00',
                    Message: 'success'
                };
            }
        } catch (error) {
            console.error(`VNPay IPN error: ${error}`);
            return {
                RspCode: '99',
                Message: 'Unknown error'
            };
        }
    }
}