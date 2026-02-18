const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    try {
        console.log('🔍 Verificando datos en la base de datos...\n');

        const productos = await prisma.producto.count();
        console.log(`📦 Productos: ${productos}`);

        const ordenes = await prisma.ordenTrabajo.count();
        console.log(`📋 Órdenes: ${ordenes}`);

        const personal = await prisma.personal.count();
        console.log(`👥 Personal: ${personal}`);

        const maquinas = await prisma.maquina.count();
        console.log(`⚙️  Máquinas: ${maquinas}`);

        const materiasPrimas = await prisma.materiaPrima.count();
        console.log(`🧱 Materias Primas: ${materiasPrimas}`);

        const clientes = await prisma.cliente.count();
        console.log(`🏢 Clientes: ${clientes}`);

        console.log('\n✅ Verificación completada');

        if (ordenes > 0) {
            console.log('\n📊 Primeras 3 órdenes:');
            const primerasOrdenes = await prisma.ordenTrabajo.findMany({
                take: 3,
                include: { producto: true }
            });
            primerasOrdenes.forEach(o => {
                console.log(`  - OT ${o.numero_ot}: ${o.producto?.nombre_producto || 'Sin producto'} (${o.estado_ot})`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
