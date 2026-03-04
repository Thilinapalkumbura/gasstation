import { IsString, IsNumber, IsPositive, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';

export class UpdateSparePartDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  unitPriceLkr?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  costPriceLkr?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
