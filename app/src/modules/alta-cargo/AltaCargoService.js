const logger = require('../../utils/logger');

class AltaCargoService {
  constructor(altaRepo, cphRepo, enfRepo, pouRepo, pofRepo) {
    this.altaRepo = altaRepo;
    this.cphRepo  = cphRepo;
    this.enfRepo  = enfRepo;
    this.pouRepo  = pouRepo;
    this.pofRepo  = pofRepo;
  }

  /** MAX(numero_unico) + 1 para la tabla hija, dentro de la transacción */
  async #nextNumero(manager, target) {
    const repo   = manager.getRepository(target);
    const result = await repo
      .createQueryBuilder('t')
      .select('MAX(t.numero_unico)', 'max')
      .getRawOne();
    return (result?.max ?? 0) + 1;
  }

  /**
   * Genera el código único con nomenclatura:
   *   CPH-P-000001  (con modalidad)
   *   ENF-000001    (sin modalidad)
   * Usa COUNT de registros existentes con ese prefijo para el secuencial.
   */
  async #nextCodigo(manager, carrera, modalidadCod, tipoCph) {
    // CPH-J-P, CPH-D-P, CPH-P, ENF, etc.
    let prefix
    if (carrera.toUpperCase() === 'CPH' && tipoCph && tipoCph !== 'comun') {
      const sufijo = tipoCph === 'jefe' ? 'J' : 'D'
      prefix = modalidadCod
        ? `CPH-${sufijo}-${modalidadCod.toUpperCase()}`
        : `CPH-${sufijo}`
    } else {
      prefix = modalidadCod
        ? `${carrera.toUpperCase()}-${modalidadCod.toUpperCase()}`
        : carrera.toUpperCase()
    }

    const [{ total }] = await manager.query(
      `SELECT COUNT(*) as total FROM new_cargo WHERE codigo LIKE ?`,
      [`${prefix}-%`]
    )
    const seq = (parseInt(total, 10) + 1).toString().padStart(6, '0')
    return `${prefix}-${seq}`
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────────
  async create(payload) {
    const { carrera_seleccionada } = payload;
    const dataSource = this.altaRepo.manager.connection;

    return await dataSource.transaction(async (manager) => {
      const altaTxRepo = manager.getRepository(this.altaRepo.target);

      const alta      = altaTxRepo.create({ carrera_seleccionada });
      const savedAlta = await altaTxRepo.save(alta);

      let detalle = null;

      // Obtener id_cod de modalidad desde la tabla (null para ENF)
      let modalidadCod = null;
      if (payload.modalidad) {
        const [mod] = await manager.query(
          `SELECT id_cod FROM modalidades WHERE nombre = ? AND activo = 1 LIMIT 1`,
          [payload.modalidad]
        );
        modalidadCod = mod?.id_cod ?? null;
      }

      const codigo = await this.#nextCodigo(manager, carrera_seleccionada, modalidadCod, payload.tipo_cph);

      if (carrera_seleccionada === 'cph') {
        const numero_unico = await this.#nextNumero(manager, this.cphRepo.target);
        const repo = manager.getRepository(this.cphRepo.target);
        detalle = await repo.save(repo.create({
          id_alta: savedAlta.id,
          modalidad:    payload.modalidad,
          puesto:       payload.puesto,
          especialidad: payload.especialidad,
          numero_unico,
        }));
        logger.info('[AltaCargoService] CPH creado', { id_alta: savedAlta.id, numero_unico });

      } else if (carrera_seleccionada === 'enf') {
        const numero_unico = await this.#nextNumero(manager, this.enfRepo.target);
        const repo = manager.getRepository(this.enfRepo.target);
        detalle = await repo.save(repo.create({
          id_alta: savedAlta.id,
          nivel_formacion: payload.nivel_formacion,
          numero_unico,
        }));
        logger.info('[AltaCargoService] ENF creado', { id_alta: savedAlta.id, numero_unico });

      } else if (carrera_seleccionada === 'tec') {
        const repoTarget = payload.tipo_tec === 'pou' ? this.pouRepo.target : this.pofRepo.target;
        const numero_unico = await this.#nextNumero(manager, repoTarget);
        const repo = manager.getRepository(repoTarget);
        detalle = await repo.save(repo.create({
          id_alta: savedAlta.id,
          puesto: payload.puesto,
          numero_unico,
        }));
        logger.info('[AltaCargoService] TEC creado', { id_alta: savedAlta.id, numero_unico });
      }

      // Insertar en new_cargo con el código generado
      await manager.query(
        `INSERT INTO new_cargo (codigo, sigla, carrera, modalidad, nivel_formacion, puesto, especialidad, id_alta)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          codigo,
          payload.sigla,
          carrera_seleccionada.toUpperCase(),
          payload.modalidad       ?? null,
          payload.nivel_formacion ?? null,
          payload.puesto          ?? null,
          payload.especialidad    ?? null,
          savedAlta.id,
        ]
      );
      logger.info('[AltaCargoService] new_cargo insertado', { codigo, id_alta: savedAlta.id });

      return { alta: savedAlta, detalle, codigo, sigla: payload.sigla };
    });
  }

  // ─── LIST ────────────────────────────────────────────────────────────────────
  async list({ carrera_seleccionada, limit, offset, sort, order }) {
    const where = {};
    if (carrera_seleccionada) where.carrera_seleccionada = carrera_seleccionada;

    const [rows, count] = await this.altaRepo.findAndCount({
      where,
      order: { [sort]: order },
      skip: offset,
      take: limit,
    });
    return { rows, count };
  }

  // ─── GET BY ID ───────────────────────────────────────────────────────────────
  async getById(id) {
    return await this.altaRepo.findOne({ where: { id: Number(id) } });
  }
}

module.exports = AltaCargoService;
