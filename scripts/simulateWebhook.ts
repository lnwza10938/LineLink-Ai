import 'dotenv/config';
import crypto from 'node:crypto';

const port = process.env.PORT ?? '3000';
const channelSecret = process.env.LINE_CHANNEL_SECRET ?? '';
const messageText = process.argv[2] ?? 'แสดงสินค้าทั้งหมด';

const payload = {
  destination: 'U0000000000000000000000000000000',
  events: [
    {
      type: 'message',
      mode: 'active',
      timestamp: Date.now(),
      source: { type: 'user', userId: 'Usimulateduser0000000000000000' },
      webhookEventId: crypto.randomUUID(),
      deliveryContext: { isRedelivery: false },
      replyToken: crypto.randomBytes(16).toString('hex'),
      message: {
        id: crypto.randomBytes(8).toString('hex'),
        type: 'text',
        text: messageText,
      },
    },
  ],
};

const body = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', channelSecret).update(body).digest('base64');

async function main() {
  console.log(`POST http://localhost:${port}/webhook`);
  console.log(`message: "${messageText}"`);

  const response = await fetch(`http://localhost:${port}/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Line-Signature': signature,
    },
    body,
  });

  console.log(`status: ${response.status}`);
  console.log(await response.text());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
