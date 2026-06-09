import { MigrationInterface, QueryRunner, Table } from 'typeorm'

export class CreateConjuntosConfig1748908800000 implements MigrationInterface {
  name = 'CreateConjuntosConfig1748908800000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'conjuntos_config',
        columns: [
          {
            name: 'key',
            type: 'varchar',
            length: '50',
            isPrimary: true,
          },
          {
            name: 'value',
            type: 'text',
            isNullable: true,
          },
        ],
      })
    )
    console.log('✅ Tabla conjuntos_config creada')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('conjuntos_config', true)
    console.log('⏮️  Tabla conjuntos_config eliminada')
  }
}
