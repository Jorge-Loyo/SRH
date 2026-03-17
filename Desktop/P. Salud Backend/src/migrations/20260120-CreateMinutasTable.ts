import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm'

/**
 * Migración: Crear tabla MINUTAS
 * 
 * Objetivo: Almacenar hojas de cálculo dinámicas (minutas/planillas) por hospital
 * 
 * Estructura:
 * - ID único autoincremental
 * - Hospital code (referencia al hospital)
 * - Título descriptivo
 * - Datos tabulares (JSON con columnas y filas dinámicas)
 * - Usuario creador (FK a users)
 * - Timestamps automáticos
 * 
 * Índices:
 * - (hospital_code, created_at) - Query principal: listar por hospital
 * - (user_id) - Auditoría: buscar por usuario creador
 * 
 * Características:
 * - Datos JSON flexibles (estructura de tabla definida por usuario)
 * - Auditoría completa en tabla audit_logs
 * - Permisos: mismo esquema que recorridas
 * 
 * Relaciones:
 * - user_id → users (FK con cascada DELETE)
 */
export class CreateMinutasTable1737350000000 implements MigrationInterface {
  name = 'CreateMinutasTable1737350000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'minutas',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment'
          },
          {
            name: 'hospital_code',
            type: 'varchar',
            length: '20',
            isNullable: false
          },
          {
            name: 'titulo',
            type: 'varchar',
            length: '200',
            isNullable: false
          },
          {
            name: 'datos_tabla',
            type: 'json',
            isNullable: false,
            comment: 'Estructura JSON con columns y rows dinámicas'
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false
          }
        ]
      }),
      true
    )

    // Índice compuesto: hospital_code + created_at (query principal)
    await queryRunner.createIndex(
      'minutas',
      new TableIndex({
        name: 'IDX_minutas_hospital_created',
        columnNames: ['hospital_code', 'created_at']
      })
    )

    // Índice: user_id (auditoría)
    await queryRunner.createIndex(
      'minutas',
      new TableIndex({
        name: 'IDX_minutas_user',
        columnNames: ['user_id']
      })
    )

    // Foreign Key: user_id → users
    await queryRunner.createForeignKey(
      'minutas',
      new TableForeignKey({
        name: 'FK_minutas_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE', // Si se elimina usuario, eliminar minutas asociadas
        onUpdate: 'CASCADE'
      })
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar FK
    await queryRunner.dropForeignKey('minutas', 'FK_minutas_user')

    // Eliminar índices
    await queryRunner.dropIndex('minutas', 'IDX_minutas_user')
    await queryRunner.dropIndex('minutas', 'IDX_minutas_hospital_created')

    // Eliminar tabla
    await queryRunner.dropTable('minutas')
  }
}
