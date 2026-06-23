const { ILike } = require('typeorm');
const logger = require('../../utils/logger');

/**
 * BajaConsolidadaService — Módulo Bajas
 *
 * Responsabilidades:
 * - CRUD de bajas_consolidadas
 * - Evaluación de la Regla CPH y cálculo de es_cph
 * - Creación automática del registro en seguimiento_cph cuando es_cph = true
 * - Filtrado y paginación
 *
 * IMPORTANTE:
 * - NO maneja HTTP (status codes, res.json, etc.)
 * - Repositorios inyectados por constructor (Dependency Injection)
 * - Solo retorna datos o lanza excepciones
 *
 * Uso:
 *   const service = ServiceFactory.getService(BajaConsolidadaService, BajaConsolidada, SeguimientoCph);
 */
class BajaConsolidadaService {
  /**
   * @param {import('typeorm').Repository} bajaRepository
   * @param {import('typeorm').Repository} seguimientoRepository
   * @param {import('typeorm').Repository} seguimientoCeetpsRepository
   */
  constructor(bajaRepository, seguimientoRepository, seguimientoCeetpsRepository) {
    if (!bajaRepository) throw new Error('BajaConsolidadaService requiere un repositorio de BajaConsolidada');
    if (!seguimientoRepository) throw new Error('BajaConsolidadaService requiere un repositorio de SeguimientoCph');
    this.bajaRepository             = bajaRepository;
    this.seguimientoRepository      = seguimientoRepository;
    this.seguimientoCeetpsRepository = seguimientoCeetpsRepository ?? null;
  }

  // ─── Regla CEETPS ────────────────────────────────────────────────────────────
  /**
   * Evalúa si una baja corresponde a CEETPS.
   * Regla: codigo_registro en [87, 85, 83].
   * @param {number|string|null} codigo_registro
   * @returns {boolean}
   */
  static evaluarCeetps(codigo_registro) {
    return [87, 85, 83].includes(Number(codigo_registro));
  }

  // ─── Regla CPH ───────────────────────────────────────────────────────────────
  /**
   * Evalúa si una baja cumple la regla CPH.
   * Regla: codigo_registro = 37 Y genera_concurso = 'SI' Y puesto no es Técnico/Enfermería.
   * @param {string|null} genera_concurso
   * @param {string|null} puesto_baja
   * @param {number|string|null} codigo_registro
   * @returns {boolean}
   */
  static evaluarCph(genera_concurso, puesto_baja, codigo_registro) {
    // Si el código corresponde a CEETPS, no es CPH
    if (BajaConsolidadaService.evaluarCeetps(codigo_registro)) return false;
    if (!genera_concurso || genera_concurso.toUpperCase() !== 'SI') return false;
    if (!puesto_baja) return true; // sin puesto definido, se considera CPH
    const puestoUpper = puesto_baja.toUpperCase();
    return !puestoUpper.includes('TÉCNICO') &&
           !puestoUpper.includes('TECNICO') &&
           !puestoUpper.includes('ENFERMERÍA') &&
           !puestoUpper.includes('ENFERMERIA');
  }

  /**
   * Construye el payload para crear el seguimiento_ceetps a partir de una baja.
   * @param {object} baja - registro de bajas_consolidadas ya guardado
   * @returns {object}
   */
  static buildCeetpsPayload(baja) {
    return {
      id_baja:              baja.id,
      codigo_registro:      baja.codigo_registro,
      sigla_efector:        baja.sigla,
      descr_efector:        baja.efector,
      ex_baja:              baja.ex_baja,
      sigla:                baja.sigla,
      efector:              baja.efector,
      cargo:                baja.codigo_cargo,
      cuil:                 baja.cuil,
      nombre_apellido_baja: baja.nombre_apellido,
      puesto_baja:          baja.puesto_baja,
      especialidad_baja:    baja.especialidad_baja,
      fecha_baja:           baja.fecha_baja,
      carga_horaria:        baja.carga_horaria,
      motivo_baja:          baja.motivo_baja,
      doc_respaldatoria:    baja.doc_respaldatoria,
      expediente_concurso: baja.expediente_concurso,
      fecha_generacion:     baja.fecha_generacion,
    };
  }

  /**
   * Construye el payload para crear el seguimiento_cph a partir de una baja.
   * Mapeo definido en la especificación técnica.
   * @param {object} baja - registro de bajas_consolidadas ya guardado
   * @returns {object}
   */
  static buildSeguimientoPayload(baja) {
    return {
      id_baja:           baja.id,
      usuario:           baja.usuario,
      origen:            baja.origen,
      descr_efector:     baja.efector,
      sigla_efector:     baja.sigla,
      tipo_efector:      baja.tipo_efector,
      cargo:             baja.codigo_cargo,
      ee_baja:           baja.ex_baja,
      cuil_baja:         baja.cuil,
      nombre_baja:       baja.nombre_apellido,
      fecha_baja:        baja.fecha_baja,
      escalafon_baja:    baja.escalafon,
      escalafon_1:       baja.pou_pof,
      puesto_1:          baja.puesto_baja,
      especialidad_baja: baja.especialidad_baja,
      ccoo_especialidad:       baja.ccoo_especialidad,
      cargo_baja:              baja.cargo_baja,
      carga_horaria:           baja.carga_horaria,
      motivo_baja:             baja.motivo_baja,
      doc_respaldatoria:       baja.doc_respaldatoria,
      fecha_pase_paralelo:     baja.fecha_pase_paralelo,
      partida_presupuestaria:  baja.partida_presupuestaria,
      unificador_puestos:      baja.unificador_puestos,
      estado:                  'A-VALID. VCTE',
    };
  }

  // ─── LIST ────────────────────────────────────────────────────────────────────
  /**
   * Lista bajas con paginación y filtros.
   * @param {object} options
   * @returns {Promise<{ rows: object[], count: number }>}
   */
  async list(options = {}) {
    const {
      sigla, cuil, nombre_apellido, puesto_baja, escalafon,
      genera_concurso, es_cph, motivo_baja,
      origen, tipo_efector, unificador_puestos, usuario,
      pou_pof, especialidad_baja,
      search,
      limit = 50, offset = 0,
      sort = 'id', order = 'ASC',
    } = options;

    const where = {};
    if (sigla)              where.sigla              = ILike(`%${sigla}%`);
    if (cuil)               where.cuil               = ILike(`%${cuil}%`);
    if (nombre_apellido)    where.nombre_apellido    = ILike(`%${nombre_apellido}%`);
    if (puesto_baja)        where.puesto_baja        = ILike(`%${puesto_baja}%`);
    if (escalafon)          where.escalafon          = ILike(`%${escalafon}%`);
    if (genera_concurso)    where.genera_concurso    = genera_concurso;
    if (es_cph !== undefined && es_cph !== null) where.es_cph = es_cph;
    if (motivo_baja)        where.motivo_baja        = ILike(`%${motivo_baja}%`);
    if (origen)             where.origen             = ILike(`%${origen}%`);
    if (tipo_efector)       where.tipo_efector       = ILike(`%${tipo_efector}%`);
    if (unificador_puestos) where.unificador_puestos = ILike(`%${unificador_puestos}%`);
    if (usuario)            where.usuario            = ILike(`%${usuario}%`);
    if (pou_pof)            where.pou_pof            = ILike(`%${pou_pof}%`);
    if (especialidad_baja)  where.especialidad_baja  = ILike(`%${especialidad_baja}%`);

    // Búsqueda global: nombre o CUIL
    if (search) {
      const [rowsN, countN] = await this.bajaRepository.findAndCount({
        where: [
          { ...where, nombre_apellido: ILike(`%${search}%`) },
          { ...where, cuil:            ILike(`%${search}%`) },
        ],
        order: { [sort]: order },
        skip: offset,
        take: limit,
      });
      return { rows: rowsN, count: countN };
    }

    const [rows, count] = await this.bajaRepository.findAndCount({
      where,
      order: { [sort]: order },
      skip: offset,
      take: limit,
    });
    return { rows, count };
  }

  // ─── GET BY ID ───────────────────────────────────────────────────────────────
  async getById(id) {
    return await this.bajaRepository.findOne({ where: { id: Number(id) } });
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────────
  /**
   * Crea una baja. Si cumple la regla CPH, crea automáticamente el seguimiento.
   * Ambas operaciones se realizan dentro de una transacción: si el seguimiento
   * falla, se revierte también la baja (atomicidad garantizada).
   * @param {object} payload
   * @returns {Promise<{ baja: object, seguimiento: object|null }>}
   */
  async create(payload) {
    const esCeetps = BajaConsolidadaService.evaluarCeetps(payload.codigo_registro);
    const esCph    = BajaConsolidadaService.evaluarCph(
      payload.genera_concurso,
      payload.puesto_baja,
      payload.codigo_registro,
    );

    const dataSource = this.bajaRepository.manager.connection;

    return await dataSource.transaction(async (manager) => {
      const bajaTxRepo = manager.getRepository(this.bajaRepository.target);
      const segTxRepo  = manager.getRepository(this.seguimientoRepository.target);

      const baja      = bajaTxRepo.create({ ...payload, es_cph: esCph });
      const savedBaja = await bajaTxRepo.save(baja);

      let seguimiento      = null;
      let seguimientoCeetps = null;

      if (esCph) {
        const segPayload = BajaConsolidadaService.buildSeguimientoPayload(savedBaja);
        const segEntity  = segTxRepo.create(segPayload);
        seguimiento      = await segTxRepo.save(segEntity);
        logger.info('[BajaConsolidadaService] Seguimiento CPH creado automáticamente', {
          id_baja: savedBaja.id, id_seguimiento: seguimiento.id,
        });
      } else if (esCeetps && this.seguimientoCeetpsRepository) {
        const ceetpsTxRepo   = manager.getRepository(this.seguimientoCeetpsRepository.target);
        const ceetpsPayload  = BajaConsolidadaService.buildCeetpsPayload(savedBaja);
        const ceetpsEntity   = ceetpsTxRepo.create(ceetpsPayload);
        seguimientoCeetps    = await ceetpsTxRepo.save(ceetpsEntity);
        logger.info('[BajaConsolidadaService] Seguimiento CEETPS creado automáticamente', {
          id_baja: savedBaja.id, id_ceetps: seguimientoCeetps.id,
        });
      }

      return { baja: savedBaja, seguimiento, seguimientoCeetps };
    });
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────────
  /**
   * Actualiza una baja. Recalcula es_cph si cambia genera_concurso o puesto_baja.
   * @param {number} id
   * @param {object} payload
   * @returns {Promise<object|null>}
   */
  async update(id, payload) {
    const existing = await this.bajaRepository.findOne({ where: { id: Number(id) } });
    if (!existing) return null;

    const generaConcurso  = payload.genera_concurso  ?? existing.genera_concurso;
    const puestoBaja      = payload.puesto_baja       ?? existing.puesto_baja;
    const codigoRegistro  = payload.codigo_registro   ?? existing.codigo_registro;
    const esCeetps        = BajaConsolidadaService.evaluarCeetps(codigoRegistro);
    const esCph           = BajaConsolidadaService.evaluarCph(generaConcurso, puestoBaja, codigoRegistro);

    await this.bajaRepository.update({ id: Number(id) }, { ...payload, es_cph: esCph });

    // Recargar la baja ya actualizada para construir el payload completo
    const updatedBaja = await this.bajaRepository.findOne({ where: { id: Number(id) } });

    // ── Gestión del seguimiento CPH ──────────────────────────────────────────
    const existingSeg = await this.seguimientoRepository.findOne({ where: { id_baja: Number(id) } });

    if (esCph && !existingSeg) {
      // La baja pasó a ser CPH → crear seguimiento con todos los datos actuales
      const segPayload = BajaConsolidadaService.buildSeguimientoPayload(updatedBaja);
      const segEntity  = this.seguimientoRepository.create(segPayload);
      await this.seguimientoRepository.save(segEntity);
      logger.info('[BajaConsolidadaService] Seguimiento CPH creado desde update()', { id_baja: id });
    } else if (!esCph && existingSeg) {
      // La baja dejó de ser CPH → eliminar seguimiento
      await this.seguimientoRepository.delete({ id_baja: Number(id) });
      logger.info('[BajaConsolidadaService] Seguimiento CPH eliminado desde update()', { id_baja: id });
    } else if (esCph && existingSeg) {
      // Seguimiento ya existe → sincronizar campos espejo
      const seguimientoFields = {};
      if (payload.usuario             !== undefined) seguimientoFields.usuario               = payload.usuario;
      if (payload.origen              !== undefined) seguimientoFields.origen                = payload.origen;
      if (payload.efector             !== undefined) seguimientoFields.descr_efector          = payload.efector;
      if (payload.sigla               !== undefined) seguimientoFields.sigla_efector          = payload.sigla;
      if (payload.tipo_efector        !== undefined) seguimientoFields.tipo_efector           = payload.tipo_efector;
      if (payload.ex_baja             !== undefined) seguimientoFields.ee_baja                = payload.ex_baja;
      if (payload.cuil                !== undefined) seguimientoFields.cuil_baja              = payload.cuil;
      if (payload.nombre_apellido     !== undefined) seguimientoFields.nombre_baja            = payload.nombre_apellido;
      if (payload.fecha_baja          !== undefined) seguimientoFields.fecha_baja             = payload.fecha_baja;
      if (payload.escalafon           !== undefined) seguimientoFields.escalafon_baja         = payload.escalafon;
      if (payload.pou_pof             !== undefined) seguimientoFields.escalafon_1             = payload.pou_pof;
      if (payload.puesto_baja         !== undefined) seguimientoFields.puesto_1               = payload.puesto_baja;
      if (payload.especialidad_baja   !== undefined) seguimientoFields.especialidad_baja      = payload.especialidad_baja;
      if (payload.codigo_cargo        !== undefined) seguimientoFields.cargo                  = payload.codigo_cargo;
      if (payload.ccoo_especialidad   !== undefined) seguimientoFields.ccoo_especialidad      = payload.ccoo_especialidad;
      if (payload.cargo_baja          !== undefined) seguimientoFields.cargo_baja             = payload.cargo_baja;
      if (payload.carga_horaria       !== undefined) seguimientoFields.carga_horaria          = payload.carga_horaria;
      if (payload.motivo_baja         !== undefined) seguimientoFields.motivo_baja            = payload.motivo_baja;
      if (payload.doc_respaldatoria   !== undefined) seguimientoFields.doc_respaldatoria      = payload.doc_respaldatoria;
      if (payload.fecha_pase_paralelo !== undefined) seguimientoFields.fecha_pase_paralelo    = payload.fecha_pase_paralelo;
      if (payload.partida_presupuestaria !== undefined) seguimientoFields.partida_presupuestaria = payload.partida_presupuestaria;
      if (payload.unificador_puestos  !== undefined) seguimientoFields.unificador_puestos     = payload.unificador_puestos;
      if (Object.keys(seguimientoFields).length > 0) {
        await this.seguimientoRepository.update({ id_baja: Number(id) }, seguimientoFields);
      }
    }

    // ── Gestión del seguimiento CEETPS ───────────────────────────────────────
    if (this.seguimientoCeetpsRepository) {
      const existingCeetps = await this.seguimientoCeetpsRepository.findOne({ where: { id_baja: Number(id) } });

      if (esCeetps && !existingCeetps) {
        const ceetpsPayload = BajaConsolidadaService.buildCeetpsPayload(updatedBaja);
        const ceetpsEntity  = this.seguimientoCeetpsRepository.create(ceetpsPayload);
        await this.seguimientoCeetpsRepository.save(ceetpsEntity);
        logger.info('[BajaConsolidadaService] Seguimiento CEETPS creado desde update()', { id_baja: id });
      } else if (!esCeetps && existingCeetps) {
        await this.seguimientoCeetpsRepository.delete({ id_baja: Number(id) });
        logger.info('[BajaConsolidadaService] Seguimiento CEETPS eliminado desde update()', { id_baja: id });
      } else if (esCeetps && existingCeetps) {
        const syncFields = {};
        if (payload.usuario           !== undefined) syncFields.usuario           = payload.usuario;
        if (payload.sigla             !== undefined) { syncFields.sigla_efector   = payload.sigla; syncFields.sigla = payload.sigla; }
        if (payload.efector           !== undefined) { syncFields.descr_efector   = payload.efector; syncFields.efector = payload.efector; }
        if (payload.ex_baja           !== undefined) syncFields.ex_baja           = payload.ex_baja;
        if (payload.cuil              !== undefined) syncFields.cuil              = payload.cuil;
        if (payload.nombre_apellido   !== undefined) syncFields.nombre_apellido_baja = payload.nombre_apellido;
        if (payload.codigo_cargo      !== undefined) syncFields.cargo             = payload.codigo_cargo;
        if (payload.puesto_baja       !== undefined) syncFields.puesto_baja       = payload.puesto_baja;
        if (payload.especialidad_baja !== undefined) syncFields.especialidad_baja = payload.especialidad_baja;
        if (payload.fecha_baja        !== undefined) syncFields.fecha_baja        = payload.fecha_baja;
        if (payload.carga_horaria     !== undefined) syncFields.carga_horaria     = payload.carga_horaria;
        if (payload.motivo_baja       !== undefined) syncFields.motivo_baja       = payload.motivo_baja;
        if (payload.doc_respaldatoria !== undefined) syncFields.doc_respaldatoria = payload.doc_respaldatoria;
        if (payload.codigo_registro   !== undefined) syncFields.codigo_registro   = payload.codigo_registro;
        if (payload.fecha_generacion  !== undefined) syncFields.fecha_generacion  = payload.fecha_generacion;
        // expediente_concurso: no pisar el valor ya cargado en CEETPS si en la Baja todavía no se cargó nada
        if (payload.expediente_concurso) syncFields.expediente_concurso = payload.expediente_concurso;
        if (Object.keys(syncFields).length > 0) {
          await this.seguimientoCeetpsRepository.update({ id_baja: Number(id) }, syncFields);
        }
      }
    }

    return updatedBaja;
  }

  // ─── REMOVE ──────────────────────────────────────────────────────────────────
  async remove(id) {
    const existing = await this.bajaRepository.findOne({ where: { id: Number(id) } });
    if (!existing) return null;

    // Eliminar seguimientos vinculados antes de borrar la baja
    await this.seguimientoRepository.delete({ id_baja: Number(id) });
    if (this.seguimientoCeetpsRepository) {
      await this.seguimientoCeetpsRepository.delete({ id_baja: Number(id) });
    }

    await this.bajaRepository.delete({ id: Number(id) });
    return existing;
  }
}

module.exports = BajaConsolidadaService;
