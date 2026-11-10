import prisma from '../src/prisma';

async function main() {
  console.log('Aplicando migración a PostgreSQL comando por comando...');

  const commands = [
    // 1. Alter MovimientoProducto
    `ALTER TABLE "MovimientoProducto" ADD COLUMN IF NOT EXISTS "orden_trabajo_id" INTEGER;`,
    `ALTER TABLE "MovimientoProducto" ADD COLUMN IF NOT EXISTS "tarea_id" INTEGER;`,
    `ALTER TABLE "MovimientoProducto" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;`,
    `ALTER TABLE "MovimientoProducto" ADD COLUMN IF NOT EXISTS "stock_anterior" INTEGER;`,
    `ALTER TABLE "MovimientoProducto" ADD COLUMN IF NOT EXISTS "stock_posterior" INTEGER;`,
    `ALTER TABLE "MovimientoProducto" ADD COLUMN IF NOT EXISTS "usuario" TEXT;`,
    `ALTER TABLE "MovimientoProducto" ADD COLUMN IF NOT EXISTS "observacion" TEXT;`,

    // 2. Alter TareaProduccion
    `ALTER TABLE "TareaProduccion" ADD COLUMN IF NOT EXISTS "cantidad_ingresada_stock" INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE "TareaProduccion" ADD COLUMN IF NOT EXISTS "ingreso_stock_procesado" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE "TareaProduccion" ADD COLUMN IF NOT EXISTS "fecha_ingreso_stock" TIMESTAMP(3);`,

    // 3. Foreign Keys
    `DO $$
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
    END $$;`,

    // 4. Indexes
    `CREATE UNIQUE INDEX IF NOT EXISTS "MovimientoProducto_idempotency_key_key" ON "MovimientoProducto"("idempotency_key");`,
    `CREATE INDEX IF NOT EXISTS "MovimientoProducto_orden_trabajo_id_idx" ON "MovimientoProducto"("orden_trabajo_id");`,
    `CREATE INDEX IF NOT EXISTS "MovimientoProducto_tarea_id_idx" ON "MovimientoProducto"("tarea_id");`,
    `CREATE INDEX IF NOT EXISTS "MovimientoProducto_producto_id_idx" ON "MovimientoProducto"("producto_id");`
  ];

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i].trim();
    console.log(`Ejecutando paso ${i + 1}/${commands.length}...`);
    await prisma.$executeRawUnsafe(cmd);
  }

  console.log('¡Migración completada exitosamente!');
}

main()
  .catch(e => {
    console.error('Error aplicando migración:', e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
