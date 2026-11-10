import prisma from '../src/prisma';

async function main() {
  const products = await prisma.producto.findMany({
    include: {
      rutas: {
        orderBy: { no_operacion: 'asc' }
      }
    }
  });

  const lastOps = new Map<string, number>();
  for (const p of products) {
    if (p.rutas.length > 0) {
      const last = p.rutas[p.rutas.length - 1];
      const name = last.nombre_operacion;
      lastOps.set(name, (lastOps.get(name) || 0) + 1);
    }
  }

  console.log('LAST OPERATIONS IN PRODUCT ROUTES:');
  for (const [name, count] of lastOps.entries()) {
    console.log(`- ${name}: ${count} products`);
  }
}

main().finally(() => process.exit(0));
