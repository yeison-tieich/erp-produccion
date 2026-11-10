CREATE TYPE "CategoriaMatriz" AS ENUM ('RIESGO', 'OPORTUNIDAD');
CREATE TYPE "EstadoControlCambio" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');
CREATE TYPE "CategoriaCostoCalidad" AS ENUM ('FALLA_INTERNA', 'FALLA_EXTERNA', 'PREVENCION_EVALUACION');

ALTER TABLE "RiesgoCalidad"
    ADD COLUMN "categoria_matriz" "CategoriaMatriz" NOT NULL DEFAULT 'RIESGO',
    ADD COLUMN "viabilidad" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "beneficio" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "nivel_oportunidad" INTEGER NOT NULL DEFAULT 1;

UPDATE "RiesgoCalidad"
SET "categoria_matriz" = 'OPORTUNIDAD'
WHERE UPPER("tipo") = 'OPORTUNIDAD';
UPDATE "RiesgoCalidad"
SET
    "viabilidad" = GREATEST(1, LEAST(5, "probabilidad")),
    "beneficio" = GREATEST(1, LEAST(5, "impacto")),
    "nivel_oportunidad" = GREATEST(1, LEAST(5, "probabilidad")) * GREATEST(1, LEAST(5, "impacto"))
WHERE "categoria_matriz" = 'OPORTUNIDAD';

ALTER TABLE "Proveedor"
    ADD COLUMN "riesgo_climatico_score" INTEGER,
    ADD COLUMN "evaluacion_ambiental" TEXT,
    ADD COLUMN "plan_continuidad_climatica" TEXT,
    ADD COLUMN "certificaciones_sostenibilidad" TEXT;

CREATE TABLE "InstrumentoMedicion" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fabricante" TEXT,
    "numero_serie" TEXT,
    "certificado_calibracion" TEXT,
    "fecha_ultima_calibracion" TIMESTAMP(3),
    "fecha_vencimiento" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InstrumentoMedicion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InstrumentoMedicion_codigo_key" ON "InstrumentoMedicion"("codigo");

ALTER TABLE "MedicionInspeccion" ADD COLUMN "instrumento_id" INTEGER;
ALTER TABLE "MedicionInspeccion"
    ADD CONSTRAINT "MedicionInspeccion_instrumento_id_fkey"
    FOREIGN KEY ("instrumento_id") REFERENCES "InstrumentoMedicion"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ControlCambioIngenieria" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "lista_materiales_id" INTEGER,
    "ruta_fabricacion_id" INTEGER,
    "motivo" TEXT NOT NULL,
    "descripcion_cambio" TEXT NOT NULL,
    "usuario_solicitante_id" INTEGER NOT NULL,
    "usuario_aprobador_id" INTEGER,
    "estado" "EstadoControlCambio" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_solicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_efectiva" TIMESTAMP(3),
    "comentarios_aprobacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ControlCambioIngenieria_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ControlCambioIngenieria_producto_id_fkey"
        FOREIGN KEY ("producto_id") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ControlCambioIngenieria_lista_materiales_id_fkey"
        FOREIGN KEY ("lista_materiales_id") REFERENCES "ListaMateriales"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ControlCambioIngenieria_ruta_fabricacion_id_fkey"
        FOREIGN KEY ("ruta_fabricacion_id") REFERENCES "RutaFabricacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ControlCambioIngenieria_usuario_solicitante_id_fkey"
        FOREIGN KEY ("usuario_solicitante_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ControlCambioIngenieria_usuario_aprobador_id_fkey"
        FOREIGN KEY ("usuario_aprobador_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ControlCambioIngenieria_codigo_key" ON "ControlCambioIngenieria"("codigo");
CREATE INDEX "ControlCambioIngenieria_estado_fecha_solicitud_idx" ON "ControlCambioIngenieria"("estado", "fecha_solicitud");
CREATE INDEX "ControlCambioIngenieria_producto_id_idx" ON "ControlCambioIngenieria"("producto_id");

CREATE TABLE "CostoNoCalidad" (
    "id" SERIAL NOT NULL,
    "categoria" "CategoriaCostoCalidad" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origen" TEXT,
    "numero_referencia" TEXT,
    "no_conformidad_id" INTEGER,
    "reclamo_id" INTEGER,
    "creado_por" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CostoNoCalidad_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CostoNoCalidad_no_conformidad_id_fkey"
        FOREIGN KEY ("no_conformidad_id") REFERENCES "NoConformidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CostoNoCalidad_reclamo_id_fkey"
        FOREIGN KEY ("reclamo_id") REFERENCES "ReclamoCliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CostoNoCalidad_categoria_fecha_idx" ON "CostoNoCalidad"("categoria", "fecha");
CREATE INDEX "CostoNoCalidad_no_conformidad_id_idx" ON "CostoNoCalidad"("no_conformidad_id");
CREATE INDEX "CostoNoCalidad_reclamo_id_idx" ON "CostoNoCalidad"("reclamo_id");

CREATE TABLE "AceptacionEtica" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "aceptado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_origen" TEXT,
    "evidencia_hash" TEXT,
    CONSTRAINT "AceptacionEtica_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AceptacionEtica_usuario_id_fkey"
        FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AceptacionEtica_usuario_id_aceptado_en_idx" ON "AceptacionEtica"("usuario_id", "aceptado_en");

CREATE TABLE "EvaluacionContextoCalidad" (
    "id" SERIAL NOT NULL,
    "factor" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "cambio_climatico_relevante" BOOLEAN NOT NULL DEFAULT false,
    "impacto_cadena_suministro" TEXT NOT NULL,
    "impacto_sostenibilidad" TEXT NOT NULL,
    "respuesta_planificada" TEXT NOT NULL,
    "responsable" TEXT NOT NULL,
    "fecha_revision" TIMESTAMP(3) NOT NULL,
    "creado_por" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EvaluacionContextoCalidad_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EvaluacionContextoCalidad_fecha_revision_idx" ON "EvaluacionContextoCalidad"("fecha_revision");

CREATE TABLE "CompromisoDireccionCalidad" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "compromiso" TEXT NOT NULL,
    "objetivos" TEXT,
    "aprobado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompromisoDireccionCalidad_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CompromisoDireccionCalidad_usuario_id_fkey"
        FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CompromisoDireccionCalidad_version_aprobado_en_idx" ON "CompromisoDireccionCalidad"("version", "aprobado_en");

CREATE OR REPLACE FUNCTION "reject_quality_audit_mutation"()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Quality audit and cost records are append-only';
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'AuditoriaRegistroCalidad_immutable_update') THEN
        CREATE TRIGGER "AuditoriaRegistroCalidad_immutable_update"
        BEFORE UPDATE OR DELETE ON "AuditoriaRegistroCalidad"
        FOR EACH ROW EXECUTE FUNCTION "reject_quality_audit_mutation"();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'CostoNoCalidad_immutable_update') THEN
        CREATE TRIGGER "CostoNoCalidad_immutable_update"
        BEFORE UPDATE OR DELETE ON "CostoNoCalidad"
        FOR EACH ROW EXECUTE FUNCTION "reject_quality_audit_mutation"();
    END IF;
END;
$$;
