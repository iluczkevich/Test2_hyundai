import { ApiProperty } from '@nestjs/swagger';

export class CarReportDto {
  @ApiProperty()
  car_id: number;

  @ApiProperty()
  regnumber: string;

  @ApiProperty()
  daysInRent?: number = 0;

  @ApiProperty()
  workload?: string = '0';

  constructor(fields?: Record<string, unknown>) {
    this.car_id = fields.car_id as number;
    this.regnumber = fields.regnumber as string;
  }

  calculateWorkload() {
    this.workload = ((this.daysInRent / 30) * 100).toFixed(2);
  }
}
