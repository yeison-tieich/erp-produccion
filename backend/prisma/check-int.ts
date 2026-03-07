import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(){
  const p = await prisma.producto.findUnique({ where: { sku_producto: 'INT-01' } });
  console.log(p);
  await prisma.$disconnect();
}

main();