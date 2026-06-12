const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching data for offline seed...');

    const timestamp = Date.now();
    const result = {
        materiaPrima: [],
        ordenTrabajo: []
    };

    // 1. Fetch Materia Prima
    const materiasPrimas = await prisma.materiaPrima.findMany();
    for (const mp of materiasPrimas) {
        result.materiaPrima.push({
            id_local: crypto.randomUUID(),
            id_server: mp.id,
            sku_mp: mp.sku_mp,
            nombre_mp: mp.nombre_mp,
            categoria_mp: mp.categoria_mp,
            unidad_medida_stock: mp.unidad_medida_stock,
            stock_actual: Number(mp.stock_actual) || 0,
            stock_reservado: Number(mp.stock_reservado) || 0,
            devoluciones: Number(mp.devoluciones) || 0,
            punto_reorden: Number(mp.punto_reorden) || 0,
            espesor: Number(mp.espesor) || 0,
            ancho: Number(mp.ancho) || 0,
            largo: Number(mp.largo) || 0,
            densidad: Number(mp.densidad) || 7.85,
            peso_unitario: Number(mp.peso_unitario) || 0,
            costo_unitario: Number(mp.costo_unitario) || 0,
            sync_status: 'synced',
            updated_at: timestamp,
            deleted: 0,
            version: 1
        });
    }

    // 2. Fetch Ordenes de Trabajo
    const ordenes = await prisma.ordenTrabajo.findMany({
        where: { estado_ot: { not: 'Completada' } } // Only export active orders? Or all? Let's export all for offline completeness
    });

    for (const ot of ordenes) {
        result.ordenTrabajo.push({
            id_local: crypto.randomUUID(),
            id_server: ot.id,
            numero_ot: ot.numero_ot,
            tipo_orden: ot.tipo_orden || 'PRODUCCION_SERIE',
            producto_id: ot.producto_id,
            cantidad_pedido: ot.cantidad_pedido || 0,
            cantidad_fabricar: ot.cantidad_fabricar || 0,
            descripcion_proyecto: ot.descripcion_proyecto || '',
            cliente: ot.cliente || '',
            orden_compra_cliente: ot.orden_compra_cliente || '',
            prioridad: ot.prioridad || 'ESTANDAR',
            estado_ot: ot.estado_ot || 'Pendiente',
            fecha_entrega_req: ot.fecha_entrega_req ? ot.fecha_entrega_req.toISOString() : null,
            sync_status: 'synced',
            updated_at: timestamp,
            deleted: 0,
            version: 1
        });
    }

    // 3. Fetch Productos
    const productos = await prisma.producto.findMany({
        where: { activo: true },
        include: { cliente: true }
    });

    result.producto = [];
    for (const p of productos) {
        result.producto.push({
            id_local: crypto.randomUUID(),
            id_server: p.id,
            sku_producto: p.sku_producto,
            nombre_producto: p.nombre_producto,
            descripcion: p.descripcion || '',
            cliente_id: p.cliente_id,
            cliente_nombre: p.cliente?.nombre || '',
            acabado: p.acabado || '',
            imagen_url: p.imagen_url || '',
            stock_actual: p.stock_actual || 0,
            ancho_tira: Number(p.ancho_tira) || 0,
            medidas_pieza: p.medidas_pieza || '',
            piezas_lamina_4x8: p.piezas_lamina_4x8 || '',
            piezas_lamina_2x1: p.piezas_lamina_2x1 || '',
            empaque_de: p.empaque_de || '',
            ubicacion: p.ubicacion || '',
            plano_pdf_url: p.plano_pdf_url || '',
            activo: p.activo ? 1 : 0,
            precio_venta: Number(p.precio_venta) || 0,
            sync_status: 'synced',
            updated_at: timestamp,
            deleted: 0,
            version: 1
        });
    }

    const outputPath = path.resolve(__dirname, '../../frontend/public/seed.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    
    console.log(`✅ Seed successfully generated at: ${outputPath}`);
    console.log(`- Materias Primas: ${result.materiaPrima.length}`);
    console.log(`- Órdenes de Trabajo: ${result.ordenTrabajo.length}`);
    console.log(`- Productos: ${result.producto.length}`);
}

main()
    .catch((e) => {
        console.error('Error generating seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
