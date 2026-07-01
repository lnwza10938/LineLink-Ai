import { findProductByNameOrSku } from '../../db/repositories/productRepository.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../types.js';

export const definition: ToolDefinition = {
  name: 'check_stock',
  description: 'Check the current stock quantity for a product by name or SKU (partial match supported).',
  inputSchema: {
    type: 'object',
    properties: {
      productName: { type: 'string', description: 'Product name or SKU (or a fragment of it) to look up' },
    },
    required: ['productName'],
  },
};

export async function handler(input: Record<string, unknown>, _ctx: ToolContext): Promise<ToolResult> {
  const productName = typeof input.productName === 'string' ? input.productName : '';
  const product = await findProductByNameOrSku(productName);

  if (!product) {
    return { content: `No product found matching "${productName}".`, isError: true };
  }

  const quantity = product.stock?.quantityOnHand ?? 0;
  const reorderLevel = product.stock?.reorderLevel ?? 0;
  const lowStockNote = quantity <= reorderLevel ? ' (at or below reorder level)' : '';

  return {
    content: `${product.name} (SKU: ${product.sku}): ${quantity} units in stock${lowStockNote}.`,
  };
}
