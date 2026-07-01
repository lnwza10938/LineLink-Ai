import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../../src/db/prismaClient.js';
import { handler } from '../../src/ai/tools/checkStock.js';

describe('check_stock tool', () => {
  it('returns the correct stock quantity for a seeded product', async () => {
    const product = await prisma.product.findFirst({ include: { stock: true } });
    expect(product).not.toBeNull();
    if (!product) return;

    const result = await handler({ productName: product.name }, { lineUserId: 'test-user', sourceType: 'user' });

    expect(result.isError).toBeFalsy();
    expect(result.content).toContain(product.name);
    expect(result.content).toContain(String(product.stock?.quantityOnHand ?? 0));
  });

  it('returns an error for a product that does not exist', async () => {
    const result = await handler(
      { productName: 'zzz_definitely_not_a_seeded_product_zzz' },
      { lineUserId: 'test-user', sourceType: 'user' },
    );

    expect(result.isError).toBe(true);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
