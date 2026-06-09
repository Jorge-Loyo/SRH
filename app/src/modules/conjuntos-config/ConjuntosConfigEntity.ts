import { BaseEntity, Entity, PrimaryColumn, Column } from 'typeorm'

/**
 * Entidad ConjuntosConfig — almacena configuración clave/valor para el módulo Procesos Concursales.
 * Actualmente se usa para guardar las reglas de autocompletado del campo "Conjuntos"
 * (key = 'conjuntos_rules', value = JSON con array de Rule).
 */
@Entity({ name: 'conjuntos_config' })
export class ConjuntosConfig extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  key!: string

  @Column({ type: 'text', nullable: true })
  value?: string | null
}
