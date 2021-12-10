import { Body, Controller, Get, HttpException, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateRentDto } from './dto/create-rent.dto';
import { ValidationPipe } from './validation/validation.pipe';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RentDto } from './dto/rent.dto';
import { CarDto } from './dto/car.dto';
import { CarReportDto } from './dto/car-report.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiTags('Application')
  @ApiOperation({
    description: 'Возвращает название и версию приложения',
    summary: 'Возвращает название и версию приложения',
  })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiTags('Application')
  @ApiOperation({
    description:
      'Создает таблицы и добавляет 5 автомобилей в таблицу cars. Выполняется 1 раз, потом выводит ошибку',
    summary: 'Инициализировать БД',
  })
  @Get('db/init')
  dbInit() {
    return this.appService.dbInit();
  }

  @ApiTags('Rents')
  @ApiResponse({ type: Number })
  @ApiOperation({
    description: 'Рассчитать стоимость аренды за заданное количество дней',
    summary: 'Рассчитать стоимость аренды за заданное количество дней',
  })
  @Get('rents/calculate/:length')
  calculatePrice(@Param('length', ParseIntPipe) length: number): number {
    return this.appService.calculatePrice(length);
  }

  @ApiTags('Rents')
  @ApiResponse({ type: RentDto, isArray: true })
  @ApiOperation({
    description: 'Получить список сделок аренды',
    summary: 'Получить список сделок аренды',
  })
  @Get('rents')
  getRents() {
    return this.appService.getRents();
  }

  @ApiTags('Rents')
  @ApiResponse({ type: RentDto })
  @ApiOperation({
    description: 'Забронировать любой свободный автомобиль',
    summary: 'Забронировать любой свободный автомобиль',
  })
  @Post('rents')
  async addRent(@Body(new ValidationPipe()) createRentDto: CreateRentDto) {
    try {
      this.appService.checkRentLength(createRentDto.rentLength);
      return await this.appService.addRent(createRentDto);
    } catch (err) {
      throw new HttpException(
        {
          status: 'ERROR',
          message: err.message,
        },
        400,
      );
    }
  }

  @ApiTags('Rents')
  @ApiResponse({ type: RentDto })
  @ApiOperation({
    description: 'Пример регистрационного номера P515EE93RUS',
    summary: 'Забронировать автомобиль по регистрационному номеру',
  })
  @Post('rents/:regnumber')
  async addRentByRegNumber(
    @Body(new ValidationPipe()) createRentDto: CreateRentDto,
    @Param('regnumber') regnumber: string,
  ) {
    try {
      this.appService.checkRentLength(createRentDto.rentLength);
      return await this.appService.addRent(createRentDto, regnumber);
    } catch (err) {
      throw new HttpException(
        {
          status: 'ERROR',
          message: err.message,
        },
        400,
      );
    }
  }

  @ApiTags('Cars')
  @ApiResponse({ type: CarDto, isArray: true })
  @ApiOperation({
    description: 'Получить список автомобилей',
    summary: 'Получить список автомобилей',
  })
  @Get('cars')
  getCars() {
    return this.appService.getCars();
  }

  @ApiTags('Cars')
  @ApiResponse({ type: CarReportDto, isArray: true })
  @ApiOperation({
    description: 'Получить отчет по всем автомобилям или конкретному автомобилю',
    summary: 'Получить отчет по всем автомобилям или конкретному автомобилю',
  })
  @ApiQuery({
    name: 'date',
    description: 'Дата. Для отчета будет выбран месяц из этой даты',
    type: String,
    required: true,
  })
  @ApiQuery({
    name: 'regnumber',
    description: 'Регистрационный номер автомобиля. Пример: P550EE93RUS',
    type: String,
    required: false,
  })
  @Get('cars/report')
  getCarsReport(@Query() date: string, regnumber?: string) {
    if (regnumber) {
      return this.appService.getCarReport(new Date(date), regnumber);
    }
    return this.appService.getCarsReport(new Date(date));
  }
}
