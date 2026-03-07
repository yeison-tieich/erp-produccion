import { PrismaClient, Prisma } from '@prisma/client';
import { anchoTiraData } from './ancho-tira-data';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando carga de ancho_tira para productos...\n');

  let actualizado = 0;
  let noEncontrado = 0;
  let sinDato = 0;

  for (const [sku, anchoTira] of Object.entries(anchoTiraData)) {
    // Si no hay datos de ancho de tira, saltar
    if (anchoTira === undefined) {
      sinDato++;
      continue;
    }

    try {
      // Intentar buscar por SKU primero
      let producto = await prisma.producto.findUnique({
        where: { sku_producto: sku },
      });

      // Si no encuentra por SKU, intentar por nombre
      if (!producto) {
        producto = await prisma.producto.findFirst({
          where: { nombre_producto: { contains: sku } },
        });
      }

      if (producto) {
        await prisma.producto.update({
          where: { id: producto.id },
          data: {
            ancho_tira: new Prisma.Decimal(anchoTira),
          },
        });
        actualizado++;
        console.log(`✓ [${sku}] → ${anchoTira} mm`);
      } else {
        noEncontrado++;
        console.log(`✗ No encontrado: [${sku}]`);
      }
    } catch (error) {
      console.error(`✗ Error procesando ${sku}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`✓ Actualizados: ${actualizado}`);
  console.log(`✗ No encontrados: ${noEncontrado}`);
  console.log(`⊘ Sin datos: ${sinDato}`);
  console.log(`Total procesados: ${Object.keys(anchoTiraData).length}`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});
