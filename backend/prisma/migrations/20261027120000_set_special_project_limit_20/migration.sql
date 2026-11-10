ALTER TABLE "Configuracion"
ALTER COLUMN "max_proyectos_activos" SET DEFAULT 20;

UPDATE "Configuracion"
SET "max_proyectos_activos" = 20;
