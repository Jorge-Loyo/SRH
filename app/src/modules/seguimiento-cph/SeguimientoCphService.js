const { ILike, Raw } = require('typeorm');
const logger = require('../../utils/logger');
const { SUB_ESTADO_3_SQL } = require('./seguimientoCphCalc');
const { applyLike, applyDateRange, applyBoolString } = require('../../utils/filterHelpers');

/**
 * SeguimientoCphService — Módulo Seguimiento de Concursos CPH
 *
 * Responsabilidades:
 * - CRUD de seguimiento_cph
 * - Filtrado avanzado por estado, efector, escalafón, nombre/CUIL
 * - Búsqueda textual global
 *
 * IMPORTANTE:
 * - NO maneja HTTP
 * - Repositorio inyectado por constructor
 *
 * Uso:
 *   const service = ServiceFactory.getService(SeguimientoCphService, SeguimientoCph);
 */
class SeguimientoCphService {
  /**
   * @param {import('typeorm').Repository} seguimientoRepository
   * @param {import('typeorm').Repository} bajaRepository
   */
  constructor(seguimientoRepository, bajaRepository) {
    if (!seguimientoRepository) throw new Error('SeguimientoCphService requiere un repositorio de SeguimientoCph');
    this.seguimientoRepository = seguimientoRepository;
    this.bajaRepository        = bajaRepository || null;
  }

  // ─── LIST ────────────────────────────────────────────────────────────────────
  async list(options = {}) {
    const {
      sigla_efector, estado, sub_estado, sub_estado_3, cuil_baja, ee_baja,
      nombre_baja, puesto_1, escalafon_1, usuario,
      origen, tipo_efector, motivo_baja, unificador_puestos,
      escalafon_baja, especialidad_baja,
      escalafon_2, puesto_2, especialidad_solicitada,
      conjuntos, cambio_especialidad, dispo_desierta, tipo_baja,
      examen_publicado, orden_merito, insal,
      // Nuevos
      fecha_baja_desde, fecha_baja_hasta,
      fecha_dispo_desierta_desde, fecha_dispo_desierta_hasta,
      ee_concurso, fecha_ee_concurso_desde, fecha_ee_concurso_hasta,
      if_solicitante, fecha_autorizacion_desde, fecha_autorizacion_hasta,
      sorteo_jurado, disposicion,
      insc_desde_desde, insc_desde_hasta, insc_hasta_desde, insc_hasta_hasta,
      fecha_examen_desde, fecha_examen_hasta,
      fecha_orden_merito_desde, fecha_orden_merito_hasta,
      fecha_ifacs_desde, fecha_ifacs_hasta,
      fecha_insal_desde, fecha_insal_hasta,
      ee_designacion, fecha_ee_designacion_desde, fecha_ee_designacion_hasta,
      nombre_designacion, cuil_designacion, carga_documentacion,
      fecha_apto_medico_desde, fecha_apto_medico_hasta,
      fecha_ite_desde, fecha_ite_hasta,
      reso_a_la_firma, resolucion_designacion,
      fecha_resolucion_desde, fecha_resolucion_hasta,
      fecha_cargo_desde, fecha_cargo_hasta,
      cargo_baja, cargo_sial,
      search, id_baja,
      limit = 50, offset = 0,
      sort = 'id', order = 'DESC',
    } = options;

    const where = {};
    if (id_baja)            where.id_baja            = Number(id_baja);
    applyLike(where, 'sigla_efector', sigla_efector);
    applyLike(where, 'estado', estado);
    applyLike(where, 'sub_estado', sub_estado);
    // sub_estado_3 se filtra calculándolo en vivo (no contra el valor guardado),
    // porque dos de sus ramas dependen de la fecha de hoy y se desactualizan
    // solas con el paso del tiempo si nadie vuelve a guardar el registro.
    if (sub_estado_3)       where.sub_estado_3       = Raw(() => `(${SUB_ESTADO_3_SQL}) LIKE :subEstado3Val`, { subEstado3Val: `%${sub_estado_3}%` });
    applyLike(where, 'cuil_baja', cuil_baja);
    applyLike(where, 'ee_baja', ee_baja);
    applyLike(where, 'nombre_baja', nombre_baja);
    applyLike(where, 'puesto_1', puesto_1);
    applyLike(where, 'escalafon_1', escalafon_1);
    applyLike(where, 'usuario', usuario);
    applyLike(where, 'origen', origen);
    applyLike(where, 'tipo_efector', tipo_efector);
    applyLike(where, 'motivo_baja', motivo_baja);
    applyLike(where, 'unificador_puestos', unificador_puestos);
    applyLike(where, 'escalafon_baja', escalafon_baja);
    applyLike(where, 'especialidad_baja', especialidad_baja);
    applyLike(where, 'escalafon_2', escalafon_2);
    applyLike(where, 'puesto_2', puesto_2);
    applyLike(where, 'especialidad_solicitada', especialidad_solicitada);
    applyLike(where, 'conjuntos', conjuntos);
    applyLike(where, 'cambio_especialidad', cambio_especialidad);
    applyLike(where, 'dispo_desierta', dispo_desierta);
    applyLike(where, 'tipo_baja', tipo_baja);
    applyLike(where, 'ee_concurso', ee_concurso);
    applyLike(where, 'if_solicitante', if_solicitante);
    applyLike(where, 'disposicion', disposicion);
    applyLike(where, 'ee_designacion', ee_designacion);
    applyLike(where, 'nombre_designacion', nombre_designacion);
    applyLike(where, 'cuil_designacion', cuil_designacion);
    applyLike(where, 'resolucion_designacion', resolucion_designacion);
    applyLike(where, 'cargo_baja', cargo_baja);
    applyLike(where, 'cargo_sial', cargo_sial);
    // orden_merito e insal son texto libre (antes booleanos) → búsqueda parcial
    applyLike(where, 'orden_merito', orden_merito);
    applyLike(where, 'insal', insal);
    // Filtros booleanos: string 'true'/'false' → boolean
    applyBoolString(where, 'examen_publicado', examen_publicado);
    applyBoolString(where, 'sorteo_jurado', sorteo_jurado);
    applyBoolString(where, 'carga_documentacion', carga_documentacion);
    applyBoolString(where, 'reso_a_la_firma', reso_a_la_firma);
    // Rangos de fechas
    applyDateRange(where, 'fecha_baja', fecha_baja_desde, fecha_baja_hasta);
    applyDateRange(where, 'fecha_dispo_desierta', fecha_dispo_desierta_desde, fecha_dispo_desierta_hasta);
    applyDateRange(where, 'fecha_ee_concurso', fecha_ee_concurso_desde, fecha_ee_concurso_hasta);
    applyDateRange(where, 'fecha_autorizacion', fecha_autorizacion_desde, fecha_autorizacion_hasta);
    applyDateRange(where, 'fecha_insc_desde', insc_desde_desde, insc_desde_hasta);
    applyDateRange(where, 'fecha_insc_hasta', insc_hasta_desde, insc_hasta_hasta);
    applyDateRange(where, 'fecha_examen', fecha_examen_desde, fecha_examen_hasta);
    applyDateRange(where, 'fecha_orden_merito', fecha_orden_merito_desde, fecha_orden_merito_hasta);
    applyDateRange(where, 'fecha_ifacs', fecha_ifacs_desde, fecha_ifacs_hasta);
    applyDateRange(where, 'fecha_insal', fecha_insal_desde, fecha_insal_hasta);
    applyDateRange(where, 'fecha_ee_designacion', fecha_ee_designacion_desde, fecha_ee_designacion_hasta);
    applyDateRange(where, 'fecha_apto_medico', fecha_apto_medico_desde, fecha_apto_medico_hasta);
    applyDateRange(where, 'fecha_ite', fecha_ite_desde, fecha_ite_hasta);
    applyDateRange(where, 'fecha_resolucion', fecha_resolucion_desde, fecha_resolucion_hasta);
    applyDateRange(where, 'fecha_cargo', fecha_cargo_desde, fecha_cargo_hasta);

    if (search) {
      const [rows, count] = await this.seguimientoRepository.findAndCount({
        where: [
          { ...where, nombre_baja:             ILike(`%${search}%`) },
          { ...where, cuil_baja:               ILike(`%${search}%`) },
          { ...where, ee_baja:                 ILike(`%${search}%`) },
          { ...where, ee_concurso:             ILike(`%${search}%`) },
          { ...where, sigla_efector:           ILike(`%${search}%`) },
          { ...where, descr_efector:           ILike(`%${search}%`) },
          { ...where, cargo:                   ILike(`%${search}%`) },
          { ...where, puesto_1:                ILike(`%${search}%`) },
          { ...where, puesto_2:                ILike(`%${search}%`) },
          { ...where, especialidad_baja:       ILike(`%${search}%`) },
          { ...where, especialidad_solicitada: ILike(`%${search}%`) },
          { ...where, estado:                  ILike(`%${search}%`) },
          { ...where, usuario:                 ILike(`%${search}%`) },
        ],
        order: { [sort]: order },
        skip: offset,
        take: limit,
      });
      return { rows, count };
    }

    const [rows, count] = await this.seguimientoRepository.findAndCount({
      where,
      order: { [sort]: order },
      skip: offset,
      take: limit,
    });
    return { rows, count };
  }

  // ─── GET BY ID ───────────────────────────────────────────────────────────────
  async getById(id) {
    return await this.seguimientoRepository.findOne({ where: { id: Number(id) } });
  }

  // ─── GET BY BAJA ─────────────────────────────────────────────────────────────
  /** Obtiene el seguimiento vinculado a una baja */
  async getByBajaId(idBaja) {
    return await this.seguimientoRepository.findOne({ where: { id_baja: Number(idBaja) } });
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────────
  async create(payload) {
    const entity = this.seguimientoRepository.create(payload);
    return await this.seguimientoRepository.save(entity);
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────────
  async update(id, payload) {
    const existing = await this.seguimientoRepository.findOne({ where: { id: Number(id) } });
    if (!existing) return null;
    await this.seguimientoRepository.update({ id: Number(id) }, payload);
    return await this.seguimientoRepository.findOne({ where: { id: Number(id) } });
  }

  // ─── REMOVE ──────────────────────────────────────────────────────────────────
  async remove(id) {
    const existing = await this.seguimientoRepository.findOne({ where: { id: Number(id) } });
    if (!existing) return null;

    // Eliminar la baja vinculada si existe
    if (existing.id_baja && this.bajaRepository) {
      await this.bajaRepository.delete({ id: Number(existing.id_baja) });
      logger.info('[SeguimientoCphService] Baja vinculada eliminada en cascada', { id_baja: existing.id_baja });
    }

    await this.seguimientoRepository.delete({ id: Number(id) });
    return existing;
  }

  // ─── ESTADOS ÚNICOS ──────────────────────────────────────────────────────────
  async getUniqueEstados() {
    const results = await this.seguimientoRepository
      .createQueryBuilder('s')
      .select('DISTINCT s.estado', 'estado')
      .where('s.estado IS NOT NULL')
      .orderBy('s.estado', 'ASC')
      .getRawMany();
    return results.map((r) => r.estado);
  }

  // ─── STATS POR EFECTOR ───────────────────────────────────────────────────────
  async getStatsByEfector() {
    return await this.seguimientoRepository
      .createQueryBuilder('s')
      .select('s.sigla_efector', 'sigla_efector')
      .addSelect('s.descr_efector', 'descr_efector')
      .addSelect('COUNT(*)', 'total')
      .addSelect("SUM(CASE WHEN s.estado = 'FINALIZADO' THEN 1 ELSE 0 END)", 'finalizados')
      .groupBy('s.sigla_efector')
      .addGroupBy('s.descr_efector')
      .orderBy('total', 'DESC')
      .getRawMany();
  }
}

module.exports = SeguimientoCphService;
