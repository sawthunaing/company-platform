import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  Controller,
  ExceptionFilter,
  HttpStatus,
  PayloadTooLargeException,
  Post,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { StaffGuard } from '../auth/staff.guard';
import { UploadsService } from './uploads.service';

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

// Multer reports an oversized file as a plain 413. Give it the API's error shape.
@Catch(PayloadTooLargeException)
class FileTooLargeFilter implements ExceptionFilter {
  catch(_e: PayloadTooLargeException, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.PAYLOAD_TOO_LARGE)
      .json({ statusCode: 413, error: 'file_too_large', message: 'Image must be 2 MB or smaller.' });
  }
}

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('hero')
  @UseGuards(StaffGuard)
  @UseFilters(FileTooLargeFilter)
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiCreatedResponse({ schema: { properties: { url: { type: 'string', example: '/uploads/3f2c….png' } } } })
  @ApiResponse({ status: 400, description: 'No file sent' })
  @ApiResponse({ status: 401, description: 'Missing or invalid staff token' })
  @ApiResponse({ status: 413, description: 'File over 2 MB' })
  @ApiResponse({ status: 415, description: 'Not a JPEG, PNG or WebP image' })
  async uploadHero(@UploadedFile() file?: Express.Multer.File): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException({ statusCode: 400, error: 'file_required', message: 'Send the image as "file".' });
    }
    const url = await this.uploads.saveImage(file.buffer);
    if (!url) {
      throw new UnsupportedMediaTypeException({
        statusCode: 415,
        error: 'unsupported_type',
        message: 'Only JPEG, PNG or WebP images.',
      });
    }
    return { url };
  }
}
