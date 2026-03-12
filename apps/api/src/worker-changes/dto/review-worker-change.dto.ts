import { IsOptional, IsString } from 'class-validator';

export class ReviewWorkerChangeDto {
  @IsOptional()
  @IsString()
  reviewerNotes?: string;
}
