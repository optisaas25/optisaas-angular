import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTiersPayantClaimDto } from './dto/create-tiers-payant-claim.dto';
import { UpdateTiersPayantClaimDto } from './dto/update-tiers-payant-claim.dto';
import { UpdateOrganismeConfigDto } from './dto/update-organisme-config.dto';
import {
  encryptJsonField,
  decryptJsonField,
} from '../../common/crypto/field-encryption.util';

type RawApiCredentials = {
  apiEndpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  notes?: string;
};

/**
 * apiCredentials never round-trips to the client in full once set - only
 * whether it's configured and the (non-secret) endpoint are exposed. This is
 * inert storage for a future telesubmission integration, not wired to any
 * outbound call today.
 */
function maskOrganismeConfig(config: {
  plafondRemboursement: number | null;
  apiCredentials: unknown;
} | null) {
  if (!config) {
    return { plafondRemboursement: null, apiCredentials: null };
  }
  const decrypted = decryptJsonField(config.apiCredentials) as
    | RawApiCredentials
    | null
    | undefined;
  return {
    plafondRemboursement: config.plafondRemboursement,
    apiCredentials: decrypted
      ? {
          apiEndpoint: decrypted.apiEndpoint || null,
          notes: decrypted.notes || null,
          hasApiKey: !!decrypted.apiKey,
          hasApiSecret: !!decrypted.apiSecret,
        }
      : null,
  };
}

/**
 * The organisme that reimburses a client (tiers payant) is driven by their
 * Couverture Sociale (mutuelle/CNSS/RAMED enrollment), not by the Convention
 * used to price their invoices - a client can be insured by one and billed
 * under an unrelated shop discount agreement, or neither.
 */
function getOrganismeId(client: { couvertureSociale: unknown }): string | null {
  const decrypted = decryptJsonField(client.couvertureSociale) as
    | { organismeId?: string }
    | null
    | undefined;
  return decrypted?.organismeId || null;
}

/**
 * Reimbursement owed by the organisme for a facture, applying the
 * Convention's remise (% or flat amount per dossier) then capping it at the
 * organisme's plafondRemboursement, if one is configured. Whatever isn't
 * covered remains the client's responsibility (montantPartClient).
 */
function computeMontantPriseEnCharge(
  totalTTC: number,
  convention: { remiseType: string; remiseValeur: number },
  plafondRemboursement: number | null | undefined,
): number {
  const base =
    convention.remiseType === 'PERCENTAGE'
      ? (totalTTC * convention.remiseValeur) / 100
      : convention.remiseValeur;
  const capped =
    plafondRemboursement != null ? Math.min(base, plafondRemboursement) : base;
  return Math.max(0, Math.min(capped, totalTTC));
}

@Injectable()
export class TiersPayantService {
  constructor(private prisma: PrismaService) {}

  async listOrganismes() {
    const conventions = await this.prisma.convention.findMany({
      include: { organismeConfig: true },
      orderBy: { nom: 'asc' },
    });
    return conventions.map(({ organismeConfig, ...convention }) => ({
      ...convention,
      ...maskOrganismeConfig(organismeConfig),
    }));
  }

  async getOrganismeConfig(conventionId: string) {
    const convention = await this.prisma.convention.findUnique({
      where: { id: conventionId },
      include: { organismeConfig: true },
    });
    if (!convention) {
      throw new NotFoundException('Organisme (convention) introuvable');
    }
    return maskOrganismeConfig(convention.organismeConfig);
  }

  async upsertOrganismeConfig(
    conventionId: string,
    dto: UpdateOrganismeConfigDto,
  ) {
    const convention = await this.prisma.convention.findUnique({
      where: { id: conventionId },
      include: { organismeConfig: true },
    });
    if (!convention) {
      throw new NotFoundException('Organisme (convention) introuvable');
    }

    const data: Record<string, unknown> = {};
    if (dto.plafondRemboursement !== undefined) {
      data.plafondRemboursement = dto.plafondRemboursement;
    }
    if (dto.apiCredentials !== undefined) {
      // The client never sees a previously-set apiKey/apiSecret again (only
      // hasApiKey/hasApiSecret booleans), so it can't resend them. Blank
      // fields here mean "leave unchanged", not "clear" - merge onto the
      // existing decrypted value instead of overwriting it wholesale.
      const current =
        (decryptJsonField(
          convention.organismeConfig?.apiCredentials,
        ) as RawApiCredentials | null | undefined) || {};
      const merged: RawApiCredentials = {
        apiEndpoint: dto.apiCredentials.apiEndpoint ?? current.apiEndpoint,
        apiKey: dto.apiCredentials.apiKey || current.apiKey,
        apiSecret: dto.apiCredentials.apiSecret || current.apiSecret,
        notes: dto.apiCredentials.notes ?? current.notes,
      };
      data.apiCredentials = encryptJsonField(merged);
    }

    const updated = await this.prisma.tiersPayantOrganismeConfig.upsert({
      where: { conventionId },
      create: { conventionId, ...data },
      update: data,
    });
    return maskOrganismeConfig(updated);
  }

  /**
   * Suggests factures for the "Nouveau dossier" search box - excludes
   * factures that already have a claim. Whether the client has an organisme
   * (via Couverture Sociale) is surfaced as a flag rather than filtered out,
   * since gating on it silently hides every result until clients have been
   * linked to one.
   */
  async searchFactures(query: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    const factures = await this.prisma.facture.findMany({
      where: {
        numero: { contains: query, mode: 'insensitive' },
        tiersPayantClaim: null,
      },
      include: { client: true },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
    return factures.map((f) => ({
      factureId: f.id,
      numero: f.numero,
      totalTTC: f.totalTTC,
      clientNom: `${f.client.prenom || ''} ${f.client.nom || ''}`.trim(),
      hasOrganisme: !!getOrganismeId(f.client),
    }));
  }

  async lookupFacture(numero: string) {
    const facture = await this.prisma.facture.findUnique({
      where: { numero },
      include: { client: true, tiersPayantClaim: true },
    });

    if (!facture) {
      throw new NotFoundException('Facture introuvable');
    }
    const organismeId = getOrganismeId(facture.client);
    if (!organismeId) {
      throw new BadRequestException(
        "Ce client n'a pas d'organisme de couverture sociale renseigné (onglet Couverture Sociale de sa fiche)",
      );
    }
    if (facture.tiersPayantClaim) {
      throw new BadRequestException(
        'Un dossier tiers-payant existe déjà pour cette facture',
      );
    }

    const convention = await this.prisma.convention.findUnique({
      where: { id: organismeId },
      include: { organismeConfig: true },
    });
    const plafondRemboursement = convention?.organismeConfig?.plafondRemboursement ?? null;
    const montantSuggere = convention
      ? computeMontantPriseEnCharge(facture.totalTTC, convention, plafondRemboursement)
      : facture.totalTTC;

    return {
      factureId: facture.id,
      numero: facture.numero,
      totalTTC: facture.totalTTC,
      clientNom: `${facture.client.prenom || ''} ${facture.client.nom || ''}`.trim(),
      conventionId: organismeId,
      conventionNom: convention?.nom ?? null,
      remiseType: convention?.remiseType ?? null,
      remiseValeur: convention?.remiseValeur ?? null,
      plafondRemboursement,
      montantSuggere,
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
    const organismeId = getOrganismeId(facture.client);
    if (!organismeId) {
      throw new BadRequestException(
        "Ce client n'a pas d'organisme de couverture sociale renseigné (onglet Couverture Sociale de sa fiche)",
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
        conventionId: organismeId,
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
