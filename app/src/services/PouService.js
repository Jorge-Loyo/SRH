const { In } = require('typeorm');

class PouService {
  constructor(pouRepository) {
    if (!pouRepository) throw new Error('PouService requiere un repositorio de Pou');
    this.pouRepository = pouRepository;
  }

  async listBySiglaAndPeriodo({ sigla, periodo, skip = 0, take = 200 }) {
    const where = {};
    if (sigla)   where.sigla   = sigla;
    if (periodo) where.periodo = periodo;

    const [rows, count] = await this.pouRepository.findAndCount({
      where,
      order: { id: 'ASC' },
      skip,
      take
    });
    return { rows, count };
  }

  async listBySiglasAndPeriodo({ siglas, periodo }) {
    return await this.pouRepository.find({
      where: { sigla: In(siglas), periodo },
      order: { perfil: 'ASC', especialidad: 'ASC', sigla: 'ASC' },
    });
  }

  async listSiglasDisponibles() {
    const rows = await this.pouRepository
      .createQueryBuilder('pou')
      .select('DISTINCT pou.sigla', 'sigla')
      .orderBy('pou.sigla', 'ASC')
      .getRawMany();
    return rows.map(r => r.sigla);
  }

  async getById(id, periodo) {
    return await this.pouRepository.findOne({
      where: { id: Number(id), periodo }
    });
  }
}

module.exports = PouService;
