import { Elysia } from 'elysia';
import amqp from 'amqplib';

// Use Environment Variables so you can change this in Docker/K8s later
const RABBIT_URL = process.env.RABBIT_URL || 'amqp://localhost';

export const QUEUES = {
	PRODUCT_UPDATES: 'queue_product_updates',
};

export const rabbitPlugin = async () => {
	try {
		const connection = await amqp.connect(RABBIT_URL);
		const channel = await connection.createChannel();

		// Assert queues to ensure they exist
		await channel.assertQueue(QUEUES.PRODUCT_UPDATES, { durable: true });

		return (
			new Elysia()
				.decorate('sendToQueue', (queue: string, payload: any) => {
					try {
						return channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)));
					} catch (e) {
						return false;
					}
				})
				// Expose channel so we can use .consume() in the listener service
				.decorate('rabbitChannel', channel)
		);
	} catch (e) {
		console.error('RabbitMQ Connection Failed on Startup');
		process.exit(1);
	}
};
