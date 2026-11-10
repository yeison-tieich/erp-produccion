import prisma from '../src/prisma';

async function main() {
  const cat = await prisma.operacionCatalog.findMany();
  console.log('CATALOG:', cat.map((c: any) => c.nombre_operacion));
  
  const rutas = await prisma.rutaFabricacion.findMany({
    select: { nombre_operacion: true },
    distinct: ['nombre_operacion']
  });
  console.log('RUTAS:', rutas.map((r: any) => r.nombre_operacion));
}

main().finally(() => process.exit(0));
