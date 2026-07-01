import { listProducts } from '../../db/repositories/productRepository.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../types.js';

export const definition: ToolDefinition = {
  name: 'list_products',
  description: 'List products, optionally filtered by category or a search term matching name/SKU. Returns price and stock level for each product.',
  inputSchema: {
    type: 'object',
    properties: {
      category: { type: 'string', description: 'Filter by exact category name' },
      search: { type: 'string', description: 'Search term matched against product name or SKU' },
    },
  },
};

export async function handler(input: Record<string, unknown>, _ctx: ToolContext): Promise<ToolResult> {
  const products = await listProducts({
    category: typeof input.category === 'string' ? input.category : undefined,
    search: typeof input.search === 'string' ? input.search : undefined,
  });

  if (products.length === 0) {
    return { content: 'No products found matching the given filters.' };
  }

  const lines = products.map(
    (p) =>
      `${p.name} (SKU: ${p.sku}, category: ${p.category ?? 'n/a'}) - price ${p.unitPrice.toString()}, stock: ${p.stock?.quantityOnHand ?? 0}`,
  );
  return { content: lines.join('\n') };
}
