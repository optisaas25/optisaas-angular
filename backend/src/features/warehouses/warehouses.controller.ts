import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { CreateEntrepotDto } from './dto/create-entrepot.dto';
import { UpdateEntrepotDto } from './dto/update-entrepot.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Roles('manager')
  @Post()
  create(@Body(ValidationPipe) createEntrepotDto: CreateEntrepotDto) {
    return this.warehousesService.create(createEntrepotDto);
  }

  @Get()
  findAll(@Query('centreId') centreId?: string) {
    return this.warehousesService.findAll(centreId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.warehousesService.findOne(id);
  }

  @Get(':id/stock')
  getStockSummary(@Param('id') id: string) {
    return this.warehousesService.getStockSummary(id);
  }

  @Roles('manager')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateEntrepotDto: UpdateEntrepotDto,
  ) {
    return this.warehousesService.update(id, updateEntrepotDto);
  }

  @Roles('manager')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.warehousesService.remove(id);
  }
}
