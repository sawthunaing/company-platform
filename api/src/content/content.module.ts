import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { HomeContent } from './home-content.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HomeContent]), AuthModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
