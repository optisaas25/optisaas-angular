import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTiersPayantClaimDto } from './dto/create-tiers-payant-claim.dto';
import { UpdateTiersPayantClaimDto } from './dto/update-tiers-payant-claim.dto';

@Injectable()
export class TiersPayantService {
  constructor(private prisma: PrismaService) {}

  async lookupFacture(numero: string) {
    const facture = await this.prisma.facture.findUnique({
      where: { numero },
      include: { client: true, tiersPayantClaim: true },
    });

    if (!facture) {
      throw new NotFoundException('Facture introuvable');
    }
    if (!facture.client.conventionId) {
      throw new BadRequestException(
        "Ce client n'est rattaché à aucune convention/mutuelle",
      );
    }
    if (facture.tiersPayantClaim) {
      throw new BadRequestException(
        'Un dossier tiers-payant existe déjà pour cette facture',
      );
    }

    return {
      factureId: facture.id,
      numero: facture.numero,
      totalTTC: facture.totalTTC,
      clientNom: `${facture.client.prenom || ''} ${facture.client.nom || ''}`.trim(),
      conventionId: facture.client.conventionId,
    };
  }

  async create(dto: CreateTiersPayantClaimDto) {
    const facture = await this.prisma.facture.findUnique({
      where: { id: dto.factureId },
      include: { client: true, tiersPayantClaim: true },
    });

    if (!facture) {
      throw new NotFoundException('Facture introuvable');
    }
    if (facture.tiersPayantClaim) {
      throw new BadRequestException(
        'Un dossier tiers-payant existe déjà pour cette facture',
      );
    }
    if (!facture.client.conventionId) {
      throw new BadRequestException(
        "Ce client n'est rattaché à aucune convention/mutuelle",
      );
    }
    if (dto.montantPriseEnCharge > facture.totalTTC) {
      throw new BadRequestException(
        'Le montant pris en charge ne peut pas dépasser le total de la facture',
      );
    }

    return this.prisma.tiersPayantClaim.create({
      data: {
        factureId: dto.factureId,
        conventionId: facture.client.conventionId,
        clientId: facture.clientId,
        montantTotalTTC: facture.totalTTC,
        montantPriseEnCharge: dto.montantPriseEnCharge,
        montantPartClient: facture.totalTTC - dto.montantPriseEnCharge,
        notes: dto.notes,
      },
      include: { facture: true, convention: true, client: true },
    });
  }

  async findAll(filters: {
    statut?: string;
    conventionId?: string;
    centreId?: string;
  }) {
    return this.prisma.tiersPayantClaim.findMany({
      where: {
        statut: filters.statut || undefined,
        conventionId: filters.conventionId || undefined,
        facture: filters.centreId
          ? { centreId: filters.centreId }
          : undefined,
      },
      include: { facture: true, convention: true, client: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const claim = await this.prisma.tiersPayantClaim.findUnique({
      where: { id },
      include: { facture: true, convention: true, client: true },
    });
    if (!claim) {
      throw new NotFoundException('Dossier tiers-payant introuvable');
    }
    return claim;
  }

  async update(id: string, dto: UpdateTiersPayantClaimDto) {
    const claim = await this.findOne(id);

    const data: Record<string, unknown> = { ...dto };

    if (dto.montantPriseEnCharge !== undefined) {
      if (dto.montantPriseEnCharge > claim.montantTotalTTC) {
        throw new BadRequestException(
          'Le montant pris en charge ne peut pas dépasser le total de la facture',
        );
      }
      data.montantPartClient = claim.montantTotalTTC - dto.montantPriseEnCharge;
    }

    if (dto.statut === 'SOUMISE' && !claim.dateSoumission && !dto.dateSoumission) {
      data.dateSoumission = new Date();
    }
    if (
      (dto.statut === 'REMBOURSEE' || dto.statut === 'REJETEE') &&
      !claim.dateReglement &&
      !dto.dateReglement
    ) {
      data.dateReglement = new Date();
    }

    return this.prisma.tiersPayantClaim.update({
      where: { id },
      data,
      include: { facture: true, convention: true, client: true },
    });
  }

  async remove(id: string) {
    const claim = await this.findOne(id);
    if (claim.statut !== 'BROUILLON') {
      throw new BadRequestException(
        'Seul un dossier au statut BROUILLON peut être supprimé',
      );
    }
    return this.prisma.tiersPayantClaim.delete({ where: { id } });
  }
}
