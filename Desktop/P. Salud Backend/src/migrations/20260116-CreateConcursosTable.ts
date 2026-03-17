import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

/**
 * Migración: Crear tabla CONCURSOS
 * 
 * Objetivo: Almacenar información de procesos concursales y ampliación de planta
 * 
 * Estructura:
 * - ID único por concurso
 * - Vinculación con hospital (sigla)
 * - Datos de baja (empleado que se retira)
 * - Datos de alta (puesto a cubrir)
 * - Fechas críticas del proceso
 * - Información del designado
 * - Estado del proceso
 * 
 * Índices:
 * - (sigla) - Búsqueda por hospital
 * - (estado) - Filtro por estado
 * - (fecha_autorizacion) - Filtro temporal
 * - (sigla, estado) - Búsqueda combinada
 * 
 * Performance:
 * - ~6,500 registros iniciales
 * - Crecimiento estimado: ~500 registros/año
 * 
 * Auditoría:
 * - Campos created_at y updated_at para trazabilidad
 * - Tabla auditada automáticamente por middleware en API
 */
export class CreateConcursosTable1263000000001 implements MigrationInterface {
  name = 'CreateConcursosTable1263000000001'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'concursos',
        columns: [
          // PK
          {
            name: 'id_concurso',
            type: 'int',
            isPrimary: true,
            isGenerated: false
          },

          // Hospital (FK virtual - referencia a sigla, no strict FK por compatibilidad)
          {
            name: 'sigla',
            type: 'varchar',
            length: '20',
            isNullable: false
          },

          // Estado y clasificación
          {
            name: 'sub_estado',
            type: 'varchar',
            length: '50',
            isNullable: true
          },

          {
            name: 'estado',
            type: 'varchar',
            length: '50',
            isNullable: true
          },

          // Información de BAJA (empleado que se va)
          {
            name: 'ee_baja',
            type: 'varchar',
            length: '100',
            isNullable: true
          },

          {
            name: 'cuil_baja',
            type: 'varchar',
            length: '20',
            isNullable: true
          },

          {
            name: 'nombre_baja',
            type: 'varchar',
            length: '150',
            isNullable: true
          },

          {
            name: 'fecha_baja',
            type: 'date',
            isNullable: true
          },

          {
            name: 'escalafon',
            type: 'varchar',
            length: '50',
            isNullable: true
          },

          {
            name: 'puesto_baja',
            type: 'varchar',
            length: '150',
            isNullable: true
          },

          {
            name: 'especialidad_baja',
            type: 'varchar',
            length: '150',
            isNullable: true
          },

          // Información de ALTA (puesto a cubrir)
          {
            name: 'ee_concurso',
            type: 'varchar',
            length: '100',
            isNullable: true
          },

          {
            name: 'puesto_alta',
            type: 'varchar',
            length: '150',
            isNullable: true
          },

          {
            name: 'especialidad_solicitada_de_alta',
            type: 'varchar',
            length: '150',
            isNullable: true
          },

          // Fechas del proceso concursal
          {
            name: 'fecha_autorizacion',
            type: 'varchar',
            isNullable: true
          },

          {
            name: 'sorteo_de_jurado',
            type: 'boolean',
            isNullable: true
          },

          {
            name: 'fecha_hasta',
            type: 'varchar',
            isNullable: true
          },

          {
            name: 'fecha_examen',
            type: 'varchar',
            isNullable: true
          },

          // Resultado
          {
            name: 'nombre_designacion',
            type: 'varchar',
            length: '150',
            isNullable: true
          },

          {
            name: 'observaciones',
            type: 'varchar',
            length: '150',
            isNullable: true
          },

          {
            name: 'cod_cargo',
            type: 'varchar',
            length: '50',
            isNullable: true
          },

          // Auditoría
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },

          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          },
        ],
      })
    )

    // Crear índices para optimizar queries comunes
    await queryRunner.createIndex(
      'concursos',
      new TableIndex({
        name: 'idx_concursos_sigla',
        columnNames: ['sigla'],
      })
    )

    await queryRunner.createIndex(
      'concursos',
      new TableIndex({
        name: 'idx_concursos_estado',
        columnNames: ['estado'],
      })
    )

    await queryRunner.createIndex(
      'concursos',
      new TableIndex({
        name: 'idx_concursos_fecha_autorizacion',
        columnNames: ['fecha_autorizacion'],
      })
    )

    await queryRunner.createIndex(
      'concursos',
      new TableIndex({
        name: 'idx_concursos_sigla_estado',
        columnNames: ['sigla', 'estado'],
      })
    )

    console.log('✅ Tabla CONCURSOS creada exitosamente con 4 índices optimizados')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Reversión: eliminar tabla (elimina índices automáticamente)
    await queryRunner.dropTable('concursos', true)
    console.log('⏮️  Tabla CONCURSOS eliminada')
  }
}
