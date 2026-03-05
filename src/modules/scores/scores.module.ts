import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Score } from './score.entity';
import { ScoresService } from './scores.service';

@Module({
  imports: [TypeOrmModule.forFeature([Score])],
  providers: [ScoresService],
  exports: [ScoresService],
})
export class ScoresModule {}
