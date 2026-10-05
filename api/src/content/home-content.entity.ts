import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { HomeContentDto } from './dto/home-content.dto';

// A single row (id = 1) holds the whole home page.
@Entity('home_content')
export class HomeContent {
  @PrimaryColumn()
  id: number;

  @Column({ type: 'jsonb' })
  data: HomeContentDto;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
