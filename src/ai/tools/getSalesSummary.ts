import { getOrdersInRange } from '../../db/repositories/orderRepository.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../types.js';

export const definition: ToolDefinition = {
  name: 'get_sales_summary',
  description: 'Summarize sales totals for a time period, optionally grouped by day, category, or product. Cancelled orders are excluded.',
  inputSchema: {
    type: 'object',
    properties: {
      period: { type: 'string', enum: ['today', 'week', 'month'], description: 'Time window to summarize' },
      groupBy: { type: 'string', enum: ['day', 'category', 'product'], description: 'How to break down the totals' },
    },
    required: ['period'],
  },
};

function getDateRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);
  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    start.setDate(start.getDate() - 30);
  } else {
    start.setDate(start.getDate() - 7);
  }
  return { start, end };
}

export async function handler(input: Record<string, unknown>, _ctx: ToolContext): Promise<ToolResult> {
  const period = typeof input.period === 'string' ? input.period : 'week';
  const groupBy = typeof input.groupBy === 'string' ? input.groupBy : undefined;

  const { start, end } = getDateRange(period);
  const orders = await getOrdersInRange(start, end);
  const validOrders = orders.filter((o) => o.status !== 'CANCELLED');

  if (validOrders.length === 0) {
    return { content: `No sales recorded for the ${period}.` };
  }

  const totalAmount = validOrders.reduce((sum, o) => sum + o.totalAmount.toNumber(), 0);
  const header = `Sales summary (${period}): ${validOrders.length} orders, total ${totalAmount.toFixed(2)}.`;

  if (!groupBy) {
    return { content: header };
  }

  const buckets = new Map<string, number>();
  for (const order of validOrders) {
    if (groupBy === 'day') {
      const key = order.createdAt.toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + order.totalAmount.toNumber());
      continue;
    }
    for (const item of order.items) {
      const key = groupBy === 'category' ? (item.product.category ?? 'Uncategorized') : item.product.name;
      buckets.set(key, (buckets.get(key) ?? 0) + item.subtotal.toNumber());
    }
  }

  const breakdown = [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, amount]) => `  - ${key}: ${amount.toFixed(2)}`)
    .join('\n');

  return { content: `${header}\nBreakdown by ${groupBy}:\n${breakdown}` };
}
