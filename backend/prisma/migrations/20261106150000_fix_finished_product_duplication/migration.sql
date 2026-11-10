-- AlterTable MovimientoProducto
ALTER TABLE "MovimientoProducto"
ADD COLUMN IF NOT EXISTS "orden_trabajo_id" INTEGER,
ADD COLUMN IF NOT EXISTS "tarea_id" INTEGER,
ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT,
ADD COLUMN IF NOT EXISTS "stock_anterior" INTEGER,
ADD COLUMN IF NOT EXISTS "stock_posterior" INTEGER,
ADD COLUMN IF NOT EXISTS "usuario" TEXT,
ADD COLUMN IF NOT EXISTS "observacion" TEXT;

-- AlterTable TareaProduccion
ALTER TABLE "TareaProduccion"
ADD COLUMN IF NOT EXISTS "cantidad_ingresada_stock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "ingreso_stock_procesado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "fecha_ingreso_stock" TIMESTAMP(3);

-- Add ForeignKey constraints if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MovimientoProducto_orden_trabajo_id_fkey'
    ) THEN
        ALTER TABLE "MovimientoProducto"
        ADD CONSTRAINT "MovimientoProducto_orden_trabajo_id_fkey"
        FOREIGN KEY ("orden_trabajo_id") REFERENCES "OrdenTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MovimientoProducto_tarea_id_fkey'
    ) THEN
        ALTER TABLE "MovimientoProducto"
        ADD CONSTRAINT "MovimientoProducto_tarea_id_fkey"
        FOREIGN KEY ("tarea_id") REFERENCES "TareaProduccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MovimientoProducto_idempotency_key_key" ON "MovimientoProducto"("idempotency_key");
CREATE INDEX IF NOT EXISTS "MovimientoProducto_orden_trabajo_id_idx" ON "MovimientoProducto"("orden_trabajo_id");
CREATE INDEX IF NOT EXISTS "MovimientoProducto_tarea_id_idx" ON "MovimientoProducto"("tarea_id");
CREATE INDEX IF NOT EXISTS "MovimientoProducto_producto_id_idx" ON "MovimientoProducto"("producto_id");
