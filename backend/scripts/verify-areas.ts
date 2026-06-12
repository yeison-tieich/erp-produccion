
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const counts = await prisma.maquina.groupBy({
        by: ['area_produccion'],
        _count: { id: true }
    });
    
    console.log('Machine counts by area:');
    console.log(JSON.stringify(counts, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
