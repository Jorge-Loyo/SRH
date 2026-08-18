import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

/**
 * Entidad SeguimientoCph - Módulo Seguimiento de Concursos CPH
 *
 * Registra el seguimiento completo del proceso concursal CPH para personal
 * del Sistema de Salud GCABA. Los registros se crean automáticamente cuando
 * una baja cumple la regla CPH (genera_concurso=SI y no es Técnico/Enfermería).
 *
 * FK id_baja → bajas_consolidadas.id (nullable para carga manual directa)
 *
 * Estados principales: AUTORIZADO · INSCRIPCION · ETAPA EVAL ·
 * ADJUDI · PROX. A DESIG · DESIERTO · FINALIZADO
 */
@Entity({ name: 'seguimiento_cph' })
@Index(['sigla_efector'])
@Index(['estado'])
@Index(['cuil_baja'])
@Index(['id_baja'])
@Index(['sigla_efector', 'estado'])
@Index(['ee_concurso'])
@Index(['ee_baja'])
@Index(['nombre_baja'])
export class SeguimientoCph extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number

  /** FK hacia bajas_consolidadas.id — null si se cargó sin baja previa */
  @Column({ type: 'int', nullable: true })
  id_baja?: number | null

  // ============ RESPONSABLE ============
  @Column({ type: 'varchar', length: 100, nullable: true })
  usuario?: string | null

  // ============ DATOS DEL EFECTOR ============
  @Column({ type: 'varchar', length: 200, nullable: true })
  descr_efector?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  sigla_efector?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  tipo_efector?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  origen?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  conjuntos?: string | null

  // ============ ESTADO ============
  @Column({ type: 'varchar', length: 50, nullable: true })
  estado?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  sub_estado?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  sub_estado_3?: string | null

  @Column({ type: 'varchar', length: 5, nullable: true })
  cambio_especialidad?: string | null

  @Column({ type: 'varchar', length: 1000, nullable: true })
  doc_cambio_especialidad?: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  tipo_baja?: string | null

  // ============ DATOS DE LA BAJA (copiados automáticamente desde bajas_consolidadas) ============
  @Column({ type: 'varchar', length: 50, nullable: true })
  cargo?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  ee_baja?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  cuil_baja?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  nombre_baja?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_baja?: string | null

  /** Escalafón de la baja (Médico / No Médico) — copiado desde bajas_consolidadas.escalafon */
  @Column({ type: 'varchar', length: 50, nullable: true })
  escalafon_baja?: string | null

  /** POU/POF 1 — clasificación del cargo en el concurso */
  @Column({ type: 'varchar', length: 50, nullable: true })
  escalafon_1?: string | null

  /** Puesto original de la baja */
  @Column({ type: 'varchar', length: 150, nullable: true })
  puesto_1?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  especialidad_baja?: string | null

  /** Campos de contexto copiados desde bajas_consolidadas */
  @Column({ type: 'varchar', length: 20, nullable: true })
  carga_horaria?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  motivo_baja?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  doc_respaldatoria?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_pase_paralelo?: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  partida_presupuestaria?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  unificador_puestos?: string | null

  // ============ DATOS DEL CONCURSO ============
  @Column({ type: 'varchar', length: 150, nullable: true })
  ee_concurso?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_ee_concurso?: string | null

  /** POU/POF 2 — clasificación del cargo solicitado en el concurso */
  @Column({ type: 'varchar', length: 50, nullable: true })
  escalafon_2?: string | null

  /** Puesto solicitado para el concurso */
  @Column({ type: 'varchar', length: 150, nullable: true })
  puesto_2?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  especialidad_solicitada?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  if_solicitante?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_autorizacion?: string | null

  @Column({ type: 'boolean', nullable: true })
  sorteo_jurado?: boolean | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  disposicion?: string | null

  // ============ INSCRIPCIÓN ============
  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_insc_desde?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_insc_hasta?: string | null

  @Column({ type: 'int', nullable: true })
  q_inscriptos?: number | null

  // ============ EXAMEN ============
  @Column({ type: 'boolean', nullable: true })
  examen_publicado?: boolean | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_examen?: string | null

  // ============ ORDEN DE MÉRITO ============
  // Texto libre (antes booleano) — puede llevar referencia/número, no solo Sí/No
  @Column({ type: 'varchar', length: 150, nullable: true })
  orden_merito?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_orden_merito?: string | null

  // ============ IFACS ============
  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_ifacs?: string | null

  // ============ INSAL ============
  // Texto libre (antes booleano) — puede llevar referencia/número, no solo Sí/No
  @Column({ type: 'varchar', length: 150, nullable: true })
  insal?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_insal?: string | null

  // ============ DESIGNACIÓN ============
  @Column({ type: 'varchar', length: 150, nullable: true })
  ee_designacion?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_ee_designacion?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  nombre_designacion?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  cuil_designacion?: string | null

  @Column({ type: 'boolean', nullable: true })
  carga_documentacion?: boolean | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_apto_medico?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_ite?: string | null

  @Column({ type: 'boolean', nullable: true })
  proyecto_resolucion?: boolean | null

  @Column({ type: 'boolean', nullable: true })
  reso_a_la_firma?: boolean | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  resolucion_designacion?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_resolucion?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_cargo?: string | null

  /** Código real de cargo en SIAL (texto, ej: "001712179-3") — antes migrado por error como checkbox */
  @Column({ type: 'varchar', length: 50, nullable: true })
  cargo_sial?: string | null

  // ============ CONTROL ============
  @Column({ type: 'varchar', length: 50, nullable: true })
  dispo_desierta?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_dispo_desierta?: string | null

  @Column({ type: 'varchar', length: 1000, nullable: true })
  observaciones?: string | null

  // ============ VINCULACIÓN POU ============
  @Column({ type: 'varchar', length: 200, nullable: true })
  cargo_baja?: string | null

}
