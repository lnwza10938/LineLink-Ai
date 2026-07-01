import { getLlmProvider } from './providers/index.js';
import { executeTool, toolDefinitions } from './tools/index.js';
import type { ChatMessage, ContentBlock, ToolContext } from './types.js';

const MAX_TOOL_ITERATIONS = 5;

const SYSTEM_PROMPT = `You are LineLink AI, an assistant for staff who manage business data (products, stock, customers, orders) entirely through LINE chat.
Interpret the user's request, use the available tools to fetch real data, and reply with a concise, natural-language summary in the same language the user wrote in (Thai or English).
Never invent data that wasn't returned by a tool. If a tool returns no results or an error, say so plainly.`;

function extractText(message: ChatMessage): string {
  return message.content
    .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

export async function handleUserMessage(userText: string, ctx: ToolContext): Promise<string> {
  const provider = getLlmProvider();
  const messages: ChatMessage[] = [{ role: 'user', content: [{ type: 'text', text: userText }] }];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await provider.chat({ system: SYSTEM_PROMPT, messages, tools: toolDefinitions });
    messages.push(response.message);

    if (response.stopReason !== 'tool_use') {
      return extractText(response.message) || 'ขออภัย ไม่สามารถประมวลผลคำขอได้ในขณะนี้';
    }

    const toolUses = response.message.content.filter(
      (b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use',
    );

    const results: ContentBlock[] = [];
    for (const toolUse of toolUses) {
      const result = await executeTool(toolUse.name, toolUse.input, ctx);
      results.push({
        type: 'tool_result',
        toolUseId: toolUse.id,
        content: result.content,
        isError: result.isError,
      });
    }
    messages.push({ role: 'user', content: results });
  }

  return 'ขออภัย ระบบใช้เวลาประมวลผลนานเกินไป กรุณาลองใหม่อีกครั้ง';
}
