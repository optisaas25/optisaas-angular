import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { TiersPayantService } from './tiers-payant.service';
import { TiersPayantPdfService } from './tiers-payant-pdf.service';
import { CreateTiersPayantClaimDto } from './dto/create-tiers-payant-claim.dto';
import { UpdateTiersPayantClaimDto } from './dto/update-tiers-payant-claim.dto';
import { UpdateOrganismeConfigDto } from './dto/update-organisme-config.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Roles('manager')
@Controller('tiers-payant')
export class TiersPayantController {
  constructor(
    private readonly tiersPayantService: TiersPayantService,
    private readonly pdfService: TiersPayantPdfService,
  ) {}

  @Post()
  create(@Body() dto: CreateTiersPayantClaimDto) {
    return this.tiersPayantService.create(dto);
  }

  @Get()
  findAll(
    @Query('statut') statut?: string,
    @Query('conventionId') conventionId?: string,
    @Query('centreId') centreId?: string,
  ) {
    return this.tiersPayantService.findAll({ statut, conventionId, centreId });
  }

  @Get('lookup-facture')
  lookupFacture(@Query('numero') numero: string) {
    return this.tiersPayantService.lookupFacture(numero);
  }

  @Get('search-factures')
  searchFactures(@Query('q') q: string) {
    return this.tiersPayantService.searchFactures(q);
  }

  @Get('organismes')
  listOrganismes() {
    return this.tiersPayantService.listOrganismes();
  }

  @Get('organismes/:conventionId/config')
  getOrganismeConfig(@Param('conventionId') conventionId: string) {
    return this.tiersPayantService.getOrganismeConfig(conventionId);
  }

  @Patch('organismes/:conventionId/config')
  updateOrganismeConfig(
    @Param('conventionId') conventionId: string,
    @Body() dto: UpdateOrganismeConfigDto,
  ) {
    return this.tiersPayantService.upsertOrganismeConfig(conventionId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tiersPayantService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTiersPayantClaimDto) {
    return this.tiersPayantService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tiersPayantService.remove(id);
  }

  @Get(':id/export')
  async export(@Param('id') id: string, @Res() res: Response) {
    const claim = await this.tiersPayantService.findOne(id);
    const pdf = await this.pdfService.generateClaimExport(claim);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="dossier-tiers-payant-${claim.facture.numero}.pdf"`,
    });
    res.send(pdf);
  }

  @Get('export/batch')
  async exportBatch(@Query('ids') ids: string, @Res() res: Response) {
    const claimIds = (ids || '').split(',').filter(Boolean);
    const claims = await Promise.all(
      claimIds.map((id) => this.tiersPayantService.findOne(id)),
    );
    const pdf = await this.pdfService.generateBatchExport(claims);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="dossiers-tiers-payant.pdf"',
    });
    res.send(pdf);
  }
}
