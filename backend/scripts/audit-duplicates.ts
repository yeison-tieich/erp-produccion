import prisma from '../src/prisma';

async function main() {
  console.log('--- AUDITORÍA DE MOVIMIENTOS DE PRODUCTO TERMINADO ---');
  
  // 1. Obtener todos los movimientos de producto
  const movimientos = await prisma.movimientoProducto.findMany({
    include: {
      producto: {
        select: {
          id: true,
          sku_producto: true,
          nombre_producto: true,
          stock_actual: true
        }
      }
    },
    orderBy: { fecha: 'desc' }
  });

  console.log(`Total de movimientos de producto encontrados: ${movimientos.length}`);

  // 2. Buscar movimientos agrupados por producto y referencia
  const movimientosPorReferencia: { [key: string]: typeof movimientos } = {};
  for (const m of movimientos) {
    const refKey = `${m.producto_id}_${m.referencia || 'SIN_REF'}_${m.tipo_movimiento}`;
    if (!movimientosPorReferencia[refKey]) {
      movimientosPorReferencia[refKey] = [];
    }
    movimientosPorReferencia[refKey].push(m);
  }

  const posiblesDuplicados: any[] = [];
  for (const [key, list] of Object.entries(movimientosPorReferencia)) {
    if (list.length > 1 && list[0].tipo_movimiento === 'PRODUCCION_OT') {
      posiblesDuplicados.push({
        key,
        referencia: list[0].referencia,
        producto: list[0].producto,
        cantidad_movimientos: list.length,
        movimientos: list.map(m => ({
          id: m.id,
          cantidad: m.cantidad,
          fecha: m.fecha,
          referencia: m.referencia
        }))
      });
    }
  }

  console.log('\n--- POSIBLES DUPLICADOS ENCONTRADOS ---');
  console.log(JSON.stringify(posiblesDuplicados, null, 2));

  // 3. Revisar órdenes de trabajo completadas y sus cantidades
  const ots = await prisma.ordenTrabajo.findMany({
    where: {
      producto_id: { not: null }
    },
    include: {
      producto: true,
      tareas: {
        include: {
          rutaFabricacion: true
        }
      }
    },
    orderBy: { id: 'desc' },
    take: 30
  });

  console.log('\n--- ÚLTIMAS 30 ÓRDENES CON PRODUCTO ---');
  for (const ot of ots) {
    const movsOt = movimientos.filter(m => m.referencia === ot.numero_ot);
    const sumMovs = movsOt.reduce((acc, m) => acc + m.cantidad, 0);
    const tareasEmpaque = ot.tareas.filter(t => 
      t.rutaFabricacion?.nombre_operacion?.toUpperCase().includes('EMPAQUE') ||
      t.rutaFabricacion?.nombre_operacion?.toUpperCase().includes('VERIFICAC')
    );
    console.log({
      id: ot.id,
      numero_ot: ot.numero_ot,
      estado_ot: ot.estado_ot,
      producto: ot.producto?.nombre_producto,
      cantidad_fabricar: ot.cantidad_fabricar,
      cantidad_aprobada: ot.cantidad_aprobada,
      tareas_empaque_count: tareasEmpaque.length,
      tareas_empaque_buena: tareasEmpaque.map(t => ({
        id: t.id,
        nombre: t.rutaFabricacion?.nombre_operacion,
        estado: t.estado_tarea,
        buena: t.cantidad_buena,
        mala: t.cantidad_mala
      })),
      movimientos_en_producto: movsOt.map(m => ({ id: m.id, tipo: m.tipo_movimiento, cant: m.cantidad, fecha: m.fecha })),
      total_ingresado_stock: sumMovs
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
