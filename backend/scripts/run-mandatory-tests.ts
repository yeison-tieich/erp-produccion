import prisma from '../src/prisma';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

async function runTests() {
  console.log('================================================================');
  console.log('   SUITE DE PRUEBAS OBLIGATORIAS: CONTROL ANTIDUPLICADOS STOCK  ');
  console.log('================================================================\n');

  let testProductId: number | null = null;
  const createdOrderIds: number[] = [];

  try {
    const cedula = process.env.MANDATORY_TEST_CEDULA;
    const password = process.env.MANDATORY_TEST_PASSWORD;
    if (!cedula || !password) {
      throw new Error('Configura MANDATORY_TEST_CEDULA y MANDATORY_TEST_PASSWORD para ejecutar esta suite.');
    }

    const loginRes = await axios.post(`${API_BASE}/auth/login`, { cedula, password });
    const authToken = loginRes.data.token;
    if (!authToken) throw new Error('El inicio de sesión de pruebas no devolvió un token.');

    const authHeaders = {
      headers: { Authorization: `Bearer ${authToken}` }
    };

    console.log('✓ Autenticación lista.');

    // 1. Crear Producto de Prueba Aislado
    const testSku = `TEST-SKU-${Date.now()}`;
    const product = await prisma.producto.create({
      data: {
        sku_producto: testSku,
        nombre_producto: 'Producto Prueba Antiduplicados 200 Uds',
        stock_actual: 0,
        rutas: {
          create: [
            { no_operacion: 10, nombre_operacion: 'CORTE DE TIRA', centro_trabajo: 'CIZALLA' },
            { no_operacion: 20, nombre_operacion: 'TROQUELADO', centro_trabajo: 'PRENSA' },
            { no_operacion: 30, nombre_operacion: 'VERIFICACION Y EMPAQUE', centro_trabajo: 'CALIDAD' }
          ]
        }
      },
      include: { rutas: { orderBy: { no_operacion: 'asc' } } }
    });
    testProductId = product.id;
    console.log(`✓ Producto de prueba creado: ID ${product.id} (${testSku}), Stock inicial: 0`);

    // Helper para crear orden
    async function createTestOrder(cantidad: number, otSuffix: string) {
      const otNum = `OT-TEST-${Date.now().toString().slice(-5)}-${otSuffix}`;
      const newOrder = await prisma.ordenTrabajo.create({
        data: {
          numero_ot: otNum,
          producto_id: product.id,
          cantidad_fabricar: cantidad,
          cantidad_pedido: cantidad,
          estado_ot: 'Pendiente',
          tareas: {
            create: product.rutas.map(r => ({
              ruta_fabricacion_id: r.id,
              secuencia_ot: r.no_operacion,
              estado_tarea: 'Pendiente'
            }))
          }
        },
        include: {
          tareas: {
            include: { rutaFabricacion: true },
            orderBy: { secuencia_ot: 'asc' }
          }
        }
      });
      createdOrderIds.push(newOrder.id);
      return newOrder;
    }

    // -------------------------------------------------------------
    // PRUEBA 0: Operaciones anteriores NO deben generar entradas
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 0: Operaciones previas (Corte y Troquelado) NO generan stock ---');
    const order1 = await createTestOrder(200, 'ORD1');
    const tCorte = order1.tareas.find(t => t.rutaFabricacion?.nombre_operacion === 'CORTE DE TIRA')!;
    const tTroquelado = order1.tareas.find(t => t.rutaFabricacion?.nombre_operacion === 'TROQUELADO')!;
    const tEmpaque1 = order1.tareas.find(t => t.rutaFabricacion?.nombre_operacion === 'VERIFICACION Y EMPAQUE')!;

    await axios.post(`${API_BASE}/tasks/${tCorte.id}/finish`, { cantidad_buena: 200, cantidad_mala: 0 }, authHeaders);
    await axios.post(`${API_BASE}/tasks/${tTroquelado.id}/finish`, { cantidad_buena: 200, cantidad_mala: 0 }, authHeaders);

    let currentProd = await prisma.producto.findUnique({ where: { id: product.id } });
    let movsCount = await prisma.movimientoProducto.count({ where: { producto_id: product.id } });
    if (currentProd?.stock_actual === 0 && movsCount === 0) {
      console.log('✓ PASÓ: Ni CORTE ni TROQUELADO sumaron stock. Stock permanece en 0 y movimientos = 0.');
    } else {
      throw new Error(`FALLÓ: Operaciones previas afectaron el stock. Stock: ${currentProd?.stock_actual}, Movs: ${movsCount}`);
    }

    // -------------------------------------------------------------
    // PRUEBA 1: Completar orden de 200 unidades ("VERIFICACIÓN Y EMPAQUE")
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 1: Completar orden de 200 unidades (Resultado esperado: Ingresan 200) ---');
    await axios.post(`${API_BASE}/tasks/${tEmpaque1.id}/finish`, { cantidad_buena: 200, cantidad_mala: 0 }, authHeaders);

    currentProd = await prisma.producto.findUnique({ where: { id: product.id } });
    const movsOrder1 = await prisma.movimientoProducto.findMany({ where: { producto_id: product.id, orden_trabajo_id: order1.id } });

    console.log(`Stock actual del producto: ${currentProd?.stock_actual}`);
    console.log(`Movimientos registrados para OT ${order1.numero_ot}: ${movsOrder1.length}`);
    if (currentProd?.stock_actual === 200 && movsOrder1.length === 1 && movsOrder1[0].cantidad === 200) {
      console.log('✓ PASÓ: Exactamente 200 unidades ingresaron al inventario con 1 solo movimiento.');
    } else {
      throw new Error(`FALLÓ: Se esperaba stock 200 y 1 movimiento. Se obtuvo stock: ${currentProd?.stock_actual}, movs: ${movsOrder1.length}`);
    }

    // -------------------------------------------------------------
    // PRUEBA 2: Volver a guardar la operación
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 2: Volver a guardar la operación (Resultado esperado: No ingresa nada adicional) ---');
    await axios.put(`${API_BASE}/tasks/${tEmpaque1.id}/update-details`, {
      cantidad_buena: 200,
      comentarios: 'Re-guardando sin cambios de cantidad'
    }, authHeaders);

    currentProd = await prisma.producto.findUnique({ where: { id: product.id } });
    const movsOrder1AfterResave = await prisma.movimientoProducto.findMany({ where: { producto_id: product.id, orden_trabajo_id: order1.id } });

    console.log(`Stock actual tras re-guardar: ${currentProd?.stock_actual}`);
    console.log(`Movimientos registrados tras re-guardar: ${movsOrder1AfterResave.length}`);
    if (currentProd?.stock_actual === 200 && movsOrder1AfterResave.length === 1) {
      console.log('✓ PASÓ: Re-guardar la operación NO generó ninguna entrada adicional ni duplicó movimientos.');
    } else {
      throw new Error(`FALLÓ: Re-guardar alteró el stock o creó movimientos. Stock: ${currentProd?.stock_actual}, Movs: ${movsOrder1AfterResave.length}`);
    }

    // -------------------------------------------------------------
    // PRUEBA 3: Abrir nuevamente la orden
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 3: Abrir nuevamente la orden (Resultado esperado: No modifica el stock) ---');
    await axios.get(`${API_BASE}/orders/${order1.id}/details`, authHeaders);

    currentProd = await prisma.producto.findUnique({ where: { id: product.id } });
    if (currentProd?.stock_actual === 200) {
      console.log('✓ PASÓ: Consultar/abrir la orden NO alteró el inventario.');
    } else {
      throw new Error(`FALLÓ: Consultar la orden alteró el stock. Stock: ${currentProd?.stock_actual}`);
    }

    // -------------------------------------------------------------
    // PRUEBA 4: Enviar dos solicitudes simultáneas (Concurrencia / Idempotencia)
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 4: Enviar dos solicitudes simultáneas (Resultado esperado: Solo se registra una entrada) ---');
    const order2 = await createTestOrder(100, 'ORD2');
    const tEmpaque2 = order2.tareas.find(t => t.rutaFabricacion?.nombre_operacion === 'VERIFICACION Y EMPAQUE')!;

    const prevStock = currentProd!.stock_actual; // 200

    // Enviar 2 llamadas simultáneas al mismo endpoint al mismo tiempo
    const req1 = axios.post(`${API_BASE}/tasks/${tEmpaque2.id}/finish`, { cantidad_buena: 100, cantidad_mala: 0 }, authHeaders);
    const req2 = axios.post(`${API_BASE}/tasks/${tEmpaque2.id}/finish`, { cantidad_buena: 100, cantidad_mala: 0 }, authHeaders);

    const [res1, res2] = await Promise.allSettled([req1, req2]);
    console.log(`Respuesta 1: ${res1.status}, Respuesta 2: ${res2.status}`);

    currentProd = await prisma.producto.findUnique({ where: { id: product.id } });
    const movsOrder2 = await prisma.movimientoProducto.findMany({ where: { producto_id: product.id, orden_trabajo_id: order2.id } });

    console.log(`Stock actual tras concurrencia: ${currentProd?.stock_actual} (esperado: ${prevStock + 100})`);
    console.log(`Movimientos registrados para OT ${order2.numero_ot}: ${movsOrder2.length} (esperado: 1)`);
    if (currentProd?.stock_actual === prevStock + 100 && movsOrder2.length === 1 && movsOrder2[0].cantidad === 100) {
      console.log('✓ PASÓ: Dos solicitudes simultáneas generaron EXACTAMENTE una entrada de 100 unidades.');
    } else {
      throw new Error(`FALLÓ: Concurrencia duplicó el stock o movimientos. Stock: ${currentProd?.stock_actual}, Movs: ${movsOrder2.length}`);
    }

    // -------------------------------------------------------------
    // PRUEBA 5, 6, 7: Entregas parciales (80, luego 70, luego 50)
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 5, 6, 7: Entregas parciales (80 -> 70 adicionales -> 50 adicionales = Total 200) ---');
    const order3 = await createTestOrder(200, 'ORD3');
    const tEmpaque3 = order3.tareas.find(t => t.rutaFabricacion?.nombre_operacion === 'VERIFICACION Y EMPAQUE')!;

    const stockBeforeOrder3 = currentProd!.stock_actual;

    // Entrega 1: 80 unidades aprobadas
    console.log('Registrando entrega 1: 80 aprobadas...');
    await axios.post(`${API_BASE}/tasks/${tEmpaque3.id}/finish`, { cantidad_buena: 80, cantidad_mala: 0 }, authHeaders);
    currentProd = await prisma.producto.findUnique({ where: { id: product.id } });
    if (currentProd?.stock_actual !== stockBeforeOrder3 + 80) {
      throw new Error(`FALLÓ Entrega 1: Stock esperado ${stockBeforeOrder3 + 80}, obtenido ${currentProd?.stock_actual}`);
    }
    console.log(`✓ Entrega 1 OK: +80 ingresadas (Stock: ${currentProd?.stock_actual})`);

    // Entrega 2: 70 adicionales (Total acumulado: 150)
    console.log('Registrando entrega 2: 70 adicionales (Total 150 aprobadas)...');
    await axios.put(`${API_BASE}/tasks/${tEmpaque3.id}/update-details`, { cantidad_buena: 150 }, authHeaders);
    currentProd = await prisma.producto.findUnique({ where: { id: product.id } });
    if (currentProd?.stock_actual !== stockBeforeOrder3 + 80 + 70) {
      throw new Error(`FALLÓ Entrega 2: Stock esperado ${stockBeforeOrder3 + 150}, obtenido ${currentProd?.stock_actual}`);
    }
    console.log(`✓ Entrega 2 OK: +70 ingresadas (Stock: ${currentProd?.stock_actual})`);

    // Entrega 3: 50 adicionales (Total acumulado: 200)
    console.log('Registrando entrega 3: 50 adicionales (Total 200 aprobadas)...');
    await axios.put(`${API_BASE}/tasks/${tEmpaque3.id}/update-details`, { cantidad_buena: 200 }, authHeaders);
    currentProd = await prisma.producto.findUnique({ where: { id: product.id } });
    if (currentProd?.stock_actual !== stockBeforeOrder3 + 200) {
      throw new Error(`FALLÓ Entrega 3: Stock esperado ${stockBeforeOrder3 + 200}, obtenido ${currentProd?.stock_actual}`);
    }
    console.log(`✓ Entrega 3 OK: +50 ingresadas (Stock: ${currentProd?.stock_actual})`);

    const movsOrder3 = await prisma.movimientoProducto.findMany({
      where: { producto_id: product.id, orden_trabajo_id: order3.id },
      orderBy: { id: 'asc' }
    });
    console.log('Movimientos registrados para entregas parciales:');
    movsOrder3.forEach((m, idx) => {
      console.log(`  Movimiento ${idx + 1}: +${m.cantidad} uds (Referencia: ${m.referencia}, IdempotencyKey: ${m.idempotency_key})`);
    });

    if (
      movsOrder3.length === 3 &&
      movsOrder3[0].cantidad === 80 &&
      movsOrder3[1].cantidad === 70 &&
      movsOrder3[2].cantidad === 50
    ) {
      console.log('✓ PASÓ: Las 3 entregas parciales generaron exactamente +80, +70 y +50 sin duplicar ninguna cantidad.');
    } else {
      throw new Error(`FALLÓ: Las entregas parciales no corresponden a 80, 70, 50. Movimientos: ${JSON.stringify(movsOrder3)}`);
    }

    // -------------------------------------------------------------
    // PRUEBA 8: Completar otra orden del mismo producto
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 8: Completar otra orden del mismo producto (Resultado esperado: Ingresa únicamente su cantidad) ---');
    const order4 = await createTestOrder(350, 'ORD4');
    const tEmpaque4 = order4.tareas.find(t => t.rutaFabricacion?.nombre_operacion === 'VERIFICACION Y EMPAQUE')!;

    const stockBeforeOrder4 = currentProd!.stock_actual;
    await axios.post(`${API_BASE}/tasks/${tEmpaque4.id}/finish`, { cantidad_buena: 350, cantidad_mala: 0 }, authHeaders);

    currentProd = await prisma.producto.findUnique({ where: { id: product.id } });
    const movsOrder4 = await prisma.movimientoProducto.findMany({ where: { producto_id: product.id, orden_trabajo_id: order4.id } });

    console.log(`Stock actual tras Orden 4: ${currentProd?.stock_actual} (esperado: ${stockBeforeOrder4 + 350})`);
    console.log(`Movimientos de Orden 4: ${movsOrder4.length} (esperado: 1 de 350)`);
    if (currentProd?.stock_actual === stockBeforeOrder4 + 350 && movsOrder4.length === 1 && movsOrder4[0].cantidad === 350) {
      console.log('✓ PASÓ: Otra orden del mismo producto ingresó ÚNICAMENTE su cantidad (350).');
    } else {
      throw new Error(`FALLÓ: Orden 4 no ingresó su cantidad correcta.`);
    }

    console.log('\n================================================================');
    console.log('   ¡TODAS LAS PRUEBAS OBLIGATORIAS PASARON CON ÉXITO ROTUNDO!  ');
    console.log('================================================================\n');

  } catch (err: any) {
    console.error('\n❌ ERROR EN PRUEBA:', err?.response?.data || err.message || err);
    process.exit(1);
  } finally {
    // Limpieza de datos de prueba
    if (testProductId) {
      console.log('Limpiando registros de prueba...');
      await prisma.movimientoProducto.deleteMany({ where: { producto_id: testProductId } });
      await prisma.tareaProduccion.deleteMany({ where: { orden_trabajo_id: { in: createdOrderIds } } });
      await prisma.ordenTrabajo.deleteMany({ where: { id: { in: createdOrderIds } } });
      await prisma.rutaFabricacion.deleteMany({ where: { producto_id: testProductId } });
      await prisma.producto.delete({ where: { id: testProductId } });
      console.log('✓ Registros de prueba eliminados correctamente.');
    }
    process.exit(0);
  }
}

runTests();
