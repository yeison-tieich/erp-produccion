
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const password = await bcrypt.hash('123456', 10)

    // Users
    const admin = await prisma.usuario.upsert({
        where: { email: 'admin@controlmt.com' },
        update: {},
        create: {
            nombre: 'Administrador General',
            email: 'admin@controlmt.com',
            password_hash: password,
            rol: 'Administrador',
        },
    })

    const supervisor = await prisma.usuario.upsert({
        where: { email: 'supervisor@controlmt.com' },
        update: {},
        create: {
            nombre: 'Supervisor Planta',
            email: 'supervisor@controlmt.com',
            password_hash: password,
            rol: 'Supervisor',
        },
    })

    const operario = await prisma.usuario.upsert({
        where: { email: 'operario@controlmt.com' },
        update: {},
        create: {
            nombre: 'Juan Operario',
            email: 'operario@controlmt.com',
            password_hash: password,
            rol: 'Operario',
        },
    })

    // Materials
    const lamina = await prisma.materiaPrima.create({
        data: {
            sku_mp: 'MP-LAM-001',
            nombre_mp: 'Lámina Acero Calibre 18',
            categoria_mp: 'Lámina',
            unidad_medida_stock: 'Láminas',
            stock_actual: 100,
            punto_reorden: 20
        }
    })

    const soldadura = await prisma.materiaPrima.create({
        data: {
            sku_mp: 'MP-SOL-001',
            nombre_mp: 'Electrodo 6013 1/8',
            categoria_mp: 'Consumible',
            unidad_medida_stock: 'Kg',
            stock_actual: 50,
            punto_reorden: 10
        }
    })

    // Product
    const puerta = await prisma.producto.create({
        data: {
            sku_producto: 'PT-STD-001',
            nombre_producto: 'Puerta Metálica Standard 2.10x0.90',
            descripcion: 'Puerta de seguridad básica',
            rutas: {
                create: [
                    { no_operacion: 10, nombre_operacion: 'Corte', centro_trabajo: 'Guillotina' },
                    { no_operacion: 20, nombre_operacion: 'Doblado', centro_trabajo: 'Dobladora' },
                    { no_operacion: 30, nombre_operacion: 'Soldadura', centro_trabajo: 'Estación Soldadura 1' },
                    { no_operacion: 40, nombre_operacion: 'Acabado', centro_trabajo: 'Pintura' },
                ]
            },
            listaMateriales: {
                create: [
                    { materia_prima_id: lamina.id, cantidad_requerida: 2 }, // 2 sheets per door? Just demo.
                    { materia_prima_id: soldadura.id, cantidad_requerida: 0.5 },
                ]
            }
        }
    })

    console.log({ admin, supervisor, operario, puerta })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
