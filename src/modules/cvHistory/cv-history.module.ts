import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CvHistory } from './cv-history.entity';
import { CvHistoryService } from './cv-history.service';
import { CvHistoryController } from './cv-history.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CvHistory])],
  providers: [CvHistoryService],
  controllers: [CvHistoryController],
  exports: [CvHistoryService, TypeOrmModule],
})
export class CvHistoryModule {}
