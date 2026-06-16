import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const productos = await prisma.producto.findMany({
    where: { imagen_url: { not: null } }
  });
  
  const urls = productos.map(p => p.imagen_url);
  const ips = urls.map(url => {
    const match = url?.match(/http:\/\/([0-9\.]+):/);
    return match ? match[1] : null;
  }).filter(ip => ip !== null);
  
  const uniqueIps = [...new Set(ips)];
  console.log('Unique IPs found in DB:', uniqueIps);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
