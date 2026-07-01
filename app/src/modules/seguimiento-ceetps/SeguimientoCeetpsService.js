const { ILike, Between, MoreThanOrEqual, LessThanOrEqual } = require('typeorm');
const logger = require('../../utils/logger');

class SeguimientoCeetpsService {
  constructor(repo) {
    if (!repo) throw new Error('SeguimientoCeetpsService requiere un repositorio');
    this.repo = repo;
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
    if (sigla_efector)    where.sigla_efector    = ILike(`%${sigla_efector}%`);
    if (estado_concurso)  where.estado_concurso  = ILike(`%${estado_concurso}%`);
    if (usuario)          where.usuario          = ILike(`%${usuario}%`);
    if (cuil)             where.cuil             = ILike(`%${cuil}%`);
    if (id_baja)          where.id_baja          = Number(id_baja);
    // Concurso
    if (expediente_concurso)       where.expediente_concurso      = ILike(`%${expediente_concurso}%`);
    if (tipificador_obra_servicio) where.tipificador_obra_servicio = ILike(`%${tipificador_obra_servicio}%`);
    if (tipificador_origen)        where.tipificador_origen       = ILike(`%${tipificador_origen}%`);
    if (puesto_solicitado)         where.puesto_solicitado        = ILike(`%${puesto_solicitado}%`);
    if (dispo_llamado)             where.dispo_llamado            = ILike(`%${dispo_llamado}%`);
    if (fecha_caratulacion_desde && fecha_caratulacion_hasta) where.fecha_caratulacion = Between(fecha_caratulacion_desde, fecha_caratulacion_hasta);
    else if (fecha_caratulacion_desde) where.fecha_caratulacion = MoreThanOrEqual(fecha_caratulacion_desde);
    else if (fecha_caratulacion_hasta) where.fecha_caratulacion = LessThanOrEqual(fecha_caratulacion_hasta);
    if (fecha_autorizacion_desde && fecha_autorizacion_hasta) where.fecha_autorizacion = Between(fecha_autorizacion_desde, fecha_autorizacion_hasta);
    else if (fecha_autorizacion_desde) where.fecha_autorizacion = MoreThanOrEqual(fecha_autorizacion_desde);
    else if (fecha_autorizacion_hasta) where.fecha_autorizacion = LessThanOrEqual(fecha_autorizacion_hasta);
    if (fecha_ifacs_desde && fecha_ifacs_hasta) where.fecha_ifacs = Between(fecha_ifacs_desde, fecha_ifacs_hasta);
    else if (fecha_ifacs_desde) where.fecha_ifacs = MoreThanOrEqual(fecha_ifacs_desde);
    else if (fecha_ifacs_hasta) where.fecha_ifacs = LessThanOrEqual(fecha_ifacs_hasta);
    if (fecha_insal_desde && fecha_insal_hasta) where.fecha_insal = Between(fecha_insal_desde, fecha_insal_hasta);
    else if (fecha_insal_desde) where.fecha_insal = MoreThanOrEqual(fecha_insal_desde);
    else if (fecha_insal_hasta) where.fecha_insal = LessThanOrEqual(fecha_insal_hasta);
    // Designación
    if (cuil_designado)            where.cuil_designado           = ILike(`%${cuil_designado}%`);
    if (puesto_designado)          where.puesto_designado         = ILike(`%${puesto_designado}%`);
    if (expediente_designacion)    where.expediente_designacion   = ILike(`%${expediente_designacion}%`);
    if (estado_apto)               where.estado_apto              = ILike(`%${estado_apto}%`);
    if (alta_sial != null && alta_sial !== undefined) where.alta_sial = alta_sial;
    if (numero_apto_medico)        where.numero_apto_medico       = ILike(`%${numero_apto_medico}%`);
    if (fecha_proyecto_dispo_desde && fecha_proyecto_dispo_hasta) where.fecha_proyecto_dispo = Between(fecha_proyecto_dispo_desde, fecha_proyecto_dispo_hasta);
    else if (fecha_proyecto_dispo_desde) where.fecha_proyecto_dispo = MoreThanOrEqual(fecha_proyecto_dispo_desde);
    else if (fecha_proyecto_dispo_hasta) where.fecha_proyecto_dispo = LessThanOrEqual(fecha_proyecto_dispo_hasta);
    if (dispo_designacion)         where.dispo_designacion        = ILike(`%${dispo_designacion}%`);
    if (resolucion_designacion)    where.resolucion_designacion   = ILike(`%${resolucion_designacion}%`);
    if (id_cargo)                  where.id_cargo                 = ILike(`%${id_cargo}%`);
    // Baja
    if (sigla_baja)                where.sigla                    = ILike(`%${sigla_baja}%`);
    if (ex_baja)                   where.ex_baja                  = ILike(`%${ex_baja}%`);
    if (puesto_baja)               where.puesto_baja              = ILike(`%${puesto_baja}%`);
    if (especialidad_baja)         where.especialidad_baja        = ILike(`%${especialidad_baja}%`);
    if (motivo_baja)               where.motivo_baja              = ILike(`%${motivo_baja}%`);
    if (carga_horaria)             where.carga_horaria            = ILike(`%${carga_horaria}%`);
    if (cargo)                     where.cargo                    = ILike(`%${cargo}%`);
    if (fecha_baja_desde && fecha_baja_hasta) where.fecha_baja = Between(fecha_baja_desde, fecha_baja_hasta);
    else if (fecha_baja_desde) where.fecha_baja = MoreThanOrEqual(fecha_baja_desde);
    else if (fecha_baja_hasta) where.fecha_baja = LessThanOrEqual(fecha_baja_hasta);
    if (doc_respaldatoria)         where.doc_respaldatoria        = ILike(`%${doc_respaldatoria}%`);

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
    await this.repo.delete({ id: Number(id) });
    return existing;
  }
}

module.exports = SeguimientoCeetpsService;
