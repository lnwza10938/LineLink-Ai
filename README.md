# LineLink AI

An enterprise data assistant that lives entirely inside LINE: staff send natural-language commands or questions in a LINE chat, an AI interprets them, fetches the relevant data via tool-calling, and replies with a concise summary.

This repo is a **scaffold**, not a finished product. It ships with a realistic mock database (products, stock, customers, orders) that mirrors what a POS system would look like, so the full pipeline — LINE → AI → database → LINE — can be proven end-to-end before any real business data exists. The data layer (`src/db/`) is isolated behind repository functions so it can later be pointed at a real POS database without touching the LINE or AI layers.

## Architecture

```
LINE chat → LINE webhook (Express + @line/bot-sdk signature verification)
          → AI orchestrator (tool-calling loop against a pluggable LlmProvider)
          → tool registry (list_products, check_stock, get_customer_orders, get_sales_summary)
          → Prisma repositories → PostgreSQL
          → natural-language reply → LINE
```

The AI provider is abstracted behind `LlmProvider` (`src/ai/types.ts`). It ships with:
- `AnthropicProvider` — calls the Claude API with tool-calling.
- `MockProvider` — deterministic keyword matching, no network calls, used for local testing.

Switch between them with the `AI_PROVIDER` env var. Adding another vendor (or a local model) later means adding one more provider file, not rewriting the app.

## Prerequisites

- Node.js 22+
- Docker (for PostgreSQL via `docker-compose.yml`) — or any local PostgreSQL 16 instance

## Setup

```bash
npm install
cp .env.example .env

docker compose up -d          # starts PostgreSQL
npm run prisma:migrate        # creates the schema
npm run prisma:seed           # populates fake products/customers/orders

npm run dev                   # starts the server on PORT (default 3000)
```

## Local testing without a real LINE channel or Anthropic key

Set in `.env`:
```
AI_PROVIDER=mock
LINE_DRY_RUN=true
```

With the dev server running, in another terminal:
```bash
npm run simulate -- "แสดงสินค้าทั้งหมด"
npm run simulate -- "check stock for <product name>"
npm run simulate -- "my orders"
npm run simulate -- "สรุปยอดขายสัปดาห์นี้"
```

`scripts/simulateWebhook.ts` builds a LINE webhook payload and signs it with a real HMAC-SHA256 signature (using `LINE_CHANNEL_SECRET`), then POSTs it to `/webhook` — exercising the exact same signature-verification path a real LINE webhook would. With `LINE_DRY_RUN=true` the computed reply is logged instead of sent via the LINE API, so this validates the full webhook → AI orchestrator → tool-calling → Prisma → reply pipeline with zero external dependencies.

Set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY=...` to validate the same flow with real Claude tool-calling.

Run the unit test suite (exercises a tool directly against the seeded DB, no network):
```bash
npm test
```

## Connecting a real LINE channel

1. Create a Messaging API channel in the [LINE Developers Console](https://developers.line.biz/console/).
2. Copy the **Channel secret** into `LINE_CHANNEL_SECRET`, and issue a long-lived **Channel access token** into `LINE_CHANNEL_ACCESS_TOKEN`.
3. Expose your local server, e.g. `ngrok http 3000`.
4. In the channel's Messaging API settings, set the webhook URL to `https://<your-ngrok-domain>/webhook`, enable "Use webhook", and disable the default auto-reply messages.
5. Set `LINE_DRY_RUN=false` and message the bot from LINE.

## Project layout

```
prisma/schema.prisma   Data model (Customer, Product, InventoryStock, Order, OrderItem)
prisma/seed.ts          Fake POS-like sample data
src/config/env.ts       Validated environment config
src/db/                 Prisma client + repositories (the only layer that knows about Postgres)
src/ai/types.ts         Vendor-neutral LlmProvider / ChatMessage / tool types
src/ai/providers/       AnthropicProvider, MockProvider, and the factory that picks one
src/ai/tools/           Tool definitions + handlers (list_products, check_stock, get_customer_orders, get_sales_summary)
src/ai/orchestrator.ts  The tool-calling loop
src/line/               LINE webhook signature verification, event handling, and the reply client
scripts/simulateWebhook.ts  Signed fake LINE webhook for local testing
tests/                  Vitest unit tests
```

## Extending toward a real POS integration

- Replace `src/db/repositories/*` (and `prisma/schema.prisma` if needed) with queries against the real POS database — `src/ai/` and `src/line/` don't need to change.
- Add new tools in `src/ai/tools/` and register them in `src/ai/tools/index.ts`.
- If AI responses become slow under real tool workloads, switch from `replyMessage` (reply token, must respond within the webhook request) to acking the webhook immediately and sending the answer via `pushMessage` instead — see `src/line/webhook.ts`.
