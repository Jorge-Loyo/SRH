const { ILike, Between, MoreThanOrEqual, LessThanOrEqual, Raw } = require('typeorm');
const logger = require('../../utils/logger');
const { SUB_ESTADO_3_SQL } = require('./seguimientoCphCalc');

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
      suspendido, examen_publicado, orden_merito, insal,
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
    if (sigla_efector)      where.sigla_efector      = ILike(`%${sigla_efector}%`);
    if (estado)             where.estado             = ILike(`%${estado}%`);
    if (sub_estado)         where.sub_estado         = ILike(`%${sub_estado}%`);
    // sub_estado_3 se filtra calculándolo en vivo (no contra el valor guardado),
    // porque dos de sus ramas dependen de la fecha de hoy y se desactualizan
    // solas con el paso del tiempo si nadie vuelve a guardar el registro.
    if (sub_estado_3)       where.sub_estado_3       = Raw(() => `(${SUB_ESTADO_3_SQL}) LIKE :subEstado3Val`, { subEstado3Val: `%${sub_estado_3}%` });
    if (cuil_baja)          where.cuil_baja          = ILike(`%${cuil_baja}%`);
    if (ee_baja)            where.ee_baja            = ILike(`%${ee_baja}%`);
    if (nombre_baja)        where.nombre_baja        = ILike(`%${nombre_baja}%`);
    if (puesto_1)           where.puesto_1           = ILike(`%${puesto_1}%`);
    if (escalafon_1)        where.escalafon_1        = ILike(`%${escalafon_1}%`);
    if (usuario)            where.usuario            = ILike(`%${usuario}%`);
    if (origen)                  where.origen                  = ILike(`%${origen}%`);
    if (tipo_efector)            where.tipo_efector            = ILike(`%${tipo_efector}%`);
    if (motivo_baja)             where.motivo_baja             = ILike(`%${motivo_baja}%`);
    if (unificador_puestos)      where.unificador_puestos      = ILike(`%${unificador_puestos}%`);
    if (escalafon_baja)          where.escalafon_baja          = ILike(`%${escalafon_baja}%`);
    if (especialidad_baja)       where.especialidad_baja       = ILike(`%${especialidad_baja}%`);
    if (escalafon_2)             where.escalafon_2             = ILike(`%${escalafon_2}%`);
    if (puesto_2)                where.puesto_2                = ILike(`%${puesto_2}%`);
    if (especialidad_solicitada) where.especialidad_solicitada = ILike(`%${especialidad_solicitada}%`);
    if (conjuntos)               where.conjuntos               = ILike(`%${conjuntos}%`);
    if (cambio_especialidad)     where.cambio_especialidad     = ILike(`%${cambio_especialidad}%`);
    if (dispo_desierta)          where.dispo_desierta          = ILike(`%${dispo_desierta}%`);
    if (tipo_baja)               where.tipo_baja               = ILike(`%${tipo_baja}%`);
    if (ee_concurso)             where.ee_concurso             = ILike(`%${ee_concurso}%`);
    if (if_solicitante)          where.if_solicitante          = ILike(`%${if_solicitante}%`);
    if (disposicion)             where.disposicion             = ILike(`%${disposicion}%`);
    if (ee_designacion)          where.ee_designacion          = ILike(`%${ee_designacion}%`);
    if (nombre_designacion)      where.nombre_designacion      = ILike(`%${nombre_designacion}%`);
    if (cuil_designacion)        where.cuil_designacion        = ILike(`%${cuil_designacion}%`);
    if (resolucion_designacion)  where.resolucion_designacion  = ILike(`%${resolucion_designacion}%`);
    if (cargo_baja)              where.cargo_baja              = ILike(`%${cargo_baja}%`);
    if (cargo_sial)              where.cargo_sial              = ILike(`%${cargo_sial}%`);
    // Filtros booleanos: string 'true'/'false' → boolean
    if (suspendido === 'true')           where.suspendido           = true;
    if (suspendido === 'false')          where.suspendido           = false;
    if (examen_publicado === 'true')     where.examen_publicado     = true;
    if (examen_publicado === 'false')    where.examen_publicado     = false;
    if (orden_merito === 'true')         where.orden_merito         = true;
    if (orden_merito === 'false')        where.orden_merito         = false;
    if (insal === 'true')                where.insal                = true;
    if (insal === 'false')               where.insal                = false;
    if (sorteo_jurado === 'true')        where.sorteo_jurado        = true;
    if (sorteo_jurado === 'false')       where.sorteo_jurado        = false;
    if (carga_documentacion === 'true')  where.carga_documentacion  = true;
    if (carga_documentacion === 'false') where.carga_documentacion  = false;
    if (reso_a_la_firma === 'true')      where.reso_a_la_firma      = true;
    if (reso_a_la_firma === 'false')     where.reso_a_la_firma      = false;
    // Rangos de fechas
    if (fecha_baja_desde && fecha_baja_hasta) where.fecha_baja = Between(fecha_baja_desde, fecha_baja_hasta);
    else if (fecha_baja_desde) where.fecha_baja = MoreThanOrEqual(fecha_baja_desde);
    else if (fecha_baja_hasta) where.fecha_baja = LessThanOrEqual(fecha_baja_hasta);
    if (fecha_dispo_desierta_desde && fecha_dispo_desierta_hasta) where.fecha_dispo_desierta = Between(fecha_dispo_desierta_desde, fecha_dispo_desierta_hasta);
    else if (fecha_dispo_desierta_desde) where.fecha_dispo_desierta = MoreThanOrEqual(fecha_dispo_desierta_desde);
    else if (fecha_dispo_desierta_hasta) where.fecha_dispo_desierta = LessThanOrEqual(fecha_dispo_desierta_hasta);
    if (fecha_ee_concurso_desde && fecha_ee_concurso_hasta) where.fecha_ee_concurso = Between(fecha_ee_concurso_desde, fecha_ee_concurso_hasta);
    else if (fecha_ee_concurso_desde) where.fecha_ee_concurso = MoreThanOrEqual(fecha_ee_concurso_desde);
    else if (fecha_ee_concurso_hasta) where.fecha_ee_concurso = LessThanOrEqual(fecha_ee_concurso_hasta);
    if (fecha_autorizacion_desde && fecha_autorizacion_hasta) where.fecha_autorizacion = Between(fecha_autorizacion_desde, fecha_autorizacion_hasta);
    else if (fecha_autorizacion_desde) where.fecha_autorizacion = MoreThanOrEqual(fecha_autorizacion_desde);
    else if (fecha_autorizacion_hasta) where.fecha_autorizacion = LessThanOrEqual(fecha_autorizacion_hasta);
    if (insc_desde_desde && insc_desde_hasta) where.fecha_insc_desde = Between(insc_desde_desde, insc_desde_hasta);
    else if (insc_desde_desde) where.fecha_insc_desde = MoreThanOrEqual(insc_desde_desde);
    else if (insc_desde_hasta) where.fecha_insc_desde = LessThanOrEqual(insc_desde_hasta);
    if (insc_hasta_desde && insc_hasta_hasta) where.fecha_insc_hasta = Between(insc_hasta_desde, insc_hasta_hasta);
    else if (insc_hasta_desde) where.fecha_insc_hasta = MoreThanOrEqual(insc_hasta_desde);
    else if (insc_hasta_hasta) where.fecha_insc_hasta = LessThanOrEqual(insc_hasta_hasta);
    if (fecha_examen_desde && fecha_examen_hasta) where.fecha_examen = Between(fecha_examen_desde, fecha_examen_hasta);
    else if (fecha_examen_desde) where.fecha_examen = MoreThanOrEqual(fecha_examen_desde);
    else if (fecha_examen_hasta) where.fecha_examen = LessThanOrEqual(fecha_examen_hasta);
    if (fecha_orden_merito_desde && fecha_orden_merito_hasta) where.fecha_orden_merito = Between(fecha_orden_merito_desde, fecha_orden_merito_hasta);
    else if (fecha_orden_merito_desde) where.fecha_orden_merito = MoreThanOrEqual(fecha_orden_merito_desde);
    else if (fecha_orden_merito_hasta) where.fecha_orden_merito = LessThanOrEqual(fecha_orden_merito_hasta);
    if (fecha_ifacs_desde && fecha_ifacs_hasta) where.fecha_ifacs = Between(fecha_ifacs_desde, fecha_ifacs_hasta);
    else if (fecha_ifacs_desde) where.fecha_ifacs = MoreThanOrEqual(fecha_ifacs_desde);
    else if (fecha_ifacs_hasta) where.fecha_ifacs = LessThanOrEqual(fecha_ifacs_hasta);
    if (fecha_insal_desde && fecha_insal_hasta) where.fecha_insal = Between(fecha_insal_desde, fecha_insal_hasta);
    else if (fecha_insal_desde) where.fecha_insal = MoreThanOrEqual(fecha_insal_desde);
    else if (fecha_insal_hasta) where.fecha_insal = LessThanOrEqual(fecha_insal_hasta);
    if (fecha_ee_designacion_desde && fecha_ee_designacion_hasta) where.fecha_ee_designacion = Between(fecha_ee_designacion_desde, fecha_ee_designacion_hasta);
    else if (fecha_ee_designacion_desde) where.fecha_ee_designacion = MoreThanOrEqual(fecha_ee_designacion_desde);
    else if (fecha_ee_designacion_hasta) where.fecha_ee_designacion = LessThanOrEqual(fecha_ee_designacion_hasta);
    if (fecha_apto_medico_desde && fecha_apto_medico_hasta) where.fecha_apto_medico = Between(fecha_apto_medico_desde, fecha_apto_medico_hasta);
    else if (fecha_apto_medico_desde) where.fecha_apto_medico = MoreThanOrEqual(fecha_apto_medico_desde);
    else if (fecha_apto_medico_hasta) where.fecha_apto_medico = LessThanOrEqual(fecha_apto_medico_hasta);
    if (fecha_ite_desde && fecha_ite_hasta) where.fecha_ite = Between(fecha_ite_desde, fecha_ite_hasta);
    else if (fecha_ite_desde) where.fecha_ite = MoreThanOrEqual(fecha_ite_desde);
    else if (fecha_ite_hasta) where.fecha_ite = LessThanOrEqual(fecha_ite_hasta);
    if (fecha_resolucion_desde && fecha_resolucion_hasta) where.fecha_resolucion = Between(fecha_resolucion_desde, fecha_resolucion_hasta);
    else if (fecha_resolucion_desde) where.fecha_resolucion = MoreThanOrEqual(fecha_resolucion_desde);
    else if (fecha_resolucion_hasta) where.fecha_resolucion = LessThanOrEqual(fecha_resolucion_hasta);
    if (fecha_cargo_desde && fecha_cargo_hasta) where.fecha_cargo = Between(fecha_cargo_desde, fecha_cargo_hasta);
    else if (fecha_cargo_desde) where.fecha_cargo = MoreThanOrEqual(fecha_cargo_desde);
    else if (fecha_cargo_hasta) where.fecha_cargo = LessThanOrEqual(fecha_cargo_hasta);

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
      .addSelect("SUM(CASE WHEN s.suspendido = TRUE THEN 1 ELSE 0 END)", 'suspendidos')
      .groupBy('s.sigla_efector')
      .addGroupBy('s.descr_efector')
      .orderBy('total', 'DESC')
      .getRawMany();
  }
}

module.exports = SeguimientoCphService;
