import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm'
import { User } from './User'

/**
 * Entidad Recorrida - Seguimiento/Recorridas por hospital
 * 
 * Almacena secciones de texto enriquecido (HTML) para documentar
 * recorridas, inspecciones o seguimientos operativos por hospital.
 * 
 * Permisos:
 * - Acceso: admin, editor, viewer
 * - Creación/Edición: admin, editor, viewer
 * - Eliminación: admin, editor
 * - Excluido: director (no tiene acceso a esta funcionalidad)
 */
@Entity({ name: 'recorridas' })
@Index(['hospital_code', 'created_at']) // Query principal: listar por hospital ordenado por fecha
@Index(['user_id']) // Auditoría: buscar por usuario
export class Recorrida extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'varchar', length: 20 })
  hospital_code!: string

  @Column({ type: 'varchar', length: 200 })
  titulo!: string

  @Column({ type: 'text' })
  contenido_html!: string

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
