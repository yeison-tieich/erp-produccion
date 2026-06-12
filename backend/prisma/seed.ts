
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

    const pass7 = await bcrypt.hash('MT2026*', 10)

    const newUsers = [
        { email: 'gerencia@controlmt.com', nombre: 'Gerencia General', rol: 'Gerencia' },
        { email: 'produccion@controlmt.com', nombre: 'Director Producción', rol: 'Producción' },
        { email: 'almacen@controlmt.com', nombre: 'Jefe Almacén', rol: 'Almacén' },
        { email: 'contabilidad@controlmt.com', nombre: 'Contabilidad', rol: 'Contabilidad' },
        { email: 'compras@controlmt.com', nombre: 'Compras y Suministros', rol: 'Compras' },
        { email: 'diseno@controlmt.com', nombre: 'Diseño e Ingeniería', rol: 'Diseño' },
        { email: 'rrhh@controlmt.com', nombre: 'Recursos Humanos', rol: 'Recursos Humanos' },
    ]

    for (const u of newUsers) {
        await prisma.usuario.upsert({
            where: { email: u.email },
            update: {},
            create: {
                nombre: u.nombre,
                email: u.email,
                password_hash: pass7,
                rol: u.rol,
            },
        })
    }

    console.log('Seeding finished:', { admin, supervisor, operario, newUsersCount: newUsers.length });
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
