import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

/**
 * Tabla hija para registros CPH.
 * numero_unico: autoincremental exclusivo para CPH (gestionado por servicio).
 */
@Entity({ name: 'registro_cph' })
@Index(['id_alta'])
export class RegistroCph extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id_cph!: number

  @Column({ type: 'int' })
  id_alta!: number

  @Column({ type: 'varchar', length: 20 })
  modalidad!: string

  @Column({ type: 'varchar', length: 150 })
  puesto!: string

  @Column({ type: 'varchar', length: 150 })
  especialidad!: string

  @Column({ type: 'int' })
  numero_unico!: number
}

/**
 * Tabla hija para registros ENF (Enfermería).
 */
@Entity({ name: 'registro_enf' })
@Index(['id_alta'])
export class RegistroEnf extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id_enf!: number

  @Column({ type: 'int' })
  id_alta!: number

  @Column({ type: 'varchar', length: 50 })
  nivel_formacion!: string  // 'enfermero prof' | 'licenciado en enfermeria'

  @Column({ type: 'int' })
  numero_unico!: number
}

/**
 * Tabla hija para registros TEC — POU.
 */
@Entity({ name: 'registro_tec_pou' })
@Index(['id_alta'])
export class RegistroTecPou extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id_pou!: number

  @Column({ type: 'int' })
  id_alta!: number

  @Column({ type: 'varchar', length: 150 })
  puesto!: string

  @Column({ type: 'int' })
  numero_unico!: number
}

@Entity({ name: 'registro_tec_pof' })
@Index(['id_alta'])
export class RegistroTecPof extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id_pof!: number

  @Column({ type: 'int' })
  id_alta!: number

  @Column({ type: 'varchar', length: 150 })
  puesto!: string

  @Column({ type: 'int' })
  numero_unico!: number
}
