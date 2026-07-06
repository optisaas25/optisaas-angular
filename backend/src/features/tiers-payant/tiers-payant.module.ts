import { Module } from '@nestjs/common';
import { TiersPayantService } from './tiers-payant.service';
import { TiersPayantController } from './tiers-payant.controller';
import { TiersPayantPdfService } from './tiers-payant-pdf.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TiersPayantController],
  providers: [TiersPayantService, TiersPayantPdfService],
  exports: [TiersPayantService],
})
export class TiersPayantModule {}
