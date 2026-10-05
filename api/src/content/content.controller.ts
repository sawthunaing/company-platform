import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StaffGuard } from '../auth/staff.guard';
import { ContentService } from './content.service';
import { HomeContentDto, HomeContentResponseDto } from './dto/home-content.dto';

@ApiTags('content')
@Controller('home')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get()
  @ApiOkResponse({ type: HomeContentResponseDto })
  getHome(): Promise<HomeContentResponseDto> {
    return this.content.getHome();
  }

  @Put()
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: HomeContentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid content' })
  @ApiResponse({ status: 401, description: 'Missing or invalid staff token' })
  saveHome(@Body() dto: HomeContentDto): Promise<HomeContentResponseDto> {
    return this.content.saveHome(dto);
  }
}
