import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  const dumpPath = path.join(__dirname, '../prisma/data_dump.json')
  if (!fs.existsSync(dumpPath)) {
    throw new Error('Data dump file not found!')
  }

  const data = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'))
  console.log('🚀 Starting data import to PostgreSQL...')

  // Clear existing data to avoid conflicts during full migration
  console.log('🧹 Clearing existing production data...')
  await prisma.tareaProduccion.deleteMany({})
  await prisma.movimientoInventarioMP.deleteMany({})
  await prisma.materialProyecto.deleteMany({})
  await prisma.ordenTrabajo.deleteMany({})
  await prisma.listaMateriales.deleteMany({})
  await prisma.rutaFabricacion.deleteMany({})
  await prisma.producto.deleteMany({})
  await prisma.faseProyecto.deleteMany({})
  await prisma.proyectoEspecial.deleteMany({})
  await prisma.maquina.deleteMany({})
  await prisma.personal.deleteMany({})
  await prisma.cliente.deleteMany({})

  // Import sequence matters due to foreign keys
  
  // Maps to store oldId -> newId
  const materialMap = new Map<number, number>()
  const productMap = new Map<number, number>()
  const rutaMap = new Map<number, number>()
  const machineMap = new Map<number, number>()
  const personalMap = new Map<number, number>()

  // 1. Independent models
  console.log('👥 Importing Users...')
  for (const item of data.usuarios) {
    const { id, ...rest } = item
    await prisma.usuario.upsert({
      where: { email: item.email },
      update: rest,
      create: rest
    })
  }

  console.log('🧱 Importing Materia Prima...')
  for (const item of data.materiaPrimas) {
    const { id: oldId, ...rest } = item
    const record = await prisma.materiaPrima.upsert({
      where: { sku_mp: item.sku_mp },
      update: rest,
      create: rest
    })
    materialMap.set(oldId, record.id)
  }

  console.log('👥 Importing Personal...')
  for (const item of data.personal) {
    const { id: oldId, ...rest } = item
    const record = await prisma.personal.upsert({
      where: { cedula: item.cedula },
      update: rest,
      create: rest
    })
    personalMap.set(oldId, record.id)
  }

  console.log('⚙️ Importing Machines...')
  for (const item of data.maquinas) {
    const { id: oldId, ...rest } = item
    const record = await prisma.maquina.upsert({
      where: { codigo: item.codigo },
      update: rest,
      create: rest
    })
    machineMap.set(oldId, record.id)
  }

  // 2. Products and their components
  console.log('📦 Importing Products...')
  for (const item of data.productos) {
    const { id: oldProductId, rutas, listaMateriales, cliente_id, ...productData } = item
    
    // Check if product exists
    let product = await prisma.producto.findUnique({ where: { sku_producto: item.sku_producto } })
    
    if (!product) {
        product = await prisma.producto.create({ data: productData })
    } else {
        product = await prisma.producto.update({ where: { id: product.id }, data: productData })
    }
    productMap.set(oldProductId, product.id)

    // Import Rutas for this product
    for (const r of rutas) {
        const { id: oldRutaId, producto_id, ...rutaData } = r
        const record = await prisma.rutaFabricacion.create({
            data: { ...rutaData, producto_id: product.id }
        })
        rutaMap.set(oldRutaId, record.id)
    }

    // Import Lista Materiales
    for (const lm of listaMateriales) {
        const { id: oldLmId, producto_id, materia_prima_id, ...lmData } = lm
        await prisma.listaMateriales.create({
            data: { 
                ...lmData, 
                producto_id: product.id,
                materia_prima_id: materialMap.get(materia_prima_id) || materia_prima_id
            }
        })
    }
  }

  // 3. Orders and secondary relations
  console.log('📋 Importing Orders...')
  for (const item of data.ordenesTrabajo) {
    const { id, tareas, materialesProyecto, movimientosInventario, producto_id, ...orderData } = item
    
    const record = await prisma.ordenTrabajo.upsert({
      where: { numero_ot: item.numero_ot },
      update: { ...orderData, producto_id: productMap.get(producto_id) || null },
      create: { ...orderData, producto_id: productMap.get(producto_id) || null }
    })

    // Import Tareas
    for (const t of tareas) {
        const { id, orden_trabajo_id, ruta_fabricacion_id, maquina_id, personal_id, ...tData } = t
        await prisma.tareaProduccion.create({
            data: {
                ...tData,
                orden_trabajo_id: record.id,
                ruta_fabricacion_id: rutaMap.get(ruta_fabricacion_id) || ruta_fabricacion_id,
                maquina_id: maquina_id ? machineMap.get(maquina_id) : null,
                personal_id: personal_id ? personalMap.get(personal_id) : null
            }
        })
    }
  }

  // 4. Projects (Proyectos Especiales)
  console.log('🏗️ Importing Projects...')
  for (const item of data.proyectosEspeciales) {
    const { id, fases, archivos, notas, ...projectData } = item
    
    const cleanFases = fases.map(({ id, proyecto_id, ...f }: any) => f)
    const cleanArchivos = archivos.map(({ id, proyecto_id, ...a }: any) => a)
    const cleanNotas = notas.map(({ id, proyecto_id, ...n }: any) => n)

    await prisma.proyectoEspecial.upsert({
      where: { codigo: item.codigo },
      update: projectData,
      create: {
        ...projectData,
        fases: { create: cleanFases },
        archivos: { create: cleanArchivos },
        notas: { create: cleanNotas }
      }
    })
  }

  console.log('✅ Import finished successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Import failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
