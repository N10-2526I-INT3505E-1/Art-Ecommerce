import { Elysia } from 'elysia';
import amqp from 'amqplib';

// Use Environment Variables so you can change this in Docker/K8s later
const RABBIT_URL = process.env.RABBIT_URL || 'amqp://user:password@localhost:30159';

export const QUEUES = {
    PRODUCT_UPDATES: 'queue_product_updates',
    PAYMENT_PROCESS: 'queue_payment_process',
    ORDER_EXPIRY: 'queue_order_expiry',
    ORDER_EXPIRY_DLX: 'dlx_order_expiry' // Dead Letter Exchange
};

export const rabbitPlugin = async () => {
    try {
        const connection = await amqp.connect(RABBIT_URL);
        const channel = await connection.createChannel();
        
        // Assert standard queues
        await channel.assertQueue(QUEUES.PRODUCT_UPDATES, { durable: true });
        await channel.assertQueue(QUEUES.PAYMENT_PROCESS, { durable: true });

        // Setup Dead Letter Exchange for order expiry
        const dlx = QUEUES.ORDER_EXPIRY_DLX;
        const dlq = QUEUES.ORDER_EXPIRY;
        
        // Assert Dead Letter Exchange (DLX)
        await channel.assertExchange(dlx, 'direct', { durable: true });
        
        // Assert the final queue that will receive expired messages (after 15 minutes)
        await channel.assertQueue(dlq, {
            durable: true,
            arguments: {
                // When messages expire, they're re-routed here via the DLX
                'x-dead-letter-exchange': dlx,
                'x-dead-letter-routing-key': dlq
            }
        });
        
        // Bind the DLX to the final queue
        await channel.bindQueue(dlq, dlx, dlq);
        
        // Assert the temporary queue that will hold messages for 15 minutes
        const tempQueue = 'queue_order_expiry_temp';
        await channel.assertQueue(tempQueue, {
            durable: true,
            arguments: { 
                'x-message-ttl': 900000, // 15 minutes TTL
                // Route expired messages to the DLX
                'x-dead-letter-exchange': dlx,
                'x-dead-letter-routing-key': dlq
            }
        });

        return new Elysia()
            .decorate('sendToQueue', (queue: string, payload: any, options?: { delayMs?: number }) => {
                try {
                    return channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)));
                } catch (e) {
                    return false;
                }
            })
            .decorate('sendToQueueDelayed', (delayMs: number, payload: any) => {
                try {
                    // Send to temp queue with TTL
                    return channel.sendToQueue('queue_order_expiry_temp', Buffer.from(JSON.stringify(payload)));
                } catch (e) {
                    console.error('Failed to send delayed message:', e);
                    return false;
                }
            })
            // Expose channel so we can use .consume() in the listener service
            .decorate('rabbitChannel', channel);

    } catch (e) {
        console.error("RabbitMQ Connection Failed on Startup");
        process.exit(1); 
    }
};