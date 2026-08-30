-- Migración inicial (baseline), generada a partir del esquema Prisma
-- vigente con `prisma migrate diff --from-empty --to-schema-datamodel
-- prisma/schema.prisma --script`. Faltaba en el repositorio (ver
-- docs/SETUP.md paso 6: nunca se había hecho el `migrate dev --create-only
-- --name init` inicial) y es un prerrequisito de la migración de RLS
-- siguiente (20260829180000_habilitar_rls_anti_idor_entidades_con_dueno):
-- `ENABLE ROW LEVEL SECURITY` y `CREATE POLICY` fallan si las tablas no
-- existen todavía, como reveló `prisma migrate deploy` en CI.

-- CreateTable
CREATE TABLE "roles" (
    "id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "estado_verificacion" TEXT NOT NULL DEFAULT 'no_requerido',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfiles_veterinario" (
    "usuario_id" UUID NOT NULL,
    "matricula" TEXT NOT NULL,
    "colegio_emisor" TEXT NOT NULL,
    "verificado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "perfiles_veterinario_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "perfiles_municipio" (
    "usuario_id" UUID NOT NULL,
    "nombre_institucional" TEXT NOT NULL,
    "verificado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "perfiles_municipio_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "verificaciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "motivo_rechazo" TEXT,
    "revisado_por" UUID,
    "resuelto_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mascotas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dueño_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "especie" TEXT NOT NULL,
    "raza" TEXT,
    "edad_aproximada" INTEGER,
    "foto_url" TEXT NOT NULL,
    "identificacion_chip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mascotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tipo" TEXT NOT NULL,
    "subtipo" TEXT,
    "reportado_por" UUID NOT NULL,
    "mascota_id" UUID,
    "descripcion" TEXT NOT NULL,
    "foto_url" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'reportado',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reportes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes_historial_estado" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporte_id" UUID NOT NULL,
    "estado_anterior" TEXT NOT NULL,
    "estado_nuevo" TEXT NOT NULL,
    "usuario_id" UUID NOT NULL,
    "registrado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reportes_historial_estado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "referencia_tabla" TEXT NOT NULL,
    "referencia_id" UUID NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "municipio_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "cupos_totales" INTEGER NOT NULL,
    "requisitos" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilidad_veterinario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "veterinario_id" UUID NOT NULL,
    "dia_semana" INTEGER NOT NULL,
    "hora_inicio" TIME NOT NULL,
    "hora_fin" TIME NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "disponibilidad_veterinario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "proveedor_tipo" TEXT NOT NULL,
    "proveedor_id" UUID NOT NULL,
    "evento_id" UUID,
    "reservado_por" UUID,
    "franja_inicio" TIMESTAMP(3) NOT NULL,
    "franja_fin" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'disponible',
    "asistio" BOOLEAN,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "turnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vitrina_adopcion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "municipio_id" UUID NOT NULL,
    "nombre_animal" TEXT NOT NULL,
    "especie" TEXT NOT NULL,
    "edad_aproximada" INTEGER,
    "tamano" TEXT,
    "temperamento" TEXT,
    "estado_salud" TEXT,
    "requisitos_adopcion" TEXT,
    "foto_url" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'disponible',
    "nivel_energia" TEXT,
    "compatible_ninos" BOOLEAN,
    "compatible_otros_animales" BOOLEAN,
    "necesidades_medicas_detalle" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vitrina_adopcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autorizaciones_libreta" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mascota_id" UUID NOT NULL,
    "veterinario_id" UUID NOT NULL,
    "otorgada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revocada_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "autorizaciones_libreta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entradas_libreta_sanitaria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mascota_id" UUID NOT NULL,
    "veterinario_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "entradas_libreta_sanitaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_recurso" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizacion_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "reporte_id" UUID,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "solicitudes_recurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colaboraciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitud_id" UUID NOT NULL,
    "stakeholder_id" UUID NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'propuesta',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "colaboraciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos_veterinario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "veterinario_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "productos_veterinario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos_producto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "producto_id" UUID NOT NULL,
    "comprador_id" UUID NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pedidos_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historiales_compartidos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mascota_id" UUID NOT NULL,
    "veterinario_origen_id" UUID NOT NULL,
    "veterinario_destino_id" UUID NOT NULL,
    "autorizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revocado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historiales_compartidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comercios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "nombre_comercio" TEXT NOT NULL,
    "tipo_comercio" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "estado_verificacion" TEXT NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "comercios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos_comercio" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "comercio_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT,
    "precio" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "productos_comercio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "publicado_por" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "contenido_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones_curso" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "curso_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "inscrito_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscripciones_curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temas_foro" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creado_por" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "temas_foro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuestas_foro" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tema_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "contenido" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "respuestas_foro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuestionarios_adoptante" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "horas_solo_estimadas" INTEGER,
    "presencia_ninos" BOOLEAN,
    "espacio_disponible" TEXT,
    "experiencia_previa" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cuestionarios_adoptante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sugerencias_compatibilidad" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cuestionario_id" UUID NOT NULL,
    "vitrina_adopcion_id" UUID NOT NULL,
    "score_compatibilidad" DECIMAL(5,4) NOT NULL,
    "metodo" TEXT NOT NULL,
    "generado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sugerencias_compatibilidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE INDEX "usuarios_rol_id_idx" ON "usuarios"("rol_id");

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_veterinario_matricula_colegio_emisor_key" ON "perfiles_veterinario"("matricula", "colegio_emisor");

-- CreateIndex
CREATE INDEX "verificaciones_estado_idx" ON "verificaciones"("estado");

-- CreateIndex
CREATE INDEX "verificaciones_usuario_id_idx" ON "verificaciones"("usuario_id");

-- CreateIndex
CREATE INDEX "mascotas_dueño_id_idx" ON "mascotas"("dueño_id");

-- CreateIndex
CREATE INDEX "reportes_tipo_estado_idx" ON "reportes"("tipo", "estado");

-- CreateIndex
CREATE INDEX "reportes_latitud_longitud_idx" ON "reportes"("latitud", "longitud");

-- CreateIndex
CREATE INDEX "reportes_reportado_por_idx" ON "reportes"("reportado_por");

-- CreateIndex
CREATE INDEX "reportes_historial_estado_reporte_id_idx" ON "reportes_historial_estado"("reporte_id");

-- CreateIndex
CREATE INDEX "notificaciones_usuario_id_leido_idx" ON "notificaciones"("usuario_id", "leido");

-- CreateIndex
CREATE INDEX "eventos_municipio_id_fecha_idx" ON "eventos"("municipio_id", "fecha");

-- CreateIndex
CREATE INDEX "disponibilidad_veterinario_veterinario_id_dia_semana_idx" ON "disponibilidad_veterinario"("veterinario_id", "dia_semana");

-- CreateIndex
CREATE INDEX "turnos_proveedor_id_franja_inicio_idx" ON "turnos"("proveedor_id", "franja_inicio");

-- CreateIndex
CREATE INDEX "turnos_reservado_por_idx" ON "turnos"("reservado_por");

-- CreateIndex
CREATE INDEX "vitrina_adopcion_municipio_id_estado_idx" ON "vitrina_adopcion"("municipio_id", "estado");

-- CreateIndex
CREATE INDEX "entradas_libreta_sanitaria_mascota_id_fecha_idx" ON "entradas_libreta_sanitaria"("mascota_id", "fecha");

-- CreateIndex
CREATE INDEX "entradas_libreta_sanitaria_veterinario_id_idx" ON "entradas_libreta_sanitaria"("veterinario_id");

-- CreateIndex
CREATE INDEX "solicitudes_recurso_organizacion_id_estado_idx" ON "solicitudes_recurso"("organizacion_id", "estado");

-- CreateIndex
CREATE INDEX "colaboraciones_solicitud_id_idx" ON "colaboraciones"("solicitud_id");

-- CreateIndex
CREATE INDEX "colaboraciones_stakeholder_id_idx" ON "colaboraciones"("stakeholder_id");

-- CreateIndex
CREATE INDEX "productos_veterinario_veterinario_id_idx" ON "productos_veterinario"("veterinario_id");

-- CreateIndex
CREATE INDEX "pedidos_producto_comprador_id_idx" ON "pedidos_producto"("comprador_id");

-- CreateIndex
CREATE INDEX "comercios_latitud_longitud_idx" ON "comercios"("latitud", "longitud");

-- CreateIndex
CREATE INDEX "productos_comercio_comercio_id_idx" ON "productos_comercio"("comercio_id");

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_curso_curso_id_usuario_id_key" ON "inscripciones_curso"("curso_id", "usuario_id");

-- CreateIndex
CREATE INDEX "respuestas_foro_tema_id_idx" ON "respuestas_foro"("tema_id");

-- CreateIndex
CREATE INDEX "cuestionarios_adoptante_usuario_id_idx" ON "cuestionarios_adoptante"("usuario_id");

-- CreateIndex
CREATE INDEX "sugerencias_compatibilidad_cuestionario_id_score_compatibil_idx" ON "sugerencias_compatibilidad"("cuestionario_id", "score_compatibilidad");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfiles_veterinario" ADD CONSTRAINT "perfiles_veterinario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfiles_municipio" ADD CONSTRAINT "perfiles_municipio_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verificaciones" ADD CONSTRAINT "verificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mascotas" ADD CONSTRAINT "mascotas_dueño_id_fkey" FOREIGN KEY ("dueño_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_reportado_por_fkey" FOREIGN KEY ("reportado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_mascota_id_fkey" FOREIGN KEY ("mascota_id") REFERENCES "mascotas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_historial_estado" ADD CONSTRAINT "reportes_historial_estado_reporte_id_fkey" FOREIGN KEY ("reporte_id") REFERENCES "reportes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_reservado_por_fkey" FOREIGN KEY ("reservado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitrina_adopcion" ADD CONSTRAINT "vitrina_adopcion_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

