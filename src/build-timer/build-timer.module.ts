import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildTimerService } from './build-timer.service';
import { BuildTimerController } from './build-timer.controller';
import { Build } from '../entities/build.entity';
import { UserResources } from '../entities/user-resources.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Build, UserResources])],
  controllers: [BuildTimerController],
  providers: [BuildTimerService],
  exports: [BuildTimerService],
})
export class BuildTimerModule {}
