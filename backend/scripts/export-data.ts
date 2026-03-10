import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting data export from SQLite...')

  const data = {
    usuarios: await prisma.usuario.findMany(),
    clientes: await prisma.cliente.findMany(),
    materiaPrimas: await prisma.materiaPrima.findMany(),
    productos: await prisma.producto.findMany({
      include: {
        rutas: true,
        listaMateriales: true
      }
    }),
    personal: await prisma.personal.findMany(),
    maquinas: await prisma.maquina.findMany(),
    ordenesTrabajo: await prisma.ordenTrabajo.findMany({
      include: {
        tareas: true,
        materialesProyecto: true,
        movimientosInventario: true
      }
    }),
    proyectosEspeciales: await prisma.proyectoEspecial.findMany({
      include: {
        fases: true,
        archivos: true,
        notas: true
      }
    }),
    operacionesCatalog: await prisma.operacionCatalog.findMany(),
    alertas: await prisma.alerta.findMany(),
    configuracion: await prisma.configuracion.findMany(),
  }

  const dumpPath = path.join(__dirname, '../prisma/data_dump.json')
  fs.writeFileSync(dumpPath, JSON.stringify(data, null, 2))

  console.log(`✅ Data exported to ${dumpPath}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Export failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
