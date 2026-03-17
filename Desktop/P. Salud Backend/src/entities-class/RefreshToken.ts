import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from 'typeorm'
import { User } from './User'

@Entity({ name: 'refresh_tokens' })
export class RefreshToken extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  // Store hash of the token for security
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128 })
  token_hash!: string

  // Token identifier within a family (helps detect reuse)
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  jti!: string

  // Family groups all rotated tokens for a login session
  @Index()
  @Column({ type: 'varchar', length: 64 })
  family_id!: string

  // If this token was rotated, points to the new token jti
  @Column({ type: 'varchar', length: 64, nullable: true })
  replaced_by_jti!: string | null

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User

  @Column({ type: 'datetime' })
  expires_at!: Date

  @Column({ type: 'boolean', default: false })
  revoked!: boolean

  @Column({ type: 'varchar', length: 32, nullable: true })
  revoked_reason!: string | null

  @Column({ type: 'datetime', nullable: true })
  revoked_at!: Date | null

  @CreateDateColumn()
  created_at!: Date

  // Último uso del refresh (inactividad). No debe ser UpdateDateColumn porque queremos controlarlo manualmente
  @Column({ type: 'datetime' })
  last_used!: Date
}
