import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SparePartQueryDto {
  @IsOptional()
  @IsString()
  stationId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  lowStockOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number = 0;
}
