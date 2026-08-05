import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

/**
 * Entidad SeguimientoCeetps - Módulo Seguimiento de Concursos CEETPS
 *
 * Registra el seguimiento del proceso concursal para enfermeros (87),
 * técnicos (85) y administrativos (83) del Sistema de Salud GCABA.
 *
 * Los registros se crean automáticamente cuando se guarda una baja
 * con codigo_registro en [87, 85, 83].
 */
@Entity({ name: 'seguimiento_ceetps' })
@Index(['sigla_efector'])
@Index(['codigo_registro'])
@Index(['id_baja'])
@Index(['cuil'])
@Index(['expediente_concurso'])
@Index(['estado_concurso'])
export class SeguimientoCeetps extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number

  /** FK hacia bajas_consolidadas.id — null si se cargó sin baja previa */
  @Column({ type: 'int', nullable: true })
  id_baja?: number | null

  /** Código que determina la categoría: 87=Enfermeros, 85=Técnicos, 83=Administrativos */
  @Column({ type: 'int', nullable: true })
  codigo_registro?: number | null

  // ============ RESPONSABLE ============
  @Column({ type: 'varchar', length: 100, nullable: true })
  usuario?: string | null

  // ============ DATOS DEL EFECTOR ============
  @Column({ type: 'varchar', length: 20, nullable: true })
  sigla_efector?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  descr_efector?: string | null

  // ============ CONCURSO ============
  @Column({ type: 'varchar', length: 200, nullable: true })
  tipificador_obra_servicio?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  tipificador_origen?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_caratulacion?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  expediente_concurso?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_autorizacion?: string | null

  @Column({ type: 'varchar', length: 3, nullable: true })
  cambio_especialidad?: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  doc_cambio_especialidad?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  puesto_solicitado?: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  dispo_llamado?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_ifacs?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_insal?: string | null

  // ============ ESTADO ============
  @Column({ type: 'varchar', length: 100, nullable: true })
  estado_concurso?: string | null

  // ============ DESIGNACIÓN ============
  @Column({ type: 'varchar', length: 150, nullable: true })
  expediente_designacion?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  puesto_designado?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  cuil_designado?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  nombre_apellido_designado?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  estado_apto?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  numero_apto_medico?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_proyecto_dispo?: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  dispo_designacion?: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  resolucion_designacion?: string | null

  @Column({ type: 'boolean', nullable: true })
  alta_sial?: boolean | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  id_cargo?: string | null

  // ============ OBSERVACIONES ============
  @Column({ type: 'varchar', length: 1000, nullable: true })
  observaciones?: string | null

  // ============ DATOS DE LA BAJA (copiados desde bajas_consolidadas) ============
  @Column({ type: 'varchar', length: 150, nullable: true })
  ex_baja?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  sigla?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  efector?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  cargo?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  cuil?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  nombre_apellido_baja?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  puesto_baja?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  especialidad_baja?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_baja?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  carga_horaria?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  motivo_baja?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  doc_respaldatoria?: string | null
}
