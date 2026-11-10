import prisma from '../src/prisma';

async function main() {
  const movs = await prisma.movimientoProducto.findMany({
    orderBy: { id: 'asc' },
    include: {
      producto: true
    }
  });

  console.log(`TOTAL MOVEMENTS: ${movs.length}`);
  const byRef = new Map<string, typeof movs>();
  for (const m of movs) {
    const key = `${m.producto_id}|${m.referencia || 'NO_REF'}`;
    if (!byRef.has(key)) byRef.set(key, []);
    byRef.get(key)!.push(m);
  }

  const duplicates = [];
  for (const [key, list] of byRef.entries()) {
    if (list.length > 1) {
      duplicates.push({
        key,
        referencia: list[0].referencia,
        producto: `${list[0].producto.sku_producto} - ${list[0].producto.nombre_producto}`,
        stock_actual_producto: list[0].producto.stock_actual,
        movements: list.map(m => ({ id: m.id, tipo: m.tipo_movimiento, cantidad: m.cantidad, fecha: m.fecha }))
      });
    }
  }

  console.log('ALL DUPLICATE MOVEMENTS REPORT:');
  console.log(JSON.stringify(duplicates, null, 2));
}

main().finally(() => process.exit(0));
