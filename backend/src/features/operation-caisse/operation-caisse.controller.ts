import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { OperationCaisseService } from './operation-caisse.service';
import { CreateOperationCaisseDto } from './dto/create-operation-caisse.dto';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

@Controller('operation-caisse')
export class OperationCaisseController {
  constructor(private readonly operationCaisseService: OperationCaisseService) {}

  /** The role query param cannot be trusted - derive it from the caller's own centreRoles instead. */
  private resolveRole(user: RequestUser): string | undefined {
    if (user.isSuperAdmin) return 'ADMIN';
    return user.centreRoles
      .find((cr) => cr.centreId === user.centreId)
      ?.role?.toUpperCase();
  }

  @Post()
  create(
    @Body() createOperationDto: CreateOperationCaisseDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.operationCaisseService.create(
      createOperationDto,
      this.resolveRole(user),
      user.id,
    );
  }

  @Get('journee/:journeeId')
  findByJournee(
    @Param('journeeId') journeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.operationCaisseService.findByJournee(
      journeeId,
      startDate,
      endDate,
    );
  }

  @Get('journee/:journeeId/stats')
  getStatsByJournee(@Param('journeeId') journeeId: string) {
    return this.operationCaisseService.getStatsByJournee(journeeId);
  }

  @Post('transfer')
  transfer(
    @Body()
    transferDto: {
      amount: number;
      fromJourneeId: string;
      toJourneeId: string;
      utilisateur: string;
    },
    @CurrentUser() user: RequestUser,
  ) {
    return this.operationCaisseService.transfer({
      ...transferDto,
      userId: user.id,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.operationCaisseService.remove(id, this.resolveRole(user));
  }
}
