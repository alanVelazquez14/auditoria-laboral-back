import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { CloudinaryProvider } from '../common/cloudinary/cloudinary.provider';
import { AiService } from 'src/ai/ai.service';
import { CvHistoryModule } from '../cvHistory/cv-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    CvHistoryModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, CloudinaryService, CloudinaryProvider, AiService],
  exports: [UsersService],
})
export class UsersModule {}
