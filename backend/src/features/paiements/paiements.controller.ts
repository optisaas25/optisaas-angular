import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { PaiementsService } from './paiements.service';
import { CreatePaiementDto } from './dto/create-paiement.dto';
import { UpdatePaiementDto } from './dto/update-paiement.dto';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

@Controller('paiements')
export class PaiementsController {
  constructor(private readonly paiementsService: PaiementsService) {}

  @Get('do-repair')
  adminRepair() {
    return this.paiementsService.adminRepair();
  }

  @Get('repair-orphans')
  repairOrphans() {
    return this.paiementsService.repairOrphanOperations();
  }

  @Get('delete-orphans')
  deleteOrphans() {
    return this.paiementsService.deleteOrphanPayments();
  }

  @Post()
  create(
    @Body() createPaiementDto: CreatePaiementDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.paiementsService.create(createPaiementDto, user.id);
  }

  @Get()
  findAll(@Query('factureId') factureId?: string) {
    return this.paiementsService.findAll(factureId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paiementsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePaiementDto: UpdatePaiementDto,
  ) {
    return this.paiementsService.update(id, updatePaiementDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paiementsService.remove(id);
  }
}
