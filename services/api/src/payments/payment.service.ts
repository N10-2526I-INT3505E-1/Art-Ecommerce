import {
    ConflictError,
    InternalServerError,
    NotFoundError,
    UnauthorizedError,
} from '@common/errors/httpErrors';
import { Elysia, t } from 'elysia';
import { paymentsTable } from './payment.model';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { createVNPPaymentUrl } from './paymentHandle/vnpayPaymentHandle';
import { createPaymentBodySchema, paymentResponseSchema, errorResponseSchema, updatePaymentBodySchema, updatePaymentParamsSchema, updatePaymentResponseSchema } from './payment.model';
import { IpnFailChecksum, IpnOrderNotFound, IpnInvalidAmount, InpOrderAlreadyConfirmed, IpnUnknownError, IpnSuccess } from 'vnpay';
import type { VerifyReturnUrl } from 'vnpay';
import crypto from 'crypto';
import { stringify } from 'qs';
import { randomUUIDv7 } from 'bun';

type DbClient = typeof db

export class PaymentService {
    private db: DbClient;

    constructor(db: DbClient) {
        this.db = db;
    }

    async createPayment(order_id: number, amount: number, payment_gateway: string) {
        try {
        const transactionId = Bun.randomUUIDv7();
            const [newPayment] = await db.transaction(async (tx) => {
            const result = await tx.insert(paymentsTable)
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
}