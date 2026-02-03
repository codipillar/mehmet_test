import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Build, BuildStatus } from '../entities/build.entity';
import { UserResources } from '../entities/user-resources.entity';
import { StartBuildDto } from './dto/start-build.dto';

/**
 * BuildTimerService - Server-Authoritative Build Timer
 * 
 * Key features:
 * - Database persistence for crash recovery
 * - Atomic transactions for resource deduction
 * - Server-calculated executeAt timestamps
 * - No client-driven completion (scheduler handles it)
 */
@Injectable()
export class BuildTimerService {
  constructor(
    @InjectRepository(Build)
    private buildRepository: Repository<Build>,
    @InjectRepository(UserResources)
    private userResourcesRepository: Repository<UserResources>,
    private dataSource: DataSource,
  ) {}

  /**
   * Start a build with atomic resource deduction
   * 
   * This method uses a database transaction to ensure:
   * 1. Resources are deducted atomically
   * 2. Build is created only if resources are sufficient
   * 3. No race conditions or double-spends
   */
  async startBuild(dto: StartBuildDto): Promise<Build> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock user resources row for atomic update
      const userResources = await queryRunner.manager.findOne(
        UserResources,
        {
          where: { userId: dto.userId },
          lock: { mode: 'pessimistic_write' },
        },
      );

      if (!userResources) {
        throw new NotFoundException(`User ${dto.userId} not found`);
      }

      // Validate resources
      if (
        userResources.wood < (dto.woodCost || 0) ||
        userResources.clay < (dto.clayCost || 0) ||
        userResources.iron < (dto.ironCost || 0) ||
        userResources.crop < (dto.cropCost || 0)
      ) {
        throw new BadRequestException('Insufficient resources');
      }

      // Deduct resources atomically
      userResources.wood -= dto.woodCost || 0;
      userResources.clay -= dto.clayCost || 0;
      userResources.iron -= dto.ironCost || 0;
      userResources.crop -= dto.cropCost || 0;

      await queryRunner.manager.save(userResources);

      // Create build with server-calculated executeAt
      const startTime = new Date();
      const executeAt = new Date(startTime.getTime() + dto.duration);

      const build = queryRunner.manager.create(Build, {
        userId: dto.userId,
        buildType: dto.buildType,
        startTime,
        executeAt, // Server-calculated completion time
        status: BuildStatus.RUNNING,
        woodCost: dto.woodCost || 0,
        clayCost: dto.clayCost || 0,
        ironCost: dto.ironCost || 0,
        cropCost: dto.cropCost || 0,
        isValid: true,
      });

      const savedBuild = await queryRunner.manager.save(build);

      await queryRunner.commitTransaction();
      return savedBuild;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get build by ID
   */
  async getBuild(buildId: string): Promise<Build> {
    const build = await this.buildRepository.findOne({
      where: { id: buildId },
    });

    if (!build) {
      throw new NotFoundException(`Build ${buildId} not found`);
    }

    return build;
  }

  /**
   * Get all builds for a user
   */
  async getUserBuilds(userId: string): Promise<Build[]> {
    return this.buildRepository.find({
      where: { userId },
      order: { startTime: 'DESC' },
    });
  }

  /**
   * Get all running builds (for scheduler)
   */
  async getRunningBuilds(): Promise<Build[]> {
    return this.buildRepository.find({
      where: { status: BuildStatus.RUNNING },
      order: { executeAt: 'ASC' },
    });
  }

  /**
   * Get builds that should be completed (executeAt <= now)
   * This is called by the scheduler
   */
  async getBuildsToComplete(): Promise<Build[]> {
    const now = new Date();
    return this.buildRepository
      .createQueryBuilder('build')
      .where('build.status = :status', { status: BuildStatus.RUNNING })
      .andWhere('build.executeAt <= :now', { now })
      .orderBy('build.executeAt', 'ASC')
      .getMany();
  }

  /**
   * Complete a build (called by scheduler, not client)
   * 
   * This method is server-driven - the scheduler calls it when executeAt is reached
   */
  async completeBuild(buildId: string, status: BuildStatus = BuildStatus.COMPLETED): Promise<Build> {
    const build = await this.buildRepository.findOne({
      where: { id: buildId },
    });

    if (!build) {
      throw new NotFoundException(`Build ${buildId} not found`);
    }

    if (build.status !== BuildStatus.RUNNING) {
      throw new BadRequestException(`Build ${buildId} is not running`);
    }

    const endTime = new Date();
    const duration = endTime.getTime() - build.startTime.getTime();

    build.endTime = endTime;
    build.duration = duration;
    build.status = status;
    build.isValid = this.validateDuration(duration);

    return this.buildRepository.save(build);
  }

  /**
   * Validate duration (can be extended with min/max constraints)
   */
  private validateDuration(duration: number): boolean {
    // Add validation logic here (min/max duration, etc.)
    return duration > 0;
  }

  /**
   * Crash recovery: Complete all builds that should have finished
   * This is called on server startup
   */
  async recoverCompletedBuilds(): Promise<number> {
    const buildsToComplete = await this.getBuildsToComplete();
    let recovered = 0;

    for (const build of buildsToComplete) {
      try {
        await this.completeBuild(build.id, BuildStatus.COMPLETED);
        recovered++;
      } catch (error) {
        // Log error but continue recovery
        console.error(`Failed to recover build ${build.id}:`, error);
        build.status = BuildStatus.FAILED;
        build.errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.buildRepository.save(build);
      }
    }

    return recovered;
  }
}
