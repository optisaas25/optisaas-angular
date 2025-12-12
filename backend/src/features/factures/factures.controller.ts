import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { FacturesService } from './factures.service';
import { Prisma } from '@prisma/client';

@Controller('factures')
export class FacturesController {
    constructor(private readonly facturesService: FacturesService) { }

    @Post()
    create(@Body() createFactureDto: Prisma.FactureUncheckedCreateInput) {
        return this.facturesService.create(createFactureDto);
    }

    @Get()
    findAll(
        @Query('clientId') clientId?: string,
        @Query('type') type?: string,
        @Query('statut') statut?: string,
    ) {
        const where: Prisma.FactureWhereInput = {};
        if (clientId) where.clientId = clientId;
        if (type) where.type = type;
        if (statut) where.statut = statut;

        return this.facturesService.findAll({
            where,
            orderBy: { createdAt: 'desc' }
        });
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.facturesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateFactureDto: Prisma.FactureUpdateInput) {
        return this.facturesService.update({
            where: { id },
            data: updateFactureDto,
        });
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.facturesService.remove({ id });
    }
}
