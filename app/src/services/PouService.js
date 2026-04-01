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

  async getById(id, periodo) {
    return await this.pouRepository.findOne({
      where: { id: Number(id), periodo }
    });
  }
}

module.exports = PouService;
