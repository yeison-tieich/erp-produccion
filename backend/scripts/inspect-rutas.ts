import prisma from '../src/prisma';

async function main() {
  const prod150 = await prisma.producto.findUnique({
    where: { id: 150 },
    include: { rutas: true }
  });
  console.log('PROD 150 RUTAS:', prod150?.rutas);

  const prod58 = await prisma.producto.findUnique({
    where: { id: 58 },
    include: { rutas: true }
  });
  console.log('PROD 58 RUTAS:', prod58?.rutas);

  const prod158 = await prisma.producto.findUnique({
    where: { id: 158 },
    include: { rutas: true }
  });
  console.log('PROD 158 RUTAS:', prod158?.rutas);
}

main().finally(() => process.exit(0));
