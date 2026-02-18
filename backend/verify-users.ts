
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.usuario.findMany();
        console.log('--- USUARIOS ENCONTRADOS ---');
        users.forEach(u => {
            console.log(`Email: ${u.email}`);
            console.log(`Nombre: ${u.nombre}`);
            console.log(`Rol: ${u.rol}`);
            console.log(`Hash: ${u.password_hash.substring(0, 10)}...`);
            console.log('---------------------------');
        });

        if (users.length === 0) {
            console.log('No hay usuarios en la base de datos.');
        }
    } catch (error) {
        console.error('Error al consultar usuarios:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
