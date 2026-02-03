import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Build } from '../entities/build.entity';
import { UserResources } from '../entities/user-resources.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'builds.db',
      entities: [Build, UserResources],
      synchronize: true, // In production, use migrations
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([Build, UserResources]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
