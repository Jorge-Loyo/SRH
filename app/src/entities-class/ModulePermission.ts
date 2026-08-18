import { BaseEntity, Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'module_permissions' })
export class ModulePermission extends BaseEntity {
  // PK compuesta: role + module_key
  @PrimaryColumn({ type: 'varchar', length: 32 })
  role!: string

  @PrimaryColumn({ type: 'varchar', length: 64 })
  module_key!: string

  @UpdateDateColumn()
  updated_at!: Date
}
