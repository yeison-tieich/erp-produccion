-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" TEXT NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MateriaPrima" (
    "id" SERIAL NOT NULL,
    "sku_mp" TEXT NOT NULL,
    "nombre_mp" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria_mp" TEXT NOT NULL,
    "unidad_medida_stock" TEXT NOT NULL,
    "stock_actual" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "stock_reservado" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "punto_reorden" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "MateriaPrima_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "direccion" TEXT,
    "calificacion" DECIMAL(65,30) DEFAULT 0,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" SERIAL NOT NULL,
    "sku_producto" TEXT NOT NULL,
    "nombre_producto" TEXT NOT NULL,
    "descripcion" TEXT,
    "cliente_id" INTEGER,
    "acabado" TEXT,
    "imagen_url" TEXT,
    "stock_actual" INTEGER NOT NULL DEFAULT 0,
    "ancho_tira" DECIMAL(65,30),
    "medidas_pieza" TEXT,
    "piezas_lamina_4x8" TEXT,
    "piezas_lamina_2x1" TEXT,
    "empaque_de" TEXT,
    "ubicacion" TEXT,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaMateriales" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "materia_prima_id" INTEGER NOT NULL,
    "cantidad_requerida" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ListaMateriales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RutaFabricacion" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "no_operacion" INTEGER NOT NULL,
    "nombre_operacion" TEXT NOT NULL,
    "centro_trabajo" TEXT NOT NULL,
    "piezas_por_hora_estimado" INTEGER,

    CONSTRAINT "RutaFabricacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Personal" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "kpi_puntualidad" DOUBLE PRECISION,
    "salario" DECIMAL(65,30),
    "calificacion" TEXT,
    "eficiencia" DOUBLE PRECISION,
    "productividad" DOUBLE PRECISION,

    CONSTRAINT "Personal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroTiempoLaboral" (
    "id" SERIAL NOT NULL,
    "personal_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horas" DOUBLE PRECISION DEFAULT 0,
    "motivo" TEXT,
    "aprobado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroTiempoLaboral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DotacionEPP" (
    "id" SERIAL NOT NULL,
    "personal_id" INTEGER NOT NULL,
    "item" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "fecha_entrega" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comentarios" TEXT,

    CONSTRAINT "DotacionEPP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenTrabajo" (
    "id" SERIAL NOT NULL,
    "numero_ot" TEXT NOT NULL,
    "tipo_orden" TEXT NOT NULL DEFAULT 'PRODUCCION_SERIE',
    "producto_id" INTEGER,
    "cantidad_pedido" INTEGER NOT NULL DEFAULT 0,
    "cantidad_fabricar" INTEGER NOT NULL DEFAULT 0,
    "descripcion_proyecto" TEXT,
    "cliente" TEXT,
    "orden_compra_cliente" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_entrega_req" TIMESTAMP(3),
    "prioridad" TEXT NOT NULL DEFAULT 'ESTANDAR',
    "estado_ot" TEXT NOT NULL DEFAULT 'Pendiente',
    "costo_total_estimado" DECIMAL(65,30) DEFAULT 0,
    "costo_total_real" DECIMAL(65,30) DEFAULT 0,
    "fecha_inicio_real" TIMESTAMP(3),
    "fecha_fin_real" TIMESTAMP(3),
    "duracion_total_real_min" INTEGER DEFAULT 0,

    CONSTRAINT "OrdenTrabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TareaProduccion" (
    "id" SERIAL NOT NULL,
    "orden_trabajo_id" INTEGER NOT NULL,
    "ruta_fabricacion_id" INTEGER NOT NULL,
    "personal_id" INTEGER,
    "maquina_id" INTEGER,
    "estado_tarea" TEXT NOT NULL DEFAULT 'Pendiente',
    "fecha_hora_inicio" TIMESTAMP(3),
    "fecha_hora_fin" TIMESTAMP(3),
    "tiempo_parada_min" INTEGER NOT NULL DEFAULT 0,
    "cantidad_buena" INTEGER DEFAULT 0,
    "cantidad_mala" INTEGER DEFAULT 0,
    "motivo_rechazo" TEXT,
    "costo_estimado" DECIMAL(65,30) DEFAULT 0,
    "costo_real" DECIMAL(65,30) DEFAULT 0,
    "duracion_real_min" INTEGER DEFAULT 0,

    CONSTRAINT "TareaProduccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoInventarioMP" (
    "id" SERIAL NOT NULL,
    "materia_prima_id" INTEGER NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo_movimiento" TEXT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "referencia_id" TEXT,
    "orden_trabajo_id" INTEGER,

    CONSTRAINT "MovimientoInventarioMP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maquina" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "adquirida_en" TEXT,
    "estado" TEXT NOT NULL,
    "observaciones" TEXT,
    "motor_hp" TEXT,
    "consumo_mes" TEXT,
    "capacidad_trabajo" TEXT,
    "horas_maquina_mes" TEXT,
    "foto_url" TEXT,
    "horas_disponibles_semana" DECIMAL(65,30) DEFAULT 40,

    CONSTRAINT "Maquina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialProyecto" (
    "id" SERIAL NOT NULL,
    "orden_trabajo_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "unidad" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "especificaciones" TEXT,
    "ancho_tira" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "MaterialProyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperacionCatalog" (
    "id" SERIAL NOT NULL,
    "nombre_operacion" TEXT NOT NULL,
    "centro_trabajo" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OperacionCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoEspecial" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "descripcion_tecnica" TEXT NOT NULL,
    "tipo_proyecto" TEXT NOT NULL,
    "responsable_tecnico" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_compromiso" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL,
    "prioridad" TEXT NOT NULL,
    "penalidad_retraso" TEXT,
    "porcentaje_avance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "indicador_riesgo" TEXT NOT NULL DEFAULT 'Bajo',
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoEspecial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaseProyecto" (
    "id" SERIAL NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "responsable" TEXT NOT NULL,
    "horas_estimadas" DECIMAL(65,30) NOT NULL,
    "horas_reales" DECIMAL(65,30),
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaseProyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargaMaquina" (
    "id" SERIAL NOT NULL,
    "maquina_id" INTEGER NOT NULL,
    "proyecto_id" INTEGER,
    "horas_asignadas" DECIMAL(65,30) NOT NULL,
    "semana" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,

    CONSTRAINT "CargaMaquina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialCambios" (
    "id" SERIAL NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "HistorialCambios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchivoAdjunto" (
    "id" SERIAL NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "url_archivo" TEXT NOT NULL,
    "fecha_carga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivoAdjunto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaTecnica" (
    "id" SERIAL NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "autor" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contenido" TEXT NOT NULL,

    CONSTRAINT "NotaTecnica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "proyecto_id" INTEGER,
    "maquina_id" INTEGER,

    CONSTRAINT "Alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" SERIAL NOT NULL,
    "max_proyectos_activos" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MateriaPrima_sku_mp_key" ON "MateriaPrima"("sku_mp");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_nombre_key" ON "Cliente"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_sku_producto_key" ON "Producto"("sku_producto");

-- CreateIndex
CREATE UNIQUE INDEX "Personal_cedula_key" ON "Personal"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenTrabajo_numero_ot_key" ON "OrdenTrabajo"("numero_ot");

-- CreateIndex
CREATE UNIQUE INDEX "Maquina_codigo_key" ON "Maquina"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ProyectoEspecial_codigo_key" ON "ProyectoEspecial"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CargaMaquina_maquina_id_semana_ano_key" ON "CargaMaquina"("maquina_id", "semana", "ano");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaMateriales" ADD CONSTRAINT "ListaMateriales_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaMateriales" ADD CONSTRAINT "ListaMateriales_materia_prima_id_fkey" FOREIGN KEY ("materia_prima_id") REFERENCES "MateriaPrima"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RutaFabricacion" ADD CONSTRAINT "RutaFabricacion_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroTiempoLaboral" ADD CONSTRAINT "RegistroTiempoLaboral_personal_id_fkey" FOREIGN KEY ("personal_id") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DotacionEPP" ADD CONSTRAINT "DotacionEPP_personal_id_fkey" FOREIGN KEY ("personal_id") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenTrabajo" ADD CONSTRAINT "OrdenTrabajo_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaProduccion" ADD CONSTRAINT "TareaProduccion_orden_trabajo_id_fkey" FOREIGN KEY ("orden_trabajo_id") REFERENCES "OrdenTrabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaProduccion" ADD CONSTRAINT "TareaProduccion_ruta_fabricacion_id_fkey" FOREIGN KEY ("ruta_fabricacion_id") REFERENCES "RutaFabricacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaProduccion" ADD CONSTRAINT "TareaProduccion_personal_id_fkey" FOREIGN KEY ("personal_id") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaProduccion" ADD CONSTRAINT "TareaProduccion_maquina_id_fkey" FOREIGN KEY ("maquina_id") REFERENCES "Maquina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventarioMP" ADD CONSTRAINT "MovimientoInventarioMP_materia_prima_id_fkey" FOREIGN KEY ("materia_prima_id") REFERENCES "MateriaPrima"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventarioMP" ADD CONSTRAINT "MovimientoInventarioMP_orden_trabajo_id_fkey" FOREIGN KEY ("orden_trabajo_id") REFERENCES "OrdenTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialProyecto" ADD CONSTRAINT "MaterialProyecto_orden_trabajo_id_fkey" FOREIGN KEY ("orden_trabajo_id") REFERENCES "OrdenTrabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaseProyecto" ADD CONSTRAINT "FaseProyecto_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "ProyectoEspecial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargaMaquina" ADD CONSTRAINT "CargaMaquina_maquina_id_fkey" FOREIGN KEY ("maquina_id") REFERENCES "Maquina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargaMaquina" ADD CONSTRAINT "CargaMaquina_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "ProyectoEspecial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialCambios" ADD CONSTRAINT "HistorialCambios_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "ProyectoEspecial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialCambios" ADD CONSTRAINT "HistorialCambios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivoAdjunto" ADD CONSTRAINT "ArchivoAdjunto_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "ProyectoEspecial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaTecnica" ADD CONSTRAINT "NotaTecnica_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "ProyectoEspecial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
