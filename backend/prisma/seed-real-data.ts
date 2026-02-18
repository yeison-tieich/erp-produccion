import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

interface ProductRow {
  codigo: string
  cliente: string
  producto: string
  material: string
  materiaPrima: string
  calibre: string
  piezasHora: string
  medidas: string
  acabado: string
  stock: string
}

function parseCSV(filePath: string): ProductRow[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const headers = lines[0].split(',')
  const rows: ProductRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = line.split(',')
    const row: ProductRow = {
      codigo: values[0]?.trim() || '',
      cliente: values[2]?.trim() || 'SIN CLIENTE',
      producto: values[4]?.trim() || '',
      material: values[5]?.trim() || '',
      materiaPrima: values[7]?.trim() || '',
      calibre: values[8]?.trim() || '',
      piezasHora: values[9]?.trim() || '0',
      medidas: values[11]?.trim() || '',
      acabado: values[12]?.trim() || 'SIN',
      stock: values[18]?.trim() || '0'
    }

    if (row.producto) {
      rows.push(row)
    }
  }

  return rows
}

async function main() {
  const password = await bcrypt.hash('123456', 10)

  // ============= USUARIOS =============
  const users = [
    { nombre: 'Administrador General', email: 'admin@controlmt.com', rol: 'Administrador' },
    { nombre: 'Supervisor Planta', email: 'supervisor@controlmt.com', rol: 'Supervisor' },
    { nombre: 'Juan Operario', email: 'operario@controlmt.com', rol: 'Operario' },
  ]

  for (const u of users) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: {
        nombre: u.nombre,
        rol: u.rol,
        password_hash: password
      },
      create: {
        nombre: u.nombre,
        email: u.email,
        password_hash: password,
        rol: u.rol
      }
    })
  }

  // Parse CSV
  const csvPath = path.join(__dirname, 'productos-data.csv')
  const productRows = parseCSV(csvPath)

  console.log(`📄 CSV parseado: ${productRows.length} productos`)

  // Extract unique clients
  const uniqueClients = new Set(productRows.map(r => r.cliente).filter(c => c && c !== 'SIN CLIENTE'))
  console.log(`👥 Clientes únicos: ${uniqueClients.size}`)

  // Create clients
  const clientMap = new Map<string, number>()
  for (const clientName of uniqueClients) {
    try {
      const client = await prisma.cliente.upsert({
        where: { nombre: clientName },
        update: {},
        create: { nombre: clientName }
      })
      clientMap.set(clientName, client.id)
    } catch (e) {
      console.log(`⚠️ Cliente duplicado: ${clientName}`)
    }
  }
  console.log(`✅ ${clientMap.size} clientes creados`)

  // Extract unique materials
  const uniqueMaterials = new Set(
    productRows
      .map(r => r.materiaPrima)
      .filter(m => m && m !== 'SIN' && m !== '')
      .map(m => m.trim())
  )
  console.log(`🔧 Materias primas únicas: ${uniqueMaterials.size}`)

  // Create materials
  const materialMap = new Map<string, number>()
  for (const materialName of uniqueMaterials) {
    try {
      const material = await prisma.materiaPrima.upsert({
        where: { sku_mp: materialName },
        update: {},
        create: {
          sku_mp: materialName,
          nombre_mp: materialName,
          categoria_mp: 'Lámina/Material',
          unidad_medida_stock: 'Unidades',
          stock_actual: 100,
          punto_reorden: 20
        }
      })
      materialMap.set(materialName, material.id)
    } catch (e) {
      console.log(`⚠️ Material duplicado: ${materialName}`)
    }
  }
  console.log(`✅ ${materialMap.size} materias primas creadas`)

  // Create products with routes and materials
  let productCount = 0
  for (const row of productRows) {
    try {
      // Skip if no product name
      if (!row.producto) continue

      const skuProducto = row.codigo || `AUTO-${Date.now()}-${productCount}`
      const clientId = row.cliente ? clientMap.get(row.cliente) : undefined
      const stock = parseInt(row.stock) || 0

      const product = await prisma.producto.create({
        data: {
          sku_producto: skuProducto,
          nombre_producto: row.producto,
          descripcion: `Material: ${row.material}`,
          cliente_id: clientId,
          acabado: row.acabado !== 'SIN' ? row.acabado : null,
          stock_actual: stock,
          medidas_pieza: row.medidas || null,
          rutas: {
            create: [
              { no_operacion: 10, nombre_operacion: 'Troquelado', centro_trabajo: 'Troqueladora' },
              { no_operacion: 20, nombre_operacion: 'Acabado', centro_trabajo: 'Pintura' },
            ]
          },
          listaMateriales: row.materiaPrima
            ? {
                create: [
                  {
                    materia_prima_id: materialMap.get(row.materiaPrima) || 1,
                    cantidad_requerida: 1
                  }
                ]
              }
            : undefined
        }
      })

      productCount++
      if (productCount % 50 === 0) {
        console.log(`⏳ ${productCount} productos creados...`)
      }
    } catch (e: any) {
      if (!e.message.includes('Unique constraint failed')) {
        console.error(`❌ Error en producto ${row.codigo}:`, e.message.substring(0, 100))
      }
    }
  }

  console.log(`✅ ${productCount} productos creados`)

  // Create sample orders
  const products = await prisma.producto.findMany({ include: { rutas: true }, take: 5 })
  const clientNames = Array.from(uniqueClients).slice(0, 3)

  for (let i = 0; i < 5; i++) {
    const product = products[i % products.length]
    const clientName = clientNames[i % clientNames.length]

    const order = await prisma.ordenTrabajo.create({
      data: {
        numero_ot: `${1001 + i}`,
        tipo_orden: 'PRODUCCION_SERIE',
        producto_id: product.id,
        cantidad_fabricar: Math.floor(Math.random() * 20) + 1,
        cliente: clientName,
        fecha_entrega_req: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        prioridad: ['URGENTE', 'ALTA', 'ESTANDAR'][i % 3],
        estado_ot: ['Pendiente', 'En Progreso', 'Completada'][i % 3],
      }
    })

    // Create tasks for order
    for (const ruta of product.rutas) {
      await prisma.tareaProduccion.create({
        data: {
          orden_trabajo_id: order.id,
          ruta_fabricacion_id: ruta.id,
          estado_tarea: 'Pendiente'
        }
      })
    }
  }

  console.log(`✅ 5 órdenes de ejemplo creadas`)
  console.log('✅ Base de datos poblada exitosamente con datos reales')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    console.log('✅ Seed completado')
  })
  .catch(async (e) => {
    console.error('❌ Error:', e.message)
    await prisma.$disconnect()
    process.exit(1)
  })
