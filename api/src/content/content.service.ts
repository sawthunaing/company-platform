import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { instanceToPlain } from 'class-transformer';
import { Repository } from 'typeorm';
import { HomeContentDto, HomeContentResponseDto } from './dto/home-content.dto';
import { HomeContent } from './home-content.entity';

const HOME_ID = 1;

@Injectable()
export class ContentService {
  constructor(@InjectRepository(HomeContent) private readonly repo: Repository<HomeContent>) {}

  async getHome(): Promise<HomeContentResponseDto> {
    const row = await this.repo.findOneByOrFail({ id: HOME_ID });
    return { ...row.data, updatedAt: row.updatedAt };
  }

  async saveHome(dto: HomeContentDto): Promise<HomeContentResponseDto> {
    await this.repo.save({ id: HOME_ID, data: instanceToPlain(dto) as HomeContentDto });
    return this.getHome();
  }
}
