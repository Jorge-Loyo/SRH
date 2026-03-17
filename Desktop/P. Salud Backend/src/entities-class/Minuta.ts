import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm'
import { User } from './User'

/**
 * Entidad Minuta - Hojas de cálculo dinámicas por hospital
 * 
 * Almacena datos tabulares (filas/columnas dinámicas) para documentar
 * minutas, planillas o información estructurada por hospital.
 * 
 * La estructura de la tabla es flexible y definida por el usuario:
 * - Columnas: definidas dinámicamente (nombre, tipo, opciones)
 * - Filas: datos ingresados por el usuario
 * - Almacenamiento: JSON en campo datos_tabla
 * 
 * Permisos:
 * - Acceso: admin, editor, viewer
 * - Creación/Edición: admin, editor, viewer
 * - Eliminación: admin, editor
 * - Excluido: director (no tiene acceso a esta funcionalidad)
 */
@Entity({ name: 'minutas' })
@Index(['hospital_code', 'created_at']) // Query principal: listar por hospital ordenado por fecha
@Index(['user_id']) // Auditoría: buscar por usuario
export class Minuta extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'varchar', length: 20 })
  hospital_code!: string

  @Column({ type: 'varchar', length: 200 })
  titulo!: string

  /**
   * Estructura de datos_tabla (JSON):
   * {
   *   columns: [
   *     { id: string, name: string, type: 'text'|'number'|'date'|'select', options?: string[] }
   *   ],
   *   rows: [
   *     { [columnId]: value, ... }
   *   ]
   * }
   */
  @Column({ type: 'json' })
  datos_tabla!: {
    columns: Array<{
      id: string
      name: string
      type: 'text' | 'number' | 'date' | 'select'
      options?: string[]
    }>
    rows: Array<Record<string, any>>
  }

  @Column({ type: 'int' })
  user_id!: number

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User

  @CreateDateColumn()
  created_at!: Date

  @UpdateDateColumn()
  updated_at!: Date
}
