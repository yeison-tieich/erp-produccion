import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const productos = await prisma.producto.findMany({ 
    where: {
      imagen_url: { not: null }
    },
    take: 5 
  });
  console.log(productos.map(p => p.imagen_url));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
