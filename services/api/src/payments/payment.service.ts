import {
    InternalServerError,
    NotFoundError,
} from '@common/errors/httpErrors';
import { randomUUIDv7 } from 'bun';
import crypto from 'crypto';
import { eq, or } from 'drizzle-orm';
import { stringify } from 'qs';
import { schema } from './payment.model';
import { createVNPPaymentUrl } from './paymentHandle/vnpayPaymentHandle';

type DbClient = any; 

export class PaymentService {
    private db: DbClient;
    private paymentsTable: typeof schema.paymentsTable;

    // Bắt buộc truyền db vào constructor, không có default value là mainDb nữa
    constructor(db: DbClient) {
        this.db = db;
        this.paymentsTable = schema.paymentsTable;
    }

    createPayment = async (order_id: number, amount: number, payment_gateway: string) => {
        try {
            // Check if order_id exists
            const exitsPayment = await this.db.query.paymentsTable.findFirst({
                where: eq(this.paymentsTable.order_id, Number(order_id))
            });
            if (exitsPayment) {
                throw new Error(` Payment for order_id ${order_id} already exists.`);
            }
            const transactionId = randomUUIDv7();
            const [newPayment] = await this.db.transaction(async (tx: any) => {
                const result = await tx.insert(this.paymentsTable)
                    .values({
                        order_id: order_id,
                        amount: amount.toString(),
                        payment_gateway: payment_gateway,
                        transaction_id: transactionId,
                        status: 'pending'
                    })
                    .returning();
                return result;
            });

            if (newPayment == null) {
                throw new Error('Payment initialization failed.');
            }
            
            const paymentUrl = await createVNPPaymentUrl(Number(newPayment.amount), newPayment.transaction_id || '');
            
            const apiResponse = {
                id: newPayment.id,
                order_id: newPayment.order_id,
                amount: newPayment.amount,
                payment_gateway: newPayment.payment_gateway,
                status: newPayment.status,
                transaction_id: newPayment.transaction_id,
                paymentUrl: paymentUrl,
            };
            return apiResponse;
        } catch (error) {
            console.error('Transaction failed:', error);
            throw new InternalServerError('Payment create failed:' + (error as Error).message);
        }
    }

    async updatePaymentStatus(id: number, status: 'completed' | 'failed' | 'cancelled' | 'pending') {
        try {
            const [updatedPayment] = await this.db.update(this.paymentsTable)
                .set({ 
                    status: status,
                })
                .where(eq(this.paymentsTable.id, id))
                .returning();

            if (!updatedPayment) {
                throw new NotFoundError(`Payment with ID ${id} not found.`);
            }

            return updatedPayment;
        } catch (error) {
            // Nếu lỗi là NotFoundError thì ném tiếp, còn lại ném InternalServerError
            if (error instanceof NotFoundError) throw error;
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
            if (error instanceof NotFoundError) throw error;
            console.error('Failed to retrieve payment:', error);
            throw new InternalServerError('Failed to retrieve payment');
        }
    }
}

// Helper function
function sortObject(obj: Record<string, any>): Record<string, any> {
    const sorted: Record<string, any> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
        sorted[key] = obj[key];
    }
    return sorted;
}

export class PaymentIPN {
    private db: DbClient;
    private paymentsTable: typeof schema.paymentsTable;

    constructor(db: DbClient) {
        this.db = db;
        this.paymentsTable = schema.paymentsTable;
    }

    async handleVnpayIpn(query: Record<string, any>) {
        try {
            const vnp_Params = { ...query };
            console.log('VNPay IPN received params:', vnp_Params);
            const secureHash = vnp_Params['vnp_SecureHash'] as string;
            delete vnp_Params['vnp_SecureHash'];
            delete vnp_Params['vnp_SecureHashType'];

            const sortedParams = sortObject(vnp_Params);
            // Mocking secret key behavior for testing or prod
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

            const transactionId = vnp_Params['vnp_TxnRef'] as string;
            if (!transactionId) {
                return {
                    RspCode: '01',
                    Message: 'Missing transaction reference'
                };
            }
            const rspCode = vnp_Params['vnp_ResponseCode'] as string;
            const amount = vnp_Params['vnp_Amount'] as string;

            const foundPayment = await this.db.query.paymentsTable.findFirst({
                where: eq(this.paymentsTable.transaction_id, transactionId)
            });

            if (!foundPayment) {
                return {
                    RspCode: '01',
                    Message: 'Order not found'
                };
            }

            const expectedAmount = Number(foundPayment.amount) * 100;
            if (Number(amount) !== expectedAmount) {
                return {
                    RspCode: '04',
                    Message: 'Invalid amount'
                };
            }

            if (foundPayment.status === 'paid') {
                return {
                    RspCode: '02',
                    Message: 'Order already confirmed'
                };
            }

            if (rspCode === '00') {
                const [updatedPayment] = await this.db.update(this.paymentsTable)
                .set({ 
                    status: 'completed',
                })
                .where(eq(this.paymentsTable.id, foundPayment.id))
                .returning();
                //console.log(`Payment with transaction ID ${updatedPayment.transaction_id} marked as completed.`);
                const orderId = updatedPayment?.order_id;
                //console.log(`Associated Order ID: ${orderId}`);
                return {
                    RspCode: '00',
                    Message: 'success',
                    orderId: orderId
                };
            }
            
            // Trường hợp thất bại từ VNPay nhưng checksum đúng
            return {
                 RspCode: rspCode,
                 Message: 'Payment failed from VNPay side'
            };

        } catch (error) {
            console.error(`VNPay IPN error: ${error}`);
            return {
                RspCode: '99',
                Message: 'Unknown error'
            };
        }
    }
}