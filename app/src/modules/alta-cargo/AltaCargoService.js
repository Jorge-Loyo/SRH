const logger = require('../../utils/logger');

class AltaCargoService {
  constructor(altaRepo, cphRepo, enfRepo, pouRepo, pofRepo) {
    this.altaRepo = altaRepo;
    this.cphRepo  = cphRepo;
    this.enfRepo  = enfRepo;
    this.pouRepo  = pouRepo;
    this.pofRepo  = pofRepo;
  }

  async #nextNumero(manager, target) {
    const repo   = manager.getRepository(target);
    const result = await repo.createQueryBuilder('t').select('MAX(t.numero_unico)', 'max').getRawOne();
    return (result?.max ?? 0) + 1;
  }

  async #nextCodigo(manager, carrera, modalidadCod, tipo) {
    const c = carrera.toUpperCase()
    const m = modalidadCod ? modalidadCod.toUpperCase() : null
    let prefix

    if (c === 'CPH') {
      if      (tipo === 'jefe')        prefix = m ? `CPH-J-${m}` : 'CPH-J'
      else if (tipo === 'director')    prefix = 'CPH-D'
      else if (tipo === 'subdirector') prefix = 'CPH-SD'
      else                             prefix = m ? `CPH-${m}` : 'CPH'
    } else if (c === 'EG') {
      if (tipo === 'jefe_eg')     prefix = 'EG-J'
      else if (tipo === 'gerencial') prefix = 'EG-G'
      else if (tipo === 'director_eg') prefix = 'EG-D'
      else                        prefix = 'EG'
    } else if (c === 'AS') {
      if (tipo === 'ministro')           prefix = 'AS-MIN'
      else if (tipo === 'subsecretaria') prefix = 'AS-SS'
      else if (tipo === 'dir_general')   prefix = 'AS-DG'
      else if (tipo === 'dir_general_adjunta') prefix = 'AS-DGA'
      else                               prefix = 'AS'
    } else if (c === 'RG') {
      prefix = 'RG-CG'
    } else if (c === 'TEC') {
      prefix = m ? `TEC-${m}` : 'TEC'
    } else {
      prefix = c
    }

    const [{ total }] = await manager.query(
      `SELECT COUNT(*) as total FROM new_cargo WHERE codigo LIKE ?`, [`${prefix}-%`]
    )
    const seq = (parseInt(total, 10) + 1).toString().padStart(6, '0')
    return `${prefix}-${seq}`
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────────
  async create(payload) {
    const { carrera_seleccionada, documento, tipo_alta = 'ejecucion', cantidad = 1 } = payload;
    const dataSource = this.altaRepo.manager.connection;

    return await dataSource.transaction(async (manager) => {
      const altaTxRepo = manager.getRepository(this.altaRepo.target);
      const alta       = altaTxRepo.create({
        tipo_alta,
        documento,
        cantidad,
        norma_referencia:  payload.norma_referencia  ?? null,
        nro_resolucion:    payload.nro_resolucion    ?? null,
        documento_origen:  payload.documento_origen  ?? null,
      });
      const savedAlta  = await altaTxRepo.save(alta);

      // ── Resolver IDs normalizados (una sola vez, fuera del loop) ──────────────
      const tipo = payload.tipo_cph ?? payload.tipo_eg ?? payload.tipo_as ?? null;
      const esEstructura = tipo && tipo !== 'ejecucion';

      // id_carrera
      const [carreraRow] = await manager.query(
        `SELECT id_carrera FROM carreras WHERE codigo = ? LIMIT 1`,
        [carrera_seleccionada.toUpperCase()]
      );
      const id_carrera = carreraRow?.id_carrera ?? null;

      // id_modalidad + modalidadCod (para prefijo de código)
      let id_modalidad = null;
      let modalidadCod = null;
      if (carrera_seleccionada === 'tec') {
        modalidadCod = payload.tipo_tec === 'pou' ? 'POU' : 'POF';
        const [modRow] = await manager.query(
          `SELECT id, id_cod FROM modalidades WHERE id_cod = ? AND activo = 1 LIMIT 1`,
          [modalidadCod]
        );
        id_modalidad = modRow?.id ?? null;
      } else if (payload.modalidad) {
        const [modRow] = await manager.query(
          `SELECT id, id_cod FROM modalidades WHERE nombre = ? AND activo = 1 LIMIT 1`,
          [payload.modalidad]
        );
        id_modalidad = modRow?.id ?? null;
        modalidadCod = modRow?.id_cod ?? null;
      }

      // id_especialidad
      let id_especialidad = null;
      if (payload.especialidad && payload.especialidad !== 'No aplica') {
        const [espRow] = await manager.query(
          `SELECT e.id FROM especialidades e JOIN carreras c ON c.id_carrera = e.id_carrera
           WHERE e.nombre = ? AND c.codigo = ? LIMIT 1`,
          [payload.especialidad, carrera_seleccionada.toUpperCase()]
        );
        id_especialidad = espRow?.id ?? null;
      }

      // id_jornada
      let id_jornada = null;
      if (payload.jornada) {
        const [jRow] = await manager.query(`SELECT id FROM jornadas WHERE nombre = ? LIMIT 1`, [payload.jornada]);
        id_jornada = jRow?.id ?? null;
      }

      // id_puesto (CPH, TEC, EG)
      let id_puesto = null;
      if (payload.puesto && ['cph', 'tec', 'eg'].includes(carrera_seleccionada)) {
        const [pRow] = await manager.query(
          `SELECT id FROM puestos_cargo WHERE nombre = ? AND carrera = ? LIMIT 1`,
          [payload.puesto, carrera_seleccionada]
        );
        id_puesto = pRow?.id ?? null;
      }

      // id_tipo_cargo (FK a tipos_cargo)
      let id_tipo_cargo = null;
      if (tipo && tipo !== 'ejecucion') {
        const [tcRow] = await manager.query(
          `SELECT id FROM tipos_cargo WHERE codigo = ? LIMIT 1`, [tipo]
        );
        id_tipo_cargo = tcRow?.id ?? null;
      }

      // id_etiqueta (FK a cargo_etiquetas)
      let id_etiqueta = null;
      if (payload.categoria_interna) {
        const [etRow] = await manager.query(
          `SELECT id FROM cargo_etiquetas WHERE codigo = ? LIMIT 1`, [payload.categoria_interna]
        );
        id_etiqueta = etRow?.id ?? null;
      }

      const codigos = [];
      let detalle = null;

      for (let i = 0; i < cantidad; i++) {
        const codigo = await this.#nextCodigo(manager, carrera_seleccionada, modalidadCod, payload.tipo_cph ?? payload.tipo_eg);

        if (carrera_seleccionada === 'cph') {
          const numero_unico = await this.#nextNumero(manager, this.cphRepo.target);
          const repo = manager.getRepository(this.cphRepo.target);
          detalle = await repo.save(repo.create({
            id_alta: savedAlta.id, modalidad: payload.modalidad,
            puesto: payload.puesto, especialidad: payload.especialidad, numero_unico,
          }));
        } else if (carrera_seleccionada === 'enf') {
          const numero_unico = await this.#nextNumero(manager, this.enfRepo.target);
          const repo = manager.getRepository(this.enfRepo.target);
          detalle = await repo.save(repo.create({ id_alta: savedAlta.id, numero_unico }));
        } else if (carrera_seleccionada === 'tec') {
          const repoTarget = payload.tipo_tec === 'pou' ? this.pouRepo.target : this.pofRepo.target;
          const numero_unico = await this.#nextNumero(manager, repoTarget);
          const repo = manager.getRepository(repoTarget);
          detalle = await repo.save(repo.create({ id_alta: savedAlta.id, puesto: payload.puesto, numero_unico }));
        }

        await manager.query(
          `INSERT INTO new_cargo
             (codigo, sigla, carrera, tipo_cargo, id_tipo_cargo, modalidad, puesto, especialidad,
              cargo_desde, cargo_hasta, antiguedad, estado, situacion_revista,
              id_alta, id_carrera, id_modalidad, id_especialidad, id_puesto, id_jornada,
              categoria_interna, id_etiqueta, norma_referencia, nro_resolucion, documento_origen)
           VALUES (?,?,?,?,?,?,?,?,?,?,'vigente',?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            codigo, payload.sigla, carrera_seleccionada.toUpperCase(),
            tipo,
            id_tipo_cargo,
            payload.modalidad ?? null,
            payload.puesto ?? null,
            payload.especialidad ?? null,
            payload.cargo_desde ?? null,
            payload.cargo_hasta ?? null,
            payload.antiguedad ?? null,
            esEstructura ? 'activo' : null,
            savedAlta.id,
            id_carrera,
            id_modalidad,
            id_especialidad,
            id_puesto,
            id_jornada,
            payload.categoria_interna ?? null,
            id_etiqueta,
            payload.norma_referencia  ?? null,
            payload.nro_resolucion    ?? null,
            payload.documento_origen  ?? null,
          ]
        );
        codigos.push(codigo);
        logger.info('[AltaCargoService] new_cargo insertado', { codigo, id_alta: savedAlta.id, id_carrera, id_modalidad, id_puesto, id_jornada, id_especialidad });
      }

      return { alta: savedAlta, detalle, codigos, sigla: payload.sigla };
    });
  }

  // ─── LIST ────────────────────────────────────────────────────────────────────
  async list({ limit, offset, sort, order }) {
    const [rows, count] = await this.altaRepo.findAndCount({
      order: { [sort]: order }, skip: offset, take: limit,
    });
    return { rows, count };
  }

  // ─── GET BY ID ───────────────────────────────────────────────────────────────
  async getById(id) {
    return await this.altaRepo.findOne({ where: { id: Number(id) } });
  }
}

module.exports = AltaCargoService;
