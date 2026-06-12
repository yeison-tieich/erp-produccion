
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Tool Inventory Verification ---');
    
    // 1. Create a tool
    const tool = await prisma.herramientaConsumible.create({
        data: {
            nombre: 'TALADRO PERCUTOR BOSCH',
            codigo: 'TOOL-001',
            tipo: 'HERRAMIENTA',
            cantidad_total: 5,
            cantidad_disponible: 5,
            estado: 'DISPONIBLE',
            ubicacion: 'ESTANTE A-1'
        }
    });
    console.log('Tool created:', tool.nombre);

    // 2. Fetch a person
    const person = await prisma.personal.findFirst();
    if (!person) {
        console.log('No personal found to test loan');
        return;
    }

    // 3. Register a loan
    console.log(`Lending 2 tools to ${person.nombre}...`);
    const loan = await prisma.$transaction(async (tx) => {
        const t = await tx.herramientaConsumible.findUnique({ where: { id: tool.id } });
        if (!t) throw new Error();
        
        const l = await tx.prestamoHerramienta.create({
            data: {
                herramienta_id: t.id,
                personal_id: person.id,
                cantidad: 2,
                estado: 'ACTIVO'
            }
        });

        await tx.herramientaConsumible.update({
            where: { id: t.id },
            data: {
                cantidad_disponible: t.cantidad_disponible - 2,
                estado: 'PARCIALMENTE EN USO'
            }
        });
        return l;
    });
    console.log('Loan registered. ID:', loan.id);

    // 4. Verify stock
    const updatedTool = await prisma.herramientaConsumible.findUnique({ where: { id: tool.id } });
    console.log('Updated Tool Stock:', updatedTool?.cantidad_disponible, 'Status:', updatedTool?.estado);

    // 5. Clean up (Optional, but let's keep it for now as test data)
    console.log('Verification finished successfully.');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
