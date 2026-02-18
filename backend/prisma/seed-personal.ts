
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const personalData = [
    { nombre: 'ARCE LUIS ALBERTO', cedula: '1.030.571.602', cargo: 'OPERARIO TROQUELADOR', salario: 1700000, calificacion: 'Colaborador Clave (Supera)', eficiencia: 3 },
    { nombre: 'BASTIDAS MURCIA WILLY', cedula: '1.001.167.894', cargo: 'OPERARIO TROQUELADOR', salario: 2070000, calificacion: 'Cumple Sólidamente (Estándar)', kpi_puntualidad: 5 },
    { nombre: 'BERNAL VILLAMIL EDISON', cedula: '1.056.029.599', cargo: 'OPERARIO TROQUELADOR', salario: 1700000 },
    { nombre: 'CAMARGO FUQUEN LUIS', cedula: '80.750.027', cargo: 'OPERADOR CNC TORNO', salario: 2840000 },
    { nombre: 'CASTILLO C. ROSEMBERG', cedula: '79.525.001', cargo: 'OPERARIO TROQUELADOR', salario: 2600000 },
    { nombre: 'GARZON CORTES ELIAN JOSE', cedula: '1.007.552.011', cargo: 'OPERARIO CNC CENTRO DE M', salario: 2350000 },
    { nombre: 'HERRERA ARRIETA CAMILO', cedula: '72.013.122', cargo: 'OPERARIO SOLDADOR', salario: 2280000 },
    { nombre: 'MARTINEZ PARRA LEONAR F', cedula: '1.233.510.746', cargo: 'OPERARIO TROQUELADOR', salario: 1500000 },
    { nombre: 'MEJIA VARGAS ANDRES', cedula: '1.033.693.805', cargo: 'DISEÑADOR', salario: 3070000 },
    { nombre: 'MUÑOZ DAZA DANILO', cedula: '80.470.925', cargo: 'SUPERVISOR CNC', salario: 4400000 },
    { nombre: 'ROJAS LAVERDE FABIAN', cedula: '1.022.361.461', cargo: 'ALMACENISTA', salario: 1900000 },
    { nombre: 'ROMERO SARMIENTO WILLIAM', cedula: '1.023.363.612', cargo: 'OPERARIO CNC CENTRO DE M', salario: 1700000 },
    { nombre: 'SALGADO VELEZ ANDRES F', cedula: '1.013.597.596', cargo: 'OPERADOR CNC TORNO', salario: 1700000 },
    { nombre: 'SOLANA ARIZA EDWIN', cedula: '1.023.906.030', cargo: 'OPERARIO TROQUELADOR', salario: 1860000 },
    { nombre: 'MARTINEZ BUELVAS ASDRUBAL', cedula: '80.800.642', cargo: 'OPERARIO TROQUELADOR', salario: 1800000 },
    { nombre: 'YEISON TEJADA', cedula: '1.012.355.924', cargo: 'JEFE DE PRODUCCION', salario: 3330000 },
    { nombre: 'ANGEL DAVID MORA VALENCIA', cedula: '101.255.555', cargo: 'AUXILIAR DE PRODUCCION', salario: 1423000 },
    { nombre: 'DIEGO PRADA', cedula: '1.023.554.897', cargo: 'OPERARIO', salario: 1550000 }
];

async function main() {
    console.log('Seeding Personal...');
    for (const p of personalData) {
        await prisma.personal.upsert({
            where: { cedula: p.cedula },
            update: p,
            create: p
        });
    }
    console.log('Personal seeded successfully.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
