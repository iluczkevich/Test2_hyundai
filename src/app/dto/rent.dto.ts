import { CarDto } from './car.dto';
import { ApiProperty } from '@nestjs/swagger';

export class RentDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  car_id: number;

  @ApiProperty()
  car: CarDto;

  @ApiProperty()
  client_id: number;

  @ApiProperty()
  date_start: Date;

  @ApiProperty()
  date_end: Date;

  constructor(fields: Record<string, unknown>) {
    this.id = fields.id as number;
    this.car_id = fields.car_id as number;
    this.car = new CarDto({
      id: this.car_id,
      regnumber: fields.regnumber,
    });
    this.date_start = fields.date_start as Date;
    this.date_end = fields.date_end as Date;
  }
}
