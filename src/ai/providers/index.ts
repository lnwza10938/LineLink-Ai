import { config } from '../../config/env.js';
import type { LlmProvider } from '../types.js';
import { AnthropicProvider } from './anthropicProvider.js';
import { MockProvider } from './mockProvider.js';

export function getLlmProvider(): LlmProvider {
  switch (config.ai.provider) {
    case 'anthropic':
      return new AnthropicProvider(config.ai.anthropicApiKey!, config.ai.anthropicModel);
    case 'mock':
      return new MockProvider();
  }
}
