const { ILike } = require('typeorm');
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
      // Designación
      cuil_designado, puesto_designado, expediente_designacion, estado_apto, alta_sial,
      // Baja
      sigla_baja, ex_baja, puesto_baja, especialidad_baja, motivo_baja, carga_horaria,
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
    if (expediente_concurso)      where.expediente_concurso      = ILike(`%${expediente_concurso}%`);
    if (tipificador_obra_servicio) where.tipificador_obra_servicio = ILike(`%${tipificador_obra_servicio}%`);
    if (tipificador_origen)       where.tipificador_origen       = ILike(`%${tipificador_origen}%`);
    if (puesto_solicitado)        where.puesto_solicitado        = ILike(`%${puesto_solicitado}%`);
    if (dispo_llamado)            where.dispo_llamado            = ILike(`%${dispo_llamado}%`);
    // Designación
    if (cuil_designado)           where.cuil_designado           = ILike(`%${cuil_designado}%`);
    if (puesto_designado)         where.puesto_designado         = ILike(`%${puesto_designado}%`);
    if (expediente_designacion)   where.expediente_designacion   = ILike(`%${expediente_designacion}%`);
    if (estado_apto)              where.estado_apto              = ILike(`%${estado_apto}%`);
    if (alta_sial != null && alta_sial !== undefined) where.alta_sial = alta_sial;
    // Baja
    if (sigla_baja)               where.sigla                   = ILike(`%${sigla_baja}%`);
    if (ex_baja)                  where.ex_baja                 = ILike(`%${ex_baja}%`);
    if (puesto_baja)              where.puesto_baja             = ILike(`%${puesto_baja}%`);
    if (especialidad_baja)        where.especialidad_baja       = ILike(`%${especialidad_baja}%`);
    if (motivo_baja)              where.motivo_baja             = ILike(`%${motivo_baja}%`);
    if (carga_horaria)            where.carga_horaria           = ILike(`%${carga_horaria}%`);

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
