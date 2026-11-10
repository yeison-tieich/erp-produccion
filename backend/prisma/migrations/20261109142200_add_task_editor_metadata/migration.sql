ALTER TABLE "TareaProduccion"
ADD COLUMN IF NOT EXISTS "usuario_ultima_edicion" TEXT,
ADD COLUMN IF NOT EXISTS "fecha_ultima_edicion" TIMESTAMP(3);
