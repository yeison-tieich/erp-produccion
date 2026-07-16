import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ots = await prisma.ordenTrabajo.findMany({
    where: {
      imagen_url: {
        contains: '192.168.2.26:3000',
      },
    },
  });
  
  console.log(`Found ${ots.length} ots with old image URLs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
