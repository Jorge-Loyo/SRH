import { BaseEntity, Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm'
import { Sigla } from './Sigla'

/**
 * Entidad Concurso - Gestión de procesos concursales
 *
 * Almacena información de procesos concursales y de ampliación de planta
 * para la gestión de recursos humanos en el sistema de salud.
 *
 * Características:
 * - ID único de concurso
 * - Vinculación con hospital (Sigla)
 * - Seguimiento de bajas (empleado que se va) - 7 campos
 * - Seguimiento de concurso - 13 campos (2 subsecciones)
 * - Seguimiento de designación - 7 campos (2 subsecciones)
 * - Estado del proceso
 *
 * Auditoría: Tabla auditada automáticamente por middleware
 */
@Entity({ name: 'concursos' })
@Index(['sigla']) // Búsqueda por hospital
@Index(['estado']) // Filtro por estado
@Index(['sigla', 'estado']) // Filtro combinado hospital + estado
export class Concurso extends BaseEntity {
  @PrimaryColumn('int')
  id_concurso!: number

  @Column({ type: 'varchar', length: 20 })
  sigla!: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  estado?: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  sub_estado?: string | null

  // ============ SECCIÓN BAJA (7 campos) ============
  @Column({ type: 'varchar', length: 150, nullable: true })
  ee_baja?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  cuil_baja?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  nombre_baja?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  fecha_baja?: string | null

  @Column({ type: 'varchar', length: 10, nullable: true })
  escalafon_baja?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  puesto_baja?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  especialidad_baja?: string | null

  // ============ SECCIÓN CONCURSO - SUBSECCIÓN 1 (7 campos) ============
  @Column({ type: 'varchar', length: 150, nullable: true })
  ee_concurso?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_ee_concurso?: string | null

  @Column({ type: 'varchar', length: 10, nullable: true })
  escalafon_concurso?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  puesto_alta?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  especialidad_solicitada_de_alta?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  fecha_autorizacion?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  sorteo_de_jurado?: string | null

  // ============ SECCIÓN CONCURSO - SUBSECCIÓN 2 (6 campos) ============
  @Column({ type: 'varchar', length: 100, nullable: true })
  disposicion_concurso?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_desde?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_hasta?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_examen?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  orden_merito?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_orden_merito?: string | null

  // ============ SECCIÓN DESIGNACIÓN - SUBSECCIÓN 1 (5 campos) ============
  @Column({ type: 'varchar', length: 100, nullable: true })
  expediente_designacion?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_expediente_designacion?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  nombre_designacion?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  cuil_designacion?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_apto_medico?: string | null

  // ============ SECCIÓN DESIGNACIÓN - SUBSECCIÓN 2 (2 campos) ============
  @Column({ type: 'varchar', length: 100, nullable: true })
  resolucion_designacion?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_resolucion?: string | null

  // ============ CAMPOS ADICIONALES ============
  @Column({ type: 'varchar', length: 450, nullable: true })
  observaciones?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  codigo_cargo?: string | null

  // ============ CAMPOS NUEVOS ============
  @Column({ type: 'varchar', length: 50, nullable: true })
  recorridas?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  origen?: string | null

  // Timestamps de auditoría (auto-gestionados por BD)
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at!: Date
}
