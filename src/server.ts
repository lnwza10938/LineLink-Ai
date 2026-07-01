import express from 'express';
import { config } from './config/env.js';
import { lineRouter } from './line/webhook.js';
import { logger } from './utils/logger.js';

const app = express();

// The LINE webhook middleware needs the raw request body to verify the
// X-Line-Signature header, so it must be mounted before express.json().
app.use('/', lineRouter);

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(config.port, () => {
  logger.info(`LineLink AI server listening on port ${config.port}`);
});
