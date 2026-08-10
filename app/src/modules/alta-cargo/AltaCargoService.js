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
      if      (tipo === 'jefe')        prefix = 'EG-J'
      else if (tipo === 'director')    prefix = 'EG-D'
      else if (tipo === 'gerencial')   prefix = 'EG-CG'
      else                             prefix = 'EG'
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

      // Obtener id_cod de modalidad
      let modalidadCod = null;
      if (payload.modalidad) {
        const [mod] = await manager.query(
          `SELECT id_cod FROM modalidades WHERE nombre = ? AND activo = 1 LIMIT 1`,
          [payload.modalidad]
        );
        modalidadCod = mod?.id_cod ?? null;
      }
      // Para TEC el modalidadCod viene del tipo (pou/pof)
      if (carrera_seleccionada === 'tec') {
        modalidadCod = payload.tipo_tec === 'pou' ? 'POU' : 'POF';
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
        // EG no tiene tabla de registro propia por ahora

        const tipo    = payload.tipo_cph ?? payload.tipo_eg ?? null;
        const esEstructura = tipo && tipo !== 'ejecucion'

        // Resolver id_jornada desde nombre si viene como texto
        let id_jornada = payload.id_jornada ?? null
        if (!id_jornada && payload.jornada) {
          const [jRow] = await manager.query(`SELECT id FROM jornadas WHERE nombre = ? LIMIT 1`, [payload.jornada])
          id_jornada = jRow?.id ?? null
        }

        // Resolver id_puesto para TEC desde id_puesto_tec o puesto texto
        let id_puesto = payload.id_puesto ?? null
        if (!id_puesto && carrera_seleccionada === 'tec' && payload.puesto) {
          const [pRow] = await manager.query(`SELECT id FROM puestos_cargo WHERE nombre = ? AND carrera = 'tec' LIMIT 1`, [payload.puesto])
          id_puesto = pRow?.id ?? null
        }

        await manager.query(
          `INSERT INTO new_cargo (codigo, sigla, carrera, modalidad, nivel_formacion, puesto, especialidad, cargo_desde, cargo_hasta, antiguedad, estado, situacion_revista, id_alta, categoria_interna, id_jornada, id_puesto, norma_referencia, nro_resolucion, documento_origen)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'vigente', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            codigo, payload.sigla, carrera_seleccionada.toUpperCase(),
            payload.modalidad ?? null, null,
            payload.puesto ?? null, payload.especialidad ?? null,
            payload.cargo_desde ?? null, payload.cargo_hasta ?? null,
            payload.antiguedad ?? null,
            esEstructura ? 'activo' : null,
            savedAlta.id,
            payload.categoria_interna ?? null,
            id_jornada,
            id_puesto,
            payload.norma_referencia  ?? null,
            payload.nro_resolucion    ?? null,
            payload.documento_origen  ?? null,
          ]
        );
        codigos.push(codigo);
        logger.info('[AltaCargoService] new_cargo insertado', { codigo, id_alta: savedAlta.id });
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
