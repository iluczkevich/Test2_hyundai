import { IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRentDto {
  @IsString()
  @ApiProperty()
  start_date: string;

  @IsInt()
  @ApiProperty()
  rentLength: number;

  @IsInt()
  @ApiProperty()
  client_id: number;
}
