import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BuildStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Build Entity - Persisted in database for crash recovery
 * 
 * Key design decisions:
 * - executeAt: Server-calculated completion time (not client-provided)
 * - status: Tracks build lifecycle
 * - All timestamps are server-generated
 */
@Entity('builds')
@Index(['executeAt', 'status']) // Index for scheduler queries
@Index(['userId']) // Index for user queries
export class Build {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  buildType: string; // e.g., 'barracks', 'wall', 'warehouse'

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime', nullable: true })
  executeAt: Date; // Server-calculated completion time

  @Column({ type: 'datetime', nullable: true })
  endTime: Date | null;

  @Column({ type: 'integer', nullable: true })
  duration: number | null; // Duration in milliseconds

  @Column({
    type: 'varchar',
    length: 50,
    default: BuildStatus.PENDING,
  })
  status: BuildStatus;

  @Column({ type: 'boolean', default: true })
  isValid: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  // Resource costs (for atomic transaction)
  @Column({ type: 'integer', default: 0 })
  woodCost: number;

  @Column({ type: 'integer', default: 0 })
  clayCost: number;

  @Column({ type: 'integer', default: 0 })
  ironCost: number;

  @Column({ type: 'integer', default: 0 })
  cropCost: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
