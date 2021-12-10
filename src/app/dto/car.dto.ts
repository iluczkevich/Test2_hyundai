import { ApiProperty } from '@nestjs/swagger';

export class CarDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  regNumber: string;

  constructor(fields: Record<string, unknown>) {
    this.id = fields.id as number;
    this.regNumber = fields.regnumber as string;
  }
}
