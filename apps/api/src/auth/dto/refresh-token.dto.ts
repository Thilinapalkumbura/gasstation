import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsUUID(4)
  refreshToken: string;
}
