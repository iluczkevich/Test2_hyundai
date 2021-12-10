import { HttpException, Inject, Injectable } from '@nestjs/common';
import { PG_CONNECTION } from '../constants';
import { CarDto } from './dto/car.dto';
import { CreateRentDto } from './dto/create-rent.dto';
import { RentDto } from './dto/rent.dto';
import { CarReportInterface } from './interfaces/car-report.interface';
import { CarReportDto } from './dto/car-report.dto';

@Injectable()
export class AppService {
  constructor(@Inject(PG_CONNECTION) private connection) {}
  getHello(): string {
    return process.env.npm_package_name + ' version: ' + process.env.npm_package_version;
  }

  // Рассчитать стоимость
  calculatePrice(rentLength: number) {
    this.checkRentLength(rentLength);
    const base = parseInt(process.env.APP_BASE_PRICE, 10);
    let price = 0;
    for (let day = 1; day <= rentLength; day++) {
      if (day <= 4) price += base;
      if (day > 4 && day <= 9) price += base - base * 0.05;
      if (day > 9 && day <= 17) price += base - base * 0.1;
      if (day > 17 && day <= 30) price += base - base * 0.15;
    }
    return price;
  }

  // Получить свободные автомобили
  async getAvailableCars(startDate: Date, endDate: Date): Promise<Array<CarDto>> {
    const delay = process.env.APP_DELAY_BETWEEN_RENTS ? parseInt(process.env.APP_DELAY_BETWEEN_RENTS, 10) : 3;
    const start_date = new Date(startDate.setDate(startDate.getDate() - delay + 1));
    const end_date = new Date(endDate.setDate(endDate.getDate() + delay - 1));

    const res = await this.connection.query(`
    SELECT DISTINCT id, regnumber FROM cars car
    WHERE NOT EXISTS (
      SELECT * FROM rents 
      WHERE car.id = car_id AND
        (date_start 
        BETWEEN CAST('${start_date.toISOString().slice(0, 10)}' as DATE) 
        AND CAST ('${end_date.toISOString().slice(0, 10)}' as DATE)
        OR date_end 
        BETWEEN CAST('${start_date.toISOString().slice(0, 10)}' as DATE)
        AND CAST ('${end_date.toISOString().slice(0, 10)}' as DATE)
        )
      )
      ORDER BY id ASC
    `);

    return res.rows.map((item) => {
      return new CarDto(item);
    });
  }

  // Проверка является ли день выходным
  isDateWeekEnd(date: Date): boolean {
    return date.getDay() === 0 || date.getDay() === 6;
  }

  // Проверить длину аренды
  checkRentLength(rentLength: number) {
    if (rentLength > 30)
      throw new HttpException(
        {
          status: 'ERROR',
          message: 'Rent length cant be greater than 30',
        },
        401,
      );
  }

  // Получить автомобили
  async getCars() {
    const res = await this.connection.query(`SELECT * from cars ORDER BY cars.id ASC`);
    return res.rows.map((item) => {
      return new CarDto(item);
    });
  }

  // Добавить запись аренды
  async addRent(createRentDto: CreateRentDto, regnumber?: string) {
    const startDate = new Date(createRentDto.start_date);
    const endDate = new Date(startDate.setDate(startDate.getDate() + createRentDto.rentLength));

    // Проверка даты начала
    if (this.isDateWeekEnd(startDate)) throw new Error('You cannot rent a car on weekends');

    // Проверка даты возврата
    if (this.isDateWeekEnd(endDate)) throw new Error('You cannot return the car on a weekend');

    // Проверка доступности автомобилей
    const carsAvailable = await this.getAvailableCars(startDate, endDate);

    if (!carsAvailable || carsAvailable.length === 0) {
      throw new Error('No available cars founded');
    }

    let car: CarDto;
    if (regnumber) {
      car = carsAvailable.filter((item) => item.regNumber === regnumber)[0];
      if (!car) {
        throw new Error('This car not available for rent in dates specified');
      }
    }

    const res = await this.connection.query(`
    WITH inserted_rent as (
    INSERT INTO rents (car_id, client_id, date_start, date_end)
      VALUES(
        ${car ? car.id : carsAvailable[0].id},
        ${createRentDto.client_id},
        '${startDate.toISOString().slice(0, 10)}',
        '${endDate.toISOString().slice(0, 10)}'
      )
      RETURNING *
    ) select inserted_rent.id, inserted_rent.car_id, inserted_rent.client_id, inserted_rent.date_start, inserted_rent.date_end, cars.regnumber from inserted_rent
        INNER JOIN cars on inserted_rent.car_id = cars.id;
    `);

    return new RentDto(res.rows[0]);
  }

  // Получить записи аренды
  async getRents(): Promise<RentDto[]> {
    const res = await this.connection.query(
      'SELECT rents.id, rents.car_id, rents.client_id, rents.date_start, rents.date_end, cars.regnumber FROM rents rents INNER JOIN cars cars ON cars.id = car_id ',
    );
    return res.rows.map((item) => {
      return new RentDto(item);
    });
  }

  days(firstDate, secondDate): number {
    const difference = secondDate.getTime() - firstDate.getTime();
    return Math.ceil(difference / (1000 * 3600 * 24));
  }
  async getCarReport(date: Date, regnumber: string) {
    const res = await this.connection.query(`
    SELECT date_start, date_end, car_id, regnumber
    FROM rents
    LEFT JOIN cars ON car_id = cars.id
    WHERE regnumber = '${regnumber}'
    AND date_start BETWEEN 
    date_trunc('month', CAST('${date.toISOString().slice(0, 10)}' as DATE)) 
    AND 
    (date_trunc('month', CAST('${date.toISOString().slice(0, 10)}' as DATE)) + interval '1 month - 1 second')
    ORDER BY car_id ASC
    `);

    return this.generateReport(res.rows);
  }

  async getCarsReport(date: Date) {
    const res = await this.connection.query(`
    SELECT date_start, date_end, car_id, regnumber
    FROM rents
    LEFT JOIN cars ON car_id = cars.id
    WHERE date_start BETWEEN 
    date_trunc('month', CAST('${date.toISOString().slice(0, 10)}' as DATE)) 
    AND 
    (date_trunc('month', CAST('${date.toISOString().slice(0, 10)}' as DATE)) + interval '1 month - 1 second')

    ORDER BY car_id ASC
    `);

    return this.generateReport(res.rows);
  }

  generateReport(arr: Array<Record<string, unknown>>) {
    // Посчитать дни
    const carsReport = new Array<CarReportDto>();
    arr.forEach((item) => {
      if (!carsReport[carsReport.findIndex((x) => x.car_id === item.car_id)]) {
        carsReport.push(new CarReportDto(item));
      }
      carsReport[carsReport.findIndex((x) => x.car_id === item.car_id)].daysInRent += this.days(
        item.date_start,
        item.date_end,
      );
    });

    carsReport.forEach((item) => {
      item.calculateWorkload();
    });

    return carsReport;
  }

  // Инилициализация БД
  async dbInit() {
    await this.initCarsTable();
    await this.initRentsTable();
  }

  async initRentsTable() {
    await this.connection.query(`
    CREATE TABLE IF NOT EXISTS rents (
    id serial PRIMARY KEY,
    car_id INT NOT NULL,
    client_id INT NOT NULL,
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    FOREIGN KEY (car_id) REFERENCES cars (id)
    )
    `);
  }

  async initCarsTable() {
    await this.connection.query(`
    CREATE TABLE IF NOT EXISTS cars (
    id serial PRIMARY KEY,
    regNumber VARCHAR(12) UNIQUE NOT NULL
    )
    `);

    try {
      await this.connection.query(`
    INSERT INTO cars (regNumber)
    VALUES
    ('P550EE93RUS'),
    ('A123AA127RUS'),
    ('T777BB777RUS'),
    ('B221BA64RUS'),
    ('E550TA63RUS')
    `);
    } catch (err) {
      throw new HttpException(
        {
          status: 'ERR',
          message: err.message,
        },
        409,
      );
    }
  }
}
