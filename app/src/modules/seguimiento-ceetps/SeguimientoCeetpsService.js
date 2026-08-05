const { ILike } = require('typeorm');
const logger = require('../../utils/logger');
const { applyLike, applyDateRange } = require('../../utils/filterHelpers');

class SeguimientoCeetpsService {
  constructor(repo, bajaRepository) {
    if (!repo) throw new Error('SeguimientoCeetpsService requiere un repositorio');
    this.repo = repo;
    this.bajaRepository = bajaRepository || null;
  }

  async list(options = {}) {
    const {
      codigo_registro, sigla_efector, estado_concurso,
      usuario, cuil, search, id_baja,
      // Concurso
      expediente_concurso, tipificador_obra_servicio, tipificador_origen,
      puesto_solicitado, dispo_llamado,
      fecha_caratulacion_desde, fecha_caratulacion_hasta,
      fecha_autorizacion_desde, fecha_autorizacion_hasta,
      fecha_ifacs_desde, fecha_ifacs_hasta,
      fecha_insal_desde, fecha_insal_hasta,
      // Designación
      cuil_designado, puesto_designado, expediente_designacion, estado_apto, alta_sial,
      numero_apto_medico, fecha_proyecto_dispo_desde, fecha_proyecto_dispo_hasta,
      dispo_designacion, resolucion_designacion, id_cargo,
      // Baja
      sigla_baja, ex_baja, puesto_baja, especialidad_baja, motivo_baja, carga_horaria,
      cargo, fecha_baja_desde, fecha_baja_hasta, doc_respaldatoria,
      limit = 50, offset = 0,
      sort = 'id', order = 'DESC',
    } = options;

    const where = {};
    if (codigo_registro)  where.codigo_registro  = Number(codigo_registro);
    applyLike(where, 'sigla_efector', sigla_efector);
    applyLike(where, 'estado_concurso', estado_concurso);
    applyLike(where, 'usuario', usuario);
    applyLike(where, 'cuil', cuil);
    if (id_baja)          where.id_baja          = Number(id_baja);
    // Concurso
    applyLike(where, 'expediente_concurso', expediente_concurso);
    applyLike(where, 'tipificador_obra_servicio', tipificador_obra_servicio);
    applyLike(where, 'tipificador_origen', tipificador_origen);
    applyLike(where, 'puesto_solicitado', puesto_solicitado);
    applyLike(where, 'dispo_llamado', dispo_llamado);
    applyDateRange(where, 'fecha_caratulacion', fecha_caratulacion_desde, fecha_caratulacion_hasta);
    applyDateRange(where, 'fecha_autorizacion', fecha_autorizacion_desde, fecha_autorizacion_hasta);
    applyDateRange(where, 'fecha_ifacs', fecha_ifacs_desde, fecha_ifacs_hasta);
    applyDateRange(where, 'fecha_insal', fecha_insal_desde, fecha_insal_hasta);
    // Designación
    applyLike(where, 'cuil_designado', cuil_designado);
    applyLike(where, 'puesto_designado', puesto_designado);
    applyLike(where, 'expediente_designacion', expediente_designacion);
    applyLike(where, 'estado_apto', estado_apto);
    if (alta_sial != null && alta_sial !== undefined) where.alta_sial = alta_sial;
    applyLike(where, 'numero_apto_medico', numero_apto_medico);
    applyDateRange(where, 'fecha_proyecto_dispo', fecha_proyecto_dispo_desde, fecha_proyecto_dispo_hasta);
    applyLike(where, 'dispo_designacion', dispo_designacion);
    applyLike(where, 'resolucion_designacion', resolucion_designacion);
    applyLike(where, 'id_cargo', id_cargo);
    // Baja
    applyLike(where, 'sigla', sigla_baja);
    applyLike(where, 'ex_baja', ex_baja);
    applyLike(where, 'puesto_baja', puesto_baja);
    applyLike(where, 'especialidad_baja', especialidad_baja);
    applyLike(where, 'motivo_baja', motivo_baja);
    applyLike(where, 'carga_horaria', carga_horaria);
    applyLike(where, 'cargo', cargo);
    applyDateRange(where, 'fecha_baja', fecha_baja_desde, fecha_baja_hasta);
    applyLike(where, 'doc_respaldatoria', doc_respaldatoria);

    if (search) {
      const [rows, count] = await this.repo.findAndCount({
        where: [
          { ...where, nombre_apellido_baja:      ILike(`%${search}%`) },
          { ...where, cuil:                      ILike(`%${search}%`) },
          { ...where, nombre_apellido_designado: ILike(`%${search}%`) },
          { ...where, cuil_designado:            ILike(`%${search}%`) },
          { ...where, sigla_efector:             ILike(`%${search}%`) },
          { ...where, descr_efector:             ILike(`%${search}%`) },
          { ...where, expediente_concurso:       ILike(`%${search}%`) },
          { ...where, ex_baja:                   ILike(`%${search}%`) },
          { ...where, cargo:                     ILike(`%${search}%`) },
          { ...where, puesto_baja:               ILike(`%${search}%`) },
          { ...where, puesto_solicitado:         ILike(`%${search}%`) },
          { ...where, puesto_designado:          ILike(`%${search}%`) },
          { ...where, especialidad_baja:         ILike(`%${search}%`) },
          { ...where, estado_concurso:           ILike(`%${search}%`) },
          { ...where, usuario:                   ILike(`%${search}%`) },
        ],
        order: { [sort]: order },
        skip: offset,
        take: limit,
      });
      return { rows, count };
    }

    const [rows, count] = await this.repo.findAndCount({
      where,
      order: { [sort]: order },
      skip: offset,
      take: limit,
    });
    return { rows, count };
  }

  async getById(id) {
    return await this.repo.findOne({ where: { id: Number(id) } });
  }

  async getByBajaId(idBaja) {
    return await this.repo.findOne({ where: { id_baja: Number(idBaja) } });
  }

  async create(payload) {
    const entity = this.repo.create(payload);
    return await this.repo.save(entity);
  }

  async update(id, payload) {
    const existing = await this.repo.findOne({ where: { id: Number(id) } });
    if (!existing) return null;
    await this.repo.update({ id: Number(id) }, payload);
    return await this.repo.findOne({ where: { id: Number(id) } });
  }

  async remove(id) {
    const existing = await this.repo.findOne({ where: { id: Number(id) } });
    if (!existing) return null;

    // Eliminar la baja vinculada si existe (mismo comportamiento que SeguimientoCphService)
    if (existing.id_baja && this.bajaRepository) {
      await this.bajaRepository.delete({ id: Number(existing.id_baja) });
      logger.info('[SeguimientoCeetpsService] Baja vinculada eliminada en cascada', { id_baja: existing.id_baja });
    }

    await this.repo.delete({ id: Number(id) });
    return existing;
  }
}

module.exports = SeguimientoCeetpsService;
