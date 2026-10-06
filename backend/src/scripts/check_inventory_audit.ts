import prisma from '../prisma';

async function check() {
    const mpCount = await prisma.materiaPrima.count();
    const otCount = await prisma.ordenTrabajo.count();
    const movCount = await prisma.movimientoInventarioMP.count();
    
    const materials = await prisma.materiaPrima.findMany({
        take: 10,
        select: {
            id: true,
            sku_mp: true,
            nombre_mp: true,
            stock_actual: true,
            stock_reservado: true,
            punto_reorden: true
        }
    });

    const completedOTs = await prisma.ordenTrabajo.findMany({
        where: {
            estado_ot: { in: ['Completada', 'Cerrada', 'Finalizada'] }
        },
        include: {
            producto: {
                include: {
                    listaMateriales: {
                        include: { materiaPrima: true }
                    }
                }
            },
            materialesProyecto: true,
            movimientosInventario: true
        }
    });

    const completedWithoutConsumption = completedOTs.filter((ot: any) => {
        const hasConsumption = ot.movimientosInventario.some((m: any) => m.tipo_movimiento === 'CONSUMO_OT' || m.tipo_movimiento === 'CONSUMO');
        return !hasConsumption;
    });

    const completedWithPendingReservation = completedOTs.filter((ot: any) => {
        const reservations = ot.movimientosInventario.filter((m: any) => m.tipo_movimiento === 'RESERVA_OT' || m.tipo_movimiento === 'En proceso');
        const liberations = ot.movimientosInventario.filter((m: any) => m.tipo_movimiento === 'LIBERACION_RESERVA' || m.tipo_movimiento === 'CONSUMO_OT');
        const totalReserved = reservations.reduce((acc: number, r: any) => acc + Number(r.cantidad), 0);
        const totalReleased = liberations.reduce((acc: number, r: any) => acc + Math.abs(Number(r.cantidad)), 0);
        return totalReserved > totalReleased;
    });

    console.log('AUDIT_RESULT_START');
    console.log(JSON.stringify({
        mpCount,
        otCount,
        movCount,
        completedTotal: completedOTs.length,
        completedWithoutConsumptionCount: completedWithoutConsumption.length,
        completedWithPendingReservationCount: completedWithPendingReservation.length,
        materialsSample: materials,
        sampleWithoutConsumption: completedWithoutConsumption.slice(0, 5).map((o: any) => ({
            id: o.id,
            numero_ot: o.numero_ot,
            estado_ot: o.estado_ot,
            producto: o.producto?.nombre_producto,
            materialsInBOM: o.producto?.listaMateriales?.length || 0,
            movimientosCount: o.movimientosInventario.length,
            movimientosTipos: o.movimientosInventario.map((m: any) => m.tipo_movimiento)
        }))
    }, null, 2));
    console.log('AUDIT_RESULT_END');
}

check().catch(console.error).finally(() => prisma.$disconnect());
