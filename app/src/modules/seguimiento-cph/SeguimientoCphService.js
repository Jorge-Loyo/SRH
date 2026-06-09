const { ILike } = require('typeorm');
const logger = require('../../utils/logger');

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
      suspendido, examen_publicado, orden_merito, insal, cargo_sial,
      search, id_baja,
      limit = 50, offset = 0,
      sort = 'id', order = 'DESC',
    } = options;

    const where = {};
    if (id_baja)            where.id_baja            = Number(id_baja);
    if (sigla_efector)      where.sigla_efector      = ILike(`%${sigla_efector}%`);
    if (estado)             where.estado             = ILike(`%${estado}%`);
    if (sub_estado)         where.sub_estado         = ILike(`%${sub_estado}%`);
    if (sub_estado_3)       where.sub_estado_3       = ILike(`%${sub_estado_3}%`);
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
    // Filtros booleanos: string 'true'/'false' → boolean
    if (suspendido === 'true')       where.suspendido       = true;
    if (suspendido === 'false')      where.suspendido       = false;
    if (examen_publicado === 'true') where.examen_publicado = true;
    if (examen_publicado === 'false') where.examen_publicado = false;
    if (orden_merito === 'true')     where.orden_merito     = true;
    if (orden_merito === 'false')    where.orden_merito     = false;
    if (insal === 'true')            where.insal            = true;
    if (insal === 'false')           where.insal            = false;
    if (cargo_sial === 'true')       where.cargo_sial       = true;
    if (cargo_sial === 'false')      where.cargo_sial       = false;

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
