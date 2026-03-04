import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength, Matches } from 'class-validator';
import { UserRole } from '@gasstation/shared-types';

export class CreateUserDto {
  @ApiProperty({ example: 'worker@station001.lk' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, description: 'Must contain uppercase, lowercase, number, and special char' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;

  @ApiProperty({ example: 'Kamal Perera' })
  @IsString()
  fullName: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ description: 'Required for WORKER and STATION_MANAGER roles' })
  @IsOptional()
  @IsString()
  stationId?: string;
}
