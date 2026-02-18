-- CreateTable
CREATE TABLE "Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "MateriaPrima" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sku_mp" TEXT NOT NULL,
    "nombre_mp" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria_mp" TEXT NOT NULL,
    "unidad_medida_stock" TEXT NOT NULL,
    "stock_actual" DECIMAL NOT NULL DEFAULT 0,
    "stock_reservado" DECIMAL NOT NULL DEFAULT 0,
    "punto_reorden" DECIMAL NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sku_producto" TEXT NOT NULL,
    "nombre_producto" TEXT NOT NULL,
    "descripcion" TEXT
);

-- CreateTable
CREATE TABLE "ListaMateriales" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "producto_id" INTEGER NOT NULL,
    "materia_prima_id" INTEGER NOT NULL,
    "cantidad_requerida" DECIMAL NOT NULL,
    CONSTRAINT "ListaMateriales_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ListaMateriales_materia_prima_id_fkey" FOREIGN KEY ("materia_prima_id") REFERENCES "MateriaPrima" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RutaFabricacion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "producto_id" INTEGER NOT NULL,
    "no_operacion" INTEGER NOT NULL,
    "nombre_operacion" TEXT NOT NULL,
    "centro_trabajo" TEXT NOT NULL,
    "piezas_por_hora_estimado" INTEGER,
    CONSTRAINT "RutaFabricacion_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrdenTrabajo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero_ot" TEXT NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad_pedido" INTEGER NOT NULL,
    "cantidad_fabricar" INTEGER NOT NULL,
    "cliente" TEXT,
    "orden_compra_cliente" TEXT,
    "fecha_creacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_entrega_req" DATETIME,
    "estado_ot" TEXT NOT NULL DEFAULT 'Pendiente',
    CONSTRAINT "OrdenTrabajo_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TareaProduccion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orden_trabajo_id" INTEGER NOT NULL,
    "ruta_fabricacion_id" INTEGER NOT NULL,
    "operario_id" INTEGER,
    "estado_tarea" TEXT NOT NULL DEFAULT 'Pendiente',
    "fecha_hora_inicio" DATETIME,
    "fecha_hora_fin" DATETIME,
    "tiempo_parada_min" INTEGER NOT NULL DEFAULT 0,
    "cantidad_buena" INTEGER,
    "cantidad_mala" INTEGER,
    CONSTRAINT "TareaProduccion_orden_trabajo_id_fkey" FOREIGN KEY ("orden_trabajo_id") REFERENCES "OrdenTrabajo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TareaProduccion_ruta_fabricacion_id_fkey" FOREIGN KEY ("ruta_fabricacion_id") REFERENCES "RutaFabricacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TareaProduccion_operario_id_fkey" FOREIGN KEY ("operario_id") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovimientoInventarioMP" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "materia_prima_id" INTEGER NOT NULL,
    "fecha_hora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo_movimiento" TEXT NOT NULL,
    "cantidad" DECIMAL NOT NULL,
    "referencia_id" TEXT,
    CONSTRAINT "MovimientoInventarioMP_materia_prima_id_fkey" FOREIGN KEY ("materia_prima_id") REFERENCES "MateriaPrima" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MateriaPrima_sku_mp_key" ON "MateriaPrima"("sku_mp");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_sku_producto_key" ON "Producto"("sku_producto");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenTrabajo_numero_ot_key" ON "OrdenTrabajo"("numero_ot");
