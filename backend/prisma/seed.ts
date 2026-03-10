
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

    console.log('Seeding finished:', { admin, supervisor, operario });
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
