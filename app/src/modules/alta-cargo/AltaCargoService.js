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

  async #nextCodigo(manager, carrera, modalidadCod, tipoCph) {
    let prefix;
    if (carrera.toUpperCase() === 'CPH' && tipoCph && tipoCph !== 'ejecucion') {
      const sufijo = tipoCph === 'jefe' ? 'J' : 'D';
      prefix = modalidadCod ? `CPH-${sufijo}-${modalidadCod.toUpperCase()}` : `CPH-${sufijo}`;
    } else {
      prefix = modalidadCod ? `${carrera.toUpperCase()}-${modalidadCod.toUpperCase()}` : carrera.toUpperCase();
    }
    const [{ total }] = await manager.query(
      `SELECT COUNT(*) as total FROM new_cargo WHERE codigo LIKE ?`, [`${prefix}-%`]
    );
    const seq = (parseInt(total, 10) + 1).toString().padStart(6, '0');
    return `${prefix}-${seq}`;
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────────
  async create(payload) {
    const { carrera_seleccionada, expediente, cantidad = 1 } = payload;
    const dataSource = this.altaRepo.manager.connection;

    return await dataSource.transaction(async (manager) => {
      const altaTxRepo = manager.getRepository(this.altaRepo.target);
      const alta       = altaTxRepo.create({
        carrera_seleccionada,
        expediente,
        cantidad,
        categoria_interna:  payload.categoria_interna  ?? null,
        jornada:            payload.jornada            ?? null,
        norma_referencia:   payload.norma_referencia   ?? null,
        nro_resolucion:     payload.nro_resolucion     ?? null,
        expediente_origen:  payload.expediente_origen  ?? null,
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

      const codigos = [];
      let detalle = null;

      for (let i = 0; i < cantidad; i++) {
        const codigo = await this.#nextCodigo(manager, carrera_seleccionada, modalidadCod, payload.tipo_cph);

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
          detalle = await repo.save(repo.create({
            id_alta: savedAlta.id, nivel_formacion: payload.nivel_formacion, numero_unico,
          }));
        } else if (carrera_seleccionada === 'tec') {
          const repoTarget = payload.tipo_tec === 'pou' ? this.pouRepo.target : this.pofRepo.target;
          const numero_unico = await this.#nextNumero(manager, repoTarget);
          const repo = manager.getRepository(repoTarget);
          detalle = await repo.save(repo.create({
            id_alta: savedAlta.id, puesto: payload.puesto, numero_unico,
          }));
        }

        const tipoCph = payload.tipo_cph || null;
        const esCphJD  = carrera_seleccionada.toUpperCase() === 'CPH' && tipoCph && tipoCph !== 'ejecucion';

        await manager.query(
          `INSERT INTO new_cargo (codigo, sigla, carrera, modalidad, nivel_formacion, puesto, especialidad, cargo_desde, cargo_hasta, antiguedad, estado, situacion_revista, id_alta, categoria_interna, jornada, norma_referencia, nro_resolucion, expediente_origen)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', ?, ?, ?, ?, ?, ?, ?)`,
          [
            codigo, payload.sigla, carrera_seleccionada.toUpperCase(),
            payload.modalidad ?? null, payload.nivel_formacion ?? null,
            payload.puesto ?? null, payload.especialidad ?? null,
            payload.cargo_desde ?? null, payload.cargo_hasta ?? null,
            payload.antiguedad ?? null,
            esCphJD ? 'activo' : null,
            savedAlta.id,
            payload.categoria_interna  ?? null,
            payload.jornada            ?? null,
            payload.norma_referencia   ?? null,
            payload.nro_resolucion     ?? null,
            payload.expediente_origen  ?? null,
          ]
        );
        codigos.push(codigo);
        logger.info('[AltaCargoService] new_cargo insertado', { codigo, id_alta: savedAlta.id });
      }

      return { alta: savedAlta, detalle, codigos, sigla: payload.sigla };
    });
  }

  // ─── LIST ────────────────────────────────────────────────────────────────────
  async list({ carrera_seleccionada, limit, offset, sort, order }) {
    const where = {};
    if (carrera_seleccionada) where.carrera_seleccionada = carrera_seleccionada;
    const [rows, count] = await this.altaRepo.findAndCount({
      where, order: { [sort]: order }, skip: offset, take: limit,
    });
    return { rows, count };
  }

  // ─── GET BY ID ───────────────────────────────────────────────────────────────
  async getById(id) {
    return await this.altaRepo.findOne({ where: { id: Number(id) } });
  }
}

module.exports = AltaCargoService;
