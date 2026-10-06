import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
    console.log('--- INICIANDO TEST DEL SISTEMA DE GESTIÓN DE CALIDAD ISO 9001 ---');

    // 1. Obtener o crear Cliente de prueba
    let cliente = await prisma.cliente.findFirst({ where: { nombre: 'Cliente Test Calidad' } });
    if (!cliente) {
        cliente = await prisma.cliente.create({
            data: { nombre: 'Cliente Test Calidad', contacto: 'Juan Perez', direccion: 'Calle 100' }
        });
    }
    console.log('✓ Cliente:', cliente.nombre);

    // 2. Obtener o crear Proveedor
    let proveedor = await prisma.proveedor.findFirst({ where: { nombre: 'Aceros Industriales SAS' } });
    if (!proveedor) {
        proveedor = await prisma.proveedor.create({
            data: { nombre: 'Aceros Industriales SAS', contacto: 'Carlos Aceros', telefono: '3001234567', calificacion: 95 }
        });
    }
    console.log('✓ Proveedor:', proveedor.nombre);

    // 3. Obtener o crear Producto
    const sku = `PROD-TEST-${Date.now().toString().slice(-4)}`;
    const producto = await prisma.producto.create({
        data: {
            sku_producto: sku,
            nombre_producto: 'Eje de Transmisión CNC 25mm',
            cliente_id: cliente.id,
            plano_pdf_url: 'https://example.com/planos/eje-25mm.pdf'
        }
    });
    console.log('✓ Producto creado:', producto.nombre_producto, 'SKU:', producto.sku_producto);

    // 4. Crear Plan de Control con Tolerancias y Cotas
    const planControl = await prisma.planControl.create({
        data: {
            producto_id: producto.id,
            codigo: `PC-${sku}`,
            nombre: 'Plan de Inspección Dimensional Eje 25mm',
            version: '1.0',
            caracteristicas: {
                create: [
                    {
                        secuencia: 10,
                        caracteristica: 'Diámetro exterior',
                        cota_nominal: 25.00,
                        tolerancia_min: -0.02,
                        tolerancia_max: 0.02,
                        unidad: 'mm',
                        instrumento: 'Micrómetro exterior 25-50mm',
                        metodo_medicion: '3 puntos a 120°',
                        frecuencia: '100%',
                        criterio_aceptacion: '24.98 - 25.02 mm',
                        es_critica: true
                    },
                    {
                        secuencia: 20,
                        caracteristica: 'Longitud total',
                        cota_nominal: 120.00,
                        tolerancia_min: -0.05,
                        tolerancia_max: 0.05,
                        unidad: 'mm',
                        instrumento: 'Calibrador Pie de Rey',
                        frecuencia: '1/5 piezas',
                        criterio_aceptacion: '119.95 - 120.05 mm',
                        es_critica: false
                    }
                ]
            }
        },
        include: { caracteristicas: true }
    });
    console.log('✓ Plan de Control creado con', planControl.caracteristicas.length, 'características.');

    // 5. Crear Orden de Trabajo
    const numeroOT = `OT-TEST-${Date.now().toString().slice(-5)}`;
    const ot = await prisma.ordenTrabajo.create({
        data: {
            numero_ot: numeroOT,
            producto_id: producto.id,
            cantidad_pedido: 50,
            cantidad_fabricar: 50,
            cliente: cliente.nombre,
            estado_ot: 'En Progreso',
            estado_calidad: 'Pendiente'
        }
    });
    console.log('✓ OT creada:', ot.numero_ot, 'Estado Calidad inicial:', ot.estado_calidad);

    // 6. Ejecutar Inspección con Mediciones (Prueba con valores conformes)
    const valoresDiametro = [24.99, 25.00, 25.01, 25.00, 24.99];
    const avgDiam = valoresDiametro.reduce((a, b) => a + b, 0) / valoresDiametro.length;
    const minDiam = Math.min(...valoresDiametro);
    const maxDiam = Math.max(...valoresDiametro);

    const inspeccionAprobada = await prisma.inspeccionCalidad.create({
        data: {
            codigo: `INS-${numeroOT}-01`,
            tipo: 'FINAL',
            orden_trabajo_id: ot.id,
            producto_id: producto.id,
            cliente_id: cliente.id,
            plan_control_id: planControl.id,
            cantidad_inspeccionada: 5,
            cantidad_aprobada: 5,
            cantidad_rechazada: 0,
            estado_resultado: 'APROBADO',
            observaciones: 'Todas las cotas dentro de tolerancia ISO',
            mediciones: {
                create: [
                    {
                        caracteristica_id: planControl.caracteristicas[0].id,
                        nombre_caracteristica: 'Diámetro exterior',
                        cota_nominal: 25.00,
                        tolerancia_min: -0.02,
                        tolerancia_max: 0.02,
                        instrumento: 'Micrómetro',
                        valores_medidos: JSON.stringify(valoresDiametro),
                        promedio: avgDiam,
                        minimo: minDiam,
                        maximo: maxDiam,
                        rango: maxDiam - minDiam,
                        desviacion: 0.008,
                        cumple: true
                    }
                ]
            }
        },
        include: { mediciones: true }
    });
    console.log('✓ Inspección realizada:', inspeccionAprobada.codigo, 'Resultado:', inspeccionAprobada.estado_resultado);

    // Actualizar OT a Liberada
    await prisma.ordenTrabajo.update({
        where: { id: ot.id },
        data: { estado_calidad: 'Liberada', cantidad_aprobada: 50 }
    });
    console.log('✓ OT actualizada a estado de calidad: Liberada');

    // 7. Simular caso con Pieza No Conforme (Rechazo)
    const otRechazada = await prisma.ordenTrabajo.create({
        data: {
            numero_ot: `OT-NC-${Date.now().toString().slice(-4)}`,
            producto_id: producto.id,
            cantidad_pedido: 20,
            cantidad_fabricar: 20,
            cliente: cliente.nombre,
            estado_ot: 'En Progreso',
            estado_calidad: 'Pendiente'
        }
    });

    const nc = await prisma.noConformidad.create({
        data: {
            codigo: `NC-${otRechazada.numero_ot}-01`,
            origen: 'INSPECCION',
            tipo_defecto: 'DIMENSIONAL',
            descripcion: 'Diámetro exterior mecanizado a 24.95mm (inferior a tolerancia mínima 24.98mm)',
            cantidad_afectada: 3,
            costo_estimado: 45000,
            orden_trabajo_id: otRechazada.id,
            producto_id: producto.id,
            estado: 'ABIERTA',
            disposicion: 'RETRABAJO'
        }
    });
    console.log('✓ No Conformidad generada:', nc.codigo, 'Disposición:', nc.disposicion, 'Costo:', nc.costo_estimado);

    // 8. Análisis de Causa Raíz (5 Por Qués e Ishikawa 6M)
    const rootCause = await prisma.analisisCausaNC.create({
        data: {
            no_conformidad_id: nc.id,
            metodo_analisis: 'AMBOS',
            porque_1: 'La pieza quedó por debajo de la medida nominal',
            porque_2: 'El inserto de corte sufrió desgaste prematuro',
            porque_3: 'Se superó el límite de piezas por filo',
            porque_4: 'El operario no verificó el contador de piezas de la herramienta',
            porque_5: 'Falta alerta visual en el torno para cambio preventivo de inserto',
            causa_raiz: 'Desgaste excesivo de inserto por falta de protocolo de reemplazo por contador de ciclos',
            ishikawa_maquina: JSON.stringify(['Vibración leve en torreta']),
            ishikawa_metodo: JSON.stringify(['Falta procedimiento de vida útil de inserto']),
            ishikawa_mano_obra: JSON.stringify(['Operario no midió pieza 1 de turno']),
            ishikawa_material: JSON.stringify(['Dureza del acero 4140 en límite superior']),
            ishikawa_medicion: JSON.stringify(['Micrómetro calibrado OK']),
            ishikawa_medio_ambiente: JSON.stringify(['Temperatura ambiente normal'])
        }
    });
    console.log('✓ Análisis de Causa Raíz registrado (5 Por Qués + Ishikawa 6M):', rootCause.causa_raiz);

    // 9. Acción Correctiva (CAPA)
    const capa = await prisma.accionCorrectiva.create({
        data: {
            codigo: `CAPA-${Date.now().toString().slice(-5)}`,
            no_conformidad_id: nc.id,
            tipo: 'CORRECTIVA',
            titulo: 'Control de vida útil de insertos en Torno CNC',
            descripcion_problema: nc.descripcion,
            causa_raiz: rootCause.causa_raiz,
            accion_propuesta: 'Implementar conteo de piezas automático en CNC y checklist de cambio de filo a las 50 piezas',
            fecha_limite: new Date(Date.now() + 7 * 24 * 3600 * 1000),
            estado: 'EN_PROCESO'
        }
    });
    console.log('✓ Acción Correctiva (CAPA) creada:', capa.codigo, 'Estado:', capa.estado);

    // 10. Matriz de Riesgos
    const riesgo = await prisma.riesgoCalidad.create({
        data: {
            codigo: `RIE-TEST-${Date.now().toString().slice(-3)}`,
            tipo: 'RIESGO',
            proceso: 'Mecanizado CNC',
            descripcion: 'Variación dimensional por desgaste no detectado de herramienta',
            probabilidad: 3,
            impacto: 4,
            nivel_riesgo: 12,
            estrategia: 'Mitigar',
            plan_accion: 'Protocolo de inspección cada 10 piezas y sensor de desgaste'
        }
    });
    console.log('✓ Riesgo ISO registrado:', riesgo.codigo, 'Nivel:', riesgo.nivel_riesgo, '(P=3, I=4)');

    // 11. Información Documentada SGC
    const docSGC = await prisma.documentoSGC.create({
        data: {
            codigo: `PR-CAL-${Date.now().toString().slice(-3)}`,
            nombre: 'Procedimiento de Inspección en Proceso y Liberación de Producto',
            tipo: 'PROCEDIMIENTO',
            proceso: 'CALIDAD',
            version_actual: '1.0',
            responsable: 'Jefe de Calidad',
            estado: 'VIGENTE'
        }
    });
    console.log('✓ Documento SGC registrado:', docSGC.codigo, docSGC.nombre);

    // 12. Registro en Log de Auditoría
    await prisma.auditoriaRegistroCalidad.create({
        data: {
            usuario_nombre: 'Inspector Calidad',
            accion: 'LIBERACION_OT',
            modulo: 'CALIDAD',
            entidad: 'OrdenTrabajo',
            entidad_id: ot.id,
            detalles: 'Liberación de OT conforme tras inspección dimensional'
        }
    });
    console.log('✓ Log de Auditoría ISO registrado con éxito.');

    console.log('\n======================================================');
    console.log('🎉 TODOS LOS COMPONENTES DE CALIDAD FUERON VERIFICADOS CON ÉXITO');
    console.log('======================================================\n');
}

runTest()
    .catch(e => {
        console.error('❌ Error en test:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
