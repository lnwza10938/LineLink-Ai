import { findCustomerByLineUserId, findCustomerByName } from '../../db/repositories/customerRepository.js';
import { listOrdersForCustomer } from '../../db/repositories/orderRepository.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../types.js';

export const definition: ToolDefinition = {
  name: 'get_customer_orders',
  description:
    "List recent orders for a customer. If no customerName is given, looks up the order history for the LINE user who sent the current message (use this for phrases like 'my orders').",
  inputSchema: {
    type: 'object',
    properties: {
      customerName: { type: 'string', description: 'Customer name to search for' },
    },
  },
};

export async function handler(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const customerName = typeof input.customerName === 'string' ? input.customerName : undefined;

  const customer = customerName
    ? await findCustomerByName(customerName)
    : await findCustomerByLineUserId(ctx.lineUserId);

  if (!customer) {
    return { content: 'No matching customer found.', isError: true };
  }

  const orders = await listOrdersForCustomer(customer.id);
  if (orders.length === 0) {
    return { content: `${customer.name} has no orders yet.` };
  }

  const lines = orders.map((o) => {
    const itemSummary = o.items.map((i) => `${i.product.name} x${i.quantity}`).join(', ');
    return `${o.orderNumber} [${o.status}] on ${o.createdAt.toISOString().slice(0, 10)} - total ${o.totalAmount.toString()} (${itemSummary})`;
  });

  return { content: `Orders for ${customer.name}:\n${lines.join('\n')}` };
}
