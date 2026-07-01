import { Router, type ErrorRequestHandler } from 'express';
import { middleware, SignatureValidationFailed, type webhook } from '@line/bot-sdk';
import { config } from '../config/env.js';
import { lineClient } from './client.js';
import { handleUserMessage } from '../ai/orchestrator.js';
import { logger } from '../utils/logger.js';
import type { ToolContext } from '../ai/types.js';

export const lineRouter = Router();

lineRouter.post(
  '/webhook',
  middleware({ channelSecret: config.line.channelSecret }),
  async (req, res) => {
    const body = req.body as webhook.CallbackRequest;
    await Promise.all((body.events ?? []).map(handleEvent));
    res.status(200).json({});
  },
);

// Signature verification failures must be reported as 401, not fall through
// to Express's default 500 handler.
const handleSignatureError: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof SignatureValidationFailed) {
    logger.warn('Rejected webhook request with invalid signature');
    res.status(401).json({ error: 'invalid signature' });
    return;
  }
  next(err);
};
lineRouter.use(handleSignatureError);

async function handleEvent(event: webhook.Event): Promise<void> {
  // MVP scope: only handle text messages. Other event types (images, Flex
  // replies, follow/join, etc.) are logged for future extension.
  if (event.type !== 'message' || event.message.type !== 'text' || !event.replyToken) {
    logger.info(`Ignoring unsupported event type: ${event.type}`);
    return;
  }

  const sourceType = (event.source?.type ?? 'user') as ToolContext['sourceType'];
  const lineUserId = event.source?.type === 'user' ? (event.source.userId ?? 'unknown') : 'unknown';

  const replyText = await handleUserMessage(event.message.text, { lineUserId, sourceType });

  if (config.line.dryRun) {
    logger.info(`[DRY RUN] Would reply: ${replyText}`);
    return;
  }

  await lineClient.replyMessage({
    replyToken: event.replyToken,
    messages: [{ type: 'text', text: replyText }],
  });
}
