import type { ChatMessage, ContentBlock, LlmProvider, LlmResponse } from '../types.js';

function extractAfterKeyword(text: string, keywords: string[]): string {
  for (const kw of keywords) {
    const idx = text.indexOf(kw);
    if (idx !== -1) return text.slice(idx + kw.length).trim();
  }
  return '';
}

function decideToolCall(userText: string): { name: string; input: Record<string, unknown> } | null {
  const text = userText.toLowerCase();

  if (/order|คำสั่งซื้อ/.test(text)) {
    return { name: 'get_customer_orders', input: {} };
  }
  if (/stock|สต๊อก|คงเหลือ/.test(text)) {
    const productName = extractAfterKeyword(text, ['stock', 'สต๊อก', 'คงเหลือ']) || 'a';
    return { name: 'check_stock', input: { productName } };
  }
  if (/sales|ยอดขาย/.test(text)) {
    const period = /today|วันนี้/.test(text) ? 'today' : /month|เดือน/.test(text) ? 'month' : 'week';
    return { name: 'get_sales_summary', input: { period } };
  }
  if (/product|สินค้า/.test(text)) {
    return { name: 'list_products', input: {} };
  }
  return null;
}

/**
 * Deterministic, no-network provider used for local development and testing
 * so the full webhook -> orchestrator -> tool-calling -> DB -> reply pipeline
 * can be exercised without an Anthropic API key.
 */
export class MockProvider implements LlmProvider {
  readonly name = 'mock';

  async chat(params: { messages: ChatMessage[] }): Promise<LlmResponse> {
    const lastMessage = params.messages[params.messages.length - 1];
    const toolResults = lastMessage.content.filter(
      (b): b is Extract<ContentBlock, { type: 'tool_result' }> => b.type === 'tool_result',
    );

    if (toolResults.length > 0) {
      const summary = toolResults.map((r) => r.content).join('\n');
      return { message: { role: 'assistant', content: [{ type: 'text', text: summary }] }, stopReason: 'end_turn' };
    }

    const userText = lastMessage.content
      .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join(' ');

    const toolCall = decideToolCall(userText);
    if (toolCall) {
      return {
        message: {
          role: 'assistant',
          content: [{ type: 'tool_use', id: `mock_${Date.now()}`, name: toolCall.name, input: toolCall.input }],
        },
        stopReason: 'tool_use',
      };
    }

    return {
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'ลองถามเกี่ยวกับสินค้า สต๊อก คำสั่งซื้อ หรือยอดขายได้เลยครับ' }],
      },
      stopReason: 'end_turn',
    };
  }
}
