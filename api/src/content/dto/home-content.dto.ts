import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class SectionDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiProperty({ maxLength: 5000 })
  @IsString()
  @MaxLength(5000)
  body: string;
}

export class ContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;
}

export class HomeContentDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  heroTitle: string;

  @ApiProperty({ maxLength: 300 })
  @IsString()
  @MaxLength(300)
  heroSubtitle: string;

  @ApiPropertyOptional({ description: 'Set by the backoffice image upload', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  heroImageUrl?: string;

  @ApiProperty({ type: [SectionDto], maxItems: 20 })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections: SectionDto[];

  @ApiProperty({ type: ContactDto })
  @ValidateNested()
  @Type(() => ContactDto)
  contact: ContactDto;
}

export class HomeContentResponseDto extends HomeContentDto {
  @ApiProperty()
  updatedAt: Date;
}
