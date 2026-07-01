import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    LINE_CHANNEL_SECRET: z.string().min(1).optional().default(''),
    LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1).optional().default(''),
    LINE_DRY_RUN: z
      .string()
      .optional()
      .default('false')
      .transform((v) => v === 'true'),

    AI_PROVIDER: z.enum(['anthropic', 'mock']).default('mock'),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default('claude-opus-4-8'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    PORT: z
      .string()
      .optional()
      .default('3000')
      .transform((v) => Number.parseInt(v, 10)),
  })
  .refine((data) => data.AI_PROVIDER !== 'anthropic' || !!data.ANTHROPIC_API_KEY, {
    message: 'ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic',
    path: ['ANTHROPIC_API_KEY'],
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

const env = parsed.data;

export const config = {
  port: env.PORT,
  line: {
    channelSecret: env.LINE_CHANNEL_SECRET,
    channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
    dryRun: env.LINE_DRY_RUN,
  },
  ai: {
    provider: env.AI_PROVIDER,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    anthropicModel: env.ANTHROPIC_MODEL,
  },
  databaseUrl: env.DATABASE_URL,
} as const;
