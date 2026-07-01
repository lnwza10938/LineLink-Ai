import { prisma } from '../prismaClient.js';

export function findCustomerByLineUserId(lineUserId: string) {
  return prisma.customer.findUnique({ where: { lineUserId } });
}

export function findCustomerByName(name: string) {
  return prisma.customer.findFirst({
    where: { name: { contains: name, mode: 'insensitive' } },
  });
}
