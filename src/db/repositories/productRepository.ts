import { prisma } from '../prismaClient.js';

export function listProducts(params: { category?: string; search?: string }) {
  return prisma.product.findMany({
    where: {
      category: params.category ? { equals: params.category, mode: 'insensitive' } : undefined,
      OR: params.search
        ? [
            { name: { contains: params.search, mode: 'insensitive' } },
            { sku: { contains: params.search, mode: 'insensitive' } },
          ]
        : undefined,
    },
    include: { stock: true },
    orderBy: { name: 'asc' },
    take: 20,
  });
}

export function findProductByNameOrSku(query: string) {
  return prisma.product.findFirst({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: { stock: true },
  });
}
