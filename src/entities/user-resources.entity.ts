import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * User Resources Entity - For atomic resource deduction
 * 
 * This ensures we can atomically deduct resources when starting a build,
 * preventing double-spend scenarios.
 */
@Entity('user_resources')
export class UserResources {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'integer', default: 0 })
  wood: number;

  @Column({ type: 'integer', default: 0 })
  clay: number;

  @Column({ type: 'integer', default: 0 })
  iron: number;

  @Column({ type: 'integer', default: 0 })
  crop: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
