
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const getAreaFromDescription = (description: string): string => {
    const desc = description.toUpperCase();
    if (desc.includes('TORNO')) return 'TORNOS';
    if (desc.includes('CENTRO DE MECANIZADO')) return 'MECANIZADO';
    if (desc.includes('TROQUELADORA')) return 'TROQUELERIA';
    if (desc.includes('SOLDADURA')) return 'SOLDADURA';
    return 'SIN CATEGORIA';
};

async function main() {
    console.log('Updating machine areas...');
    const machines = await prisma.maquina.findMany();
    
    for (const m of machines) {
        const area = getAreaFromDescription(m.descripcion);
        await prisma.maquina.update({
            where: { id: m.id },
            data: { area_produccion: area }
        });
        console.log(`Updated Machine ${m.codigo}: ${area}`);
    }
    
    console.log('All machines updated.');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
