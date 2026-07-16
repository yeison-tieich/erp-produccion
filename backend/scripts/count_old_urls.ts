import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.producto.findMany({
    where: {
      imagen_url: {
        contains: '192.168.2.26:3000',
      },
    },
  });
  
  console.log(`Found ${products.length} products with old image URLs.`);

  const productsPdf = await prisma.producto.findMany({
    where: {
      plano_pdf_url: {
        contains: '192.168.2.26:3000',
      },
    },
  });

  console.log(`Found ${productsPdf.length} products with old PDF URLs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
