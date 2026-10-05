import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { Env } from '../config/env';
import { detectImageType } from './image-type';

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly dir: string;

  constructor(config: ConfigService<Env, true>) {
    this.dir = config.get('UPLOADS_DIR', { infer: true });
  }

  async onModuleInit() {
    await mkdir(this.dir, { recursive: true });
  }

  // Returns the public path of the saved file, or null when it is not a supported image.
  async saveImage(data: Buffer): Promise<string | null> {
    const type = detectImageType(data);
    if (!type) return null;
    const name = `${randomUUID()}.${type.ext}`;
    await writeFile(join(this.dir, name), data);
    return `/uploads/${name}`;
  }
}
