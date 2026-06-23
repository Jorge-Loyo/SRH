import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

/**
 * Entidad BajaConsolidada - Módulo Bajas
 *
 * Registra las desvinculaciones (bajas) de personal del Sistema de Salud GCABA.
 * Cubre tanto las bajas CPH (médicos/profesionales que generan concurso)
 * como las bajas TEC (técnicos/enfermería que no generan concurso CPH).
 *
 * Regla CPH: es_cph = true cuando genera_concurso = 'SI'
 * y puesto_baja ≠ 'Técnico' y puesto_baja ≠ 'Enfermería'.
 * Cuando es_cph = true, se crea automáticamente un registro en seguimiento_cph.
 */
@Entity({ name: 'bajas_consolidadas' })
@Index(['sigla'])
@Index(['es_cph'])
@Index(['genera_concurso'])
@Index(['cuil'])
export class BajaConsolidada extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number

  // ============ IDENTIFICACIÓN ============
  @Column({ type: 'varchar', length: 100, nullable: true })
  usuario?: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  origen?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  cuil?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  nombre_apellido?: string | null

  // ============ DATOS DEL EFECTOR ============
  @Column({ type: 'varchar', length: 20, nullable: true })
  sigla?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  efector?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  tipo_efector?: string | null

  // ============ DATOS FUNCIONALES ============
  @Column({ type: 'varchar', length: 50, nullable: true })
  codigo_cargo?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  puesto_baja?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  especialidad_baja?: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  partida_presupuestaria?: string | null

  // ============ DATOS ADMINISTRATIVOS ============
  @Column({ type: 'varchar', length: 50, nullable: true })
  escalafon?: string | null

  @Column({ type: 'varchar', length: 10, nullable: true })
  pou_pof?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  unificador_puestos?: string | null

  @Column({ type: 'int', nullable: true })
  codigo_registro?: number | null

  // ============ EXPEDIENTE ============
  @Column({ type: 'varchar', length: 150, nullable: true })
  ex_baja?: string | null

  // ============ DATOS TEMPORALES ============
  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_baja?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  carga_horaria?: string | null

  // ============ VALIDACIÓN ============
  @Column({ type: 'varchar', length: 150, nullable: true })
  motivo_baja?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  doc_respaldatoria?: string | null

  // ============ CIERRE ============
  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_pase_paralelo?: string | null

  @Column({ type: 'varchar', length: 5, nullable: true })
  genera_concurso?: string | null

  // ============ CONCURSO (solo Origen = Ampliación) ============
  @Column({ type: 'varchar', length: 150, nullable: true })
  expediente_concurso?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_generacion?: string | null

  // ============ SIAL ============
  @Column({ type: 'varchar', length: 200, nullable: true })
  cargo_baja?: string | null

  // ============ CAMPO DERIVADO (calculado y guardado) ============
  /** true cuando genera_concurso='SI' y puesto_baja no es Técnico ni Enfermería */
  @Column({ type: 'boolean', default: false })
  es_cph!: boolean

}
