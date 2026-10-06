ALTER TABLE "OrdenTrabajo"
ADD COLUMN "proyecto_especial_id" INTEGER;

ALTER TABLE "OrdenTrabajo"
ADD CONSTRAINT "OrdenTrabajo_proyecto_especial_id_fkey"
FOREIGN KEY ("proyecto_especial_id") REFERENCES "ProyectoEspecial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "OrdenTrabajo_proyecto_especial_id_idx"
ON "OrdenTrabajo"("proyecto_especial_id");

ALTER TABLE "FaseProyecto"
ADD COLUMN "secuencia" INTEGER NOT NULL DEFAULT 10;

WITH fases_ordenadas AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "proyecto_id" ORDER BY "id") * 10 AS "secuencia"
  FROM "FaseProyecto"
)
UPDATE "FaseProyecto" AS fase
SET "secuencia" = fases_ordenadas."secuencia"
FROM fases_ordenadas
WHERE fase."id" = fases_ordenadas."id";

CREATE INDEX "FaseProyecto_proyecto_id_secuencia_idx"
ON "FaseProyecto"("proyecto_id", "secuencia");

ALTER TABLE "PiezaProyecto"
ADD COLUMN "codigo" TEXT,
ADD COLUMN "clave_idempotencia" TEXT;

CREATE UNIQUE INDEX "PiezaProyecto_proyecto_id_codigo_key"
ON "PiezaProyecto"("proyecto_id", "codigo");

CREATE UNIQUE INDEX "PiezaProyecto_clave_idempotencia_key"
ON "PiezaProyecto"("clave_idempotencia");

ALTER TABLE "RegistroPieza"
ADD COLUMN "cantidad_buena" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "cantidad_mala" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "cantidad_retrabajo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "clave_idempotencia" TEXT;

CREATE UNIQUE INDEX "RegistroPieza_clave_idempotencia_key"
ON "RegistroPieza"("clave_idempotencia");
