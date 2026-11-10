import prisma from '../src/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('================================================================');
  console.log('    AUDITORÍA FORENSE DE REGISTROS DUPLICADOS HISTÓRICOS        ');
  console.log('================================================================\n');

  // Obtener todos los movimientos PRODUCCION_OT
  const movs = await prisma.movimientoProducto.findMany({
    where: { tipo_movimiento: 'PRODUCCION_OT' },
    include: {
      producto: true
    },
    orderBy: { fecha: 'asc' }
  });

  // Agrupar por producto y referencia (número OT)
  const byOt = new Map<string, typeof movs>();
  for (const m of movs) {
    if (!m.referencia) continue;
    const key = `${m.producto_id}|${m.referencia}`;
    if (!byOt.has(key)) byOt.set(key, []);
    byOt.get(key)!.push(m);
  }

  const duplicatesReport: any[] = [];

  for (const [key, list] of byOt.entries()) {
    if (list.length > 1) {
      const ref = list[0].referencia;
      const ot = await prisma.ordenTrabajo.findUnique({
        where: { numero_ot: ref! },
        include: {
          tareas: {
            include: { rutaFabricacion: true }
          }
        }
      });

      const totalIngresado = list.reduce((sum, m) => sum + m.cantidad, 0);
      const primeraCantidad = list[0].cantidad;
      const esDuplicadoExacto = list.length === 2 && list[0].cantidad === list[1].cantidad;
      
      const diffMs = list.length > 1 
        ? new Date(list[1].fecha).getTime() - new Date(list[0].fecha).getTime()
        : 0;

      // Cantidad que debió ingresar:
      const tareaEmpaque = ot?.tareas.find(t => 
        t.rutaFabricacion?.nombre_operacion?.toUpperCase().includes('VERIFICAC') ||
        t.rutaFabricacion?.nombre_operacion?.toUpperCase().includes('EMPAQUE')
      );
      const cantidadEsperada = Number(tareaEmpaque?.cantidad_buena || ot?.cantidad_fabricar || primeraCantidad);
      const exceso = totalIngresado - cantidadEsperada;

      duplicatesReport.push({
        ot_id: ot?.id,
        numero_ot: ref,
        producto_id: list[0].producto_id,
        sku_producto: list[0].producto.sku_producto,
        nombre_producto: list[0].producto.nombre_producto,
        stock_actual_actual: list[0].producto.stock_actual,
        cantidad_fabricar_ot: ot?.cantidad_fabricar,
        cantidad_buena_empaque: tareaEmpaque?.cantidad_buena,
        cantidad_esperada: cantidadEsperada,
        total_ingresado_stock: totalIngresado,
        exceso_duplicado: exceso,
        diferencia_milisegundos: diffMs,
        es_duplicado_simultaneo_300ms: Math.abs(diffMs) < 1000,
        movimientos: list.map(m => ({
          id: m.id,
          cantidad: m.cantidad,
          fecha: m.fecha,
          referencia: m.referencia
        }))
      });
    }
  }

  console.log(`Órdenes con entradas duplicadas encontradas: ${duplicatesReport.length}`);
  console.log(JSON.stringify(duplicatesReport, null, 2));

  // Guardar respaldo JSON
  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `backup_duplicados_${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(duplicatesReport, null, 2), 'utf8');
  console.log(`\n✓ Respaldo forense guardado en: ${backupFile}`);

  // Verificar si se solicita aplicar corrección
  const args = process.argv.slice(2);
  const shouldApply = args.includes('--apply');

  if (shouldApply) {
    console.log('\n--- APLICANDO CORRECCIÓN CONTROLADA DE STOCK EXCEDENTE ---');
    for (const item of duplicatesReport) {
      if (item.exceso_duplicado > 0) {
        console.log(`Corrigiendo Producto ${item.sku_producto} (ID ${item.producto_id}): Descontando exceso de ${item.exceso_duplicado} uds...`);
        
        await prisma.$transaction(async (tx) => {
          // Descontar exceso de stock
          await tx.producto.update({
            where: { id: item.producto_id },
            data: { stock_actual: { decrement: item.exceso_duplicado } }
          });

          // Registrar movimiento de ajuste de corrección
          await tx.movimientoProducto.create({
            data: {
              producto_id: item.producto_id,
              orden_trabajo_id: item.ot_id,
              tipo_movimiento: 'CORRECCION_DUPLICADO',
              cantidad: -item.exceso_duplicado,
              referencia: item.numero_ot,
              idempotency_key: `CORR_DUP_${item.numero_ot}_${item.movimientos[1].id}`,
              usuario: 'Auditoría Automática',
              observacion: `Ajuste correctivo por duplicación de entrada en ${item.numero_ot}. Exceso revertido: -${item.exceso_duplicado} uds.`
            }
          });
        });
        console.log(`✓ Producto ${item.sku_producto} corregido con éxito.`);
      }
    }
    console.log('✓ Corrección completada.');
  } else {
    console.log('\n[MODO REPORTE] No se realizaron modificaciones en la base de datos.');
    console.log('Para aplicar la corrección controlada respaldada, ejecute: npx ts-node scripts/reconciliation-report.ts --apply');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => process.exit(0));
