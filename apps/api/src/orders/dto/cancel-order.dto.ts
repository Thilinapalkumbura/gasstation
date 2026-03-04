import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({ example: 'Supplier unable to deliver within required timeframe' })
  @IsString()
  @MaxLength(500)
  cancellationReason: string;
}
