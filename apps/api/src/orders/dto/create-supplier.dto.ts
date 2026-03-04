import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Ceylon Petroleum Corporation (CPC)' })
  @IsString() @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'PQ/0001' })
  @IsOptional() @IsString()
  registrationNo?: string;

  @ApiPropertyOptional({ example: 'VAT-CPC-001' })
  @IsOptional() @IsString()
  vatRegNo?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  contactPerson?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  contactNumber?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  bankAccount?: string;
}
