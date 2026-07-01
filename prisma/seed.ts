import { PrismaClient, OrderStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const PRODUCT_CATEGORIES = ['Beverages', 'Snacks', 'Bakery', 'Dairy', 'Household'];
const ORDER_STATUSES: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'CANCELLED'];

async function main() {
  console.log('Seeding database...');

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryStock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();

  const products = [];
  for (let i = 0; i < 15; i++) {
    const product = await prisma.product.create({
      data: {
        sku: `SKU-${faker.string.alphanumeric(6).toUpperCase()}`,
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        category: faker.helpers.arrayElement(PRODUCT_CATEGORIES),
        unitPrice: faker.commerce.price({ min: 10, max: 500 }),
        stock: {
          create: {
            quantityOnHand: faker.number.int({ min: 0, max: 200 }),
            reorderLevel: faker.number.int({ min: 5, max: 20 }),
          },
        },
      },
    });
    products.push(product);
  }

  const customers = [];
  for (let i = 0; i < 10; i++) {
    const customer = await prisma.customer.create({
      data: {
        name: faker.person.fullName(),
        phone: faker.phone.number(),
        email: faker.internet.email(),
        // First 3 customers are "linked" to a LINE account so
        // get_customer_orders has real data to look up by lineUserId.
        lineUserId: i < 3 ? `U${faker.string.alphanumeric(32)}` : null,
      },
    });
    customers.push(customer);
  }

  for (let i = 0; i < 25; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const itemCount = faker.number.int({ min: 1, max: 4 });
    const items = faker.helpers.arrayElements(products, itemCount).map((product) => {
      const quantity = faker.number.int({ min: 1, max: 5 });
      const unitPrice = product.unitPrice;
      const subtotal = unitPrice.toNumber() * quantity;
      return { product, quantity, unitPrice, subtotal };
    });
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    await prisma.order.create({
      data: {
        orderNumber: `ORD-${faker.string.numeric(8)}`,
        customerId: customer.id,
        status: faker.helpers.arrayElement(ORDER_STATUSES),
        totalAmount,
        createdAt: faker.date.recent({ days: 30 }),
        items: {
          create: items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
      },
    });
  }

  console.log(`Seeded ${products.length} products, ${customers.length} customers, 25 orders.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
