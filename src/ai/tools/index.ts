import type { ToolContext, ToolDefinition, ToolResult } from '../types.js';
import * as listProducts from './listProducts.js';
import * as checkStock from './checkStock.js';
import * as getCustomerOrders from './getCustomerOrders.js';
import * as getSalesSummary from './getSalesSummary.js';

interface RegisteredTool {
  definition: ToolDefinition;
  handler: (input: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
}

const tools: Record<string, RegisteredTool> = {
  [listProducts.definition.name]: listProducts,
  [checkStock.definition.name]: checkStock,
  [getCustomerOrders.definition.name]: getCustomerOrders,
  [getSalesSummary.definition.name]: getSalesSummary,
};

export const toolDefinitions: ToolDefinition[] = Object.values(tools).map((t) => t.definition);

export async function executeTool(name: string, input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const tool = tools[name];
  if (!tool) {
    return { content: `Unknown tool: ${name}`, isError: true };
  }
  try {
    return await tool.handler(input, ctx);
  } catch (err) {
    return { content: `Tool ${name} failed: ${(err as Error).message}`, isError: true };
  }
}
