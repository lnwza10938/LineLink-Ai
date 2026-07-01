import { prisma } from '../prismaClient.js';

export function listOrdersForCustomer(customerId: string, limit = 10) {
  return prisma.order.findMany({
    where: { customerId },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export function getOrdersInRange(start: Date, end: Date) {
  return prisma.order.findMany({
    where: { createdAt: { gte: start, lte: end } },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'asc' },
  });
}
