import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectUsageLogDto {
  @ApiPropertyOptional({ description: 'Reason for rejection shown to worker' })
  @IsString()
  @MaxLength(500)
  rejectionNotes: string;
}
