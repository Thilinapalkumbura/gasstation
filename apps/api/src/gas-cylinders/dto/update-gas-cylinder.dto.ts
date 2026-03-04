import { IsNumber, IsPositive, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';

export class UpdateGasCylinderDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  sellingPriceLkr?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  purchasePriceLkr?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
