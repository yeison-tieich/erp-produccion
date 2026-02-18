import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const operaciones = [
  'CORTE DE TIRA',
  'ENSAMBLE ABT-P1.ABT-P2',
  'SOLDASURA MIG',
  'GOLPE FORMADOR (AJUSTE DIMENSIONAL)',
  'EXTRACCIÓN DE CUÑA',
  'PINTURA',
  'EMBALAJE PRIMARIO',
  'ENGUACALAR',
  'TROQUELADO DE CONTORNO',
  'TROQUELADO FORMADOR Y PERFORACION',
  'FOMADO DE PUNTA',
  'DESBARBADO',
  'VERIFICACION Y EMPAQUE',
  'TROQUELADO',
  'TROQUELADO DOBLADO 1',
  'TROQUELADO DOBLADO 2',
  'VERIFICACION',
  'TRATAMIENTO',
  'AJUSTE DE MEDIDA',
  'TROQUELADO PUNZONADO',
  'MECANIZADO',
  'CORTE',
  'TROQUELADO ANGULO 95°',
  'TROQUELADO CAJA',
  'PUNSONADO 1',
  'PUNSONADO 2',
  'PUNSONADO 3',
  'AVELLANADO',
  'CORTE DE TRAMO',
  'MONTAJE',
  'MECANIZADO PIEZA',
  'MARCA',
  'VERIFICACION DE MEDIDA',
  'MARCACION',
  'DOBLADO 1',
  'DOBLADO 2 PATIN',
  'DOBLADO 3 PUNTILLA',
  'SOLDADURA DE PUNTO',
  'DOBLADO 4',
  'ENSAMBLE ABT-X',
  'SOLDADURA TIG',
  'BANCO',
  'MECANIZADO TORNO',
  'MECANIZADO CONTORNO',
  'RECTIFICADO',
  'ELIMINACION DEL TESTIGO',
  'MECANIZADO PIEZA PASO 1',
  'MECANIZADO PIEZA PASO 2',
  'MECANIZADO 1',
  'MECANIZADO 2',
  'MECANIZADO 3',
  'ROSCADO',
  'DESBARBADO',
  'VERIFICACION Y EMPAQUE'
]

async function main() {
  console.log('Seeding operations catalog...')
  for (let i = 0; i < operaciones.length; i++) {
    const nombre = operaciones[i]
    await prisma.operacionCatalog.upsert({
      where: { id: i + 1 },
      update: { nombre_operacion: nombre, orden: i + 1 },
      create: { nombre_operacion: nombre, orden: i + 1 }
    })
  }
  console.log('Operations seeded:', operaciones.length)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
