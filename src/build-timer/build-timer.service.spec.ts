import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BuildTimerService } from './build-timer.service';
import { Build, BuildStatus } from '../entities/build.entity';
import { UserResources } from '../entities/user-resources.entity';
import { StartBuildDto } from './dto/start-build.dto';

describe('BuildTimerService', () => {
  let service: BuildTimerService;
  let buildRepository: Repository<Build>;
  let userResourcesRepository: Repository<UserResources>;
  let dataSource: DataSource;

  const mockBuildRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserResourcesRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => ({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
      },
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuildTimerService,
        {
          provide: getRepositoryToken(Build),
          useValue: mockBuildRepository,
        },
        {
          provide: getRepositoryToken(UserResources),
          useValue: mockUserResourcesRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<BuildTimerService>(BuildTimerService);
    buildRepository = module.get<Repository<Build>>(getRepositoryToken(Build));
    userResourcesRepository = module.get<Repository<UserResources>>(
      getRepositoryToken(UserResources),
    );
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startBuild', () => {
    it('should start a build with atomic resource deduction', async () => {
      const dto: StartBuildDto = {
        userId: 'user-1',
        buildType: 'barracks',
        duration: 60000, // 1 minute
        woodCost: 100,
        clayCost: 50,
      };

      const mockUserResources: UserResources = {
        userId: 'user-1',
        wood: 200,
        clay: 100,
        iron: 50,
        crop: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockQueryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager: {
          findOne: jest.fn().mockResolvedValue(mockUserResources),
          save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
        },
      };

      mockDataSource.createQueryRunner = jest.fn(() => mockQueryRunner as any);

      const result = await service.startBuild(dto);

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(2); // Resources + Build
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.userId).toBe('user-1');
      expect(result.buildType).toBe('barracks');
      expect(result.status).toBe(BuildStatus.RUNNING);
    });

    it('should throw error if user has insufficient resources', async () => {
      const dto: StartBuildDto = {
        userId: 'user-1',
        buildType: 'barracks',
        duration: 60000,
        woodCost: 1000, // More than available
      };

      const mockUserResources: UserResources = {
        userId: 'user-1',
        wood: 100, // Less than required
        clay: 0,
        iron: 0,
        crop: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockQueryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager: {
          findOne: jest.fn().mockResolvedValue(mockUserResources),
          save: jest.fn(),
        },
      };

      mockDataSource.createQueryRunner = jest.fn(() => mockQueryRunner as any);

      await expect(service.startBuild(dto)).rejects.toThrow('Insufficient resources');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('getBuildsToComplete', () => {
    it('should return builds that have reached executeAt time', async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 1000);

      const mockBuilds: Build[] = [
        {
          id: 'build-1',
          userId: 'user-1',
          buildType: 'barracks',
          startTime: pastTime,
          executeAt: pastTime,
          endTime: null,
          duration: null,
          status: BuildStatus.RUNNING,
          isValid: true,
          errorMessage: null,
          woodCost: 0,
          clayCost: 0,
          ironCost: 0,
          cropCost: 0,
          createdAt: pastTime,
          updatedAt: pastTime,
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockBuilds),
      };

      mockBuildRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);

      const result = await service.getBuildsToComplete();

      expect(result).toEqual(mockBuilds);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('recoverCompletedBuilds', () => {
    it('should recover builds that completed during downtime', async () => {
      const pastTime = new Date(Date.now() - 10000);
      const mockBuilds: Build[] = [
        {
          id: 'build-1',
          userId: 'user-1',
          buildType: 'barracks',
          startTime: pastTime,
          executeAt: pastTime,
          endTime: null,
          duration: null,
          status: BuildStatus.RUNNING,
          isValid: true,
          errorMessage: null,
          woodCost: 0,
          clayCost: 0,
          ironCost: 0,
          cropCost: 0,
          createdAt: pastTime,
          updatedAt: pastTime,
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockBuilds),
      };

      mockBuildRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);
      mockBuildRepository.findOne = jest.fn().mockResolvedValue(mockBuilds[0]);
      mockBuildRepository.save = jest.fn().mockResolvedValue(mockBuilds[0]);

      const recovered = await service.recoverCompletedBuilds();

      expect(recovered).toBe(1);
      expect(mockBuildRepository.save).toHaveBeenCalled();
    });
  });
});
