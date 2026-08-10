import { BaseEntity, Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'custom_roles' })
export class CustomRole extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  key!: string

  @Column({ type: 'varchar', length: 64 })
  label!: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null

  @Column({ type: 'varchar', length: 16, default: 'gray' })
  color!: string

  @CreateDateColumn()
  created_at!: Date

  @UpdateDateColumn()
  updated_at!: Date
}
