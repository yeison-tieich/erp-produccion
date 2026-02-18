
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const processesData = [
    {
        sku: 'MJ-OC-P1',
        rutas: [
            { no_operacion: 10, nombre_operacion: 'CORTE DE TIRA', centro_trabajo: 'GUILLOTINA' },
            { no_operacion: 20, nombre_operacion: 'TROQUELADO DE CONTORNO', centro_trabajo: 'TROQUELADORA' },
            { no_operacion: 30, nombre_operacion: 'PUNZONADO DE ORIFICIOS', centro_trabajo: 'TROQUELADORA' },
            { no_operacion: 40, nombre_operacion: 'DOBLADO 1 PATIN', centro_trabajo: 'DOBLADORA' },
            { no_operacion: 50, nombre_operacion: 'DOBLADO 2 PUNTILLA', centro_trabajo: 'DOBLADORA' },
            { no_operacion: 60, nombre_operacion: 'SOLDADURA DE PUNTO', centro_trabajo: 'SOLDADURA CORTE' },
            { no_operacion: 70, nombre_operacion: 'DOBLADO 3', centro_trabajo: 'DOBLADORA' },
            { no_operacion: 80, nombre_operacion: 'SUB-ENSAMBLE 1', centro_trabajo: 'ENSAMBLE' },
            { no_operacion: 90, nombre_operacion: 'GOLPE FORMADO', centro_trabajo: 'TROQUELADORA' },
            { no_operacion: 100, nombre_operacion: 'ENSAMBLE ABT-X', centro_trabajo: 'ENSAMBLE' }
        ]
    },
    {
        sku: '100110454',
        rutas: [
            { no_operacion: 10, nombre_operacion: 'CORTE DE TIRA', centro_trabajo: 'GUILLOTINA' },
            { no_operacion: 20, nombre_operacion: 'TROQUELADO CORTE MEDIDA', centro_trabajo: 'TROQUELADORA' },
            { no_operacion: 30, nombre_operacion: 'DESBARBADO', centro_trabajo: 'MANUAL' },
            { no_operacion: 40, nombre_operacion: 'TROQUELADO PUNZONADO', centro_trabajo: 'TROQUELADORA' },
            { no_operacion: 50, nombre_operacion: 'TROQUELADO DOBLES', centro_trabajo: 'TROQUELADORA' },
            { no_operacion: 60, nombre_operacion: 'DESBARBADO 2', centro_trabajo: 'MANUAL' },
            { no_operacion: 70, nombre_operacion: 'VERIFICACION Y EMPAQUE', centro_trabajo: 'CALIDAD' }
        ]
    }
];

async function main() {
    console.log('Importing Product Routes...');
    for (const data of processesData) {
        const product = await prisma.producto.findUnique({ where: { sku_producto: data.sku } });
        if (product) {
            console.log(`Updating routes for ${data.sku}...`);
            // Delete existing tasks first to avoid FK violation
            await prisma.tareaProduccion.deleteMany({
                where: { rutaFabricacion: { producto_id: product.id } }
            });
            // Delete existing routes for this product
            await prisma.rutaFabricacion.deleteMany({ where: { producto_id: product.id } });

            await prisma.rutaFabricacion.createMany({
                data: data.rutas.map(r => ({
                    ...r,
                    producto_id: product.id
                }))
            });
        } else {
            console.warn(`Product ${data.sku} not found.`);
        }
    }
    console.log('Finished importing product routes.');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
