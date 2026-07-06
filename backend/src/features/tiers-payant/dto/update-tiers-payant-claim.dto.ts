import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export const TIERS_PAYANT_STATUTS = [
  'BROUILLON',
  'SOUMISE',
  'EN_ATTENTE',
  'REMBOURSEE',
  'REJETEE',
] as const;

export class UpdateTiersPayantClaimDto {
  @IsOptional()
  @IsIn(TIERS_PAYANT_STATUTS)
  statut?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montantPriseEnCharge?: number;

  @IsOptional()
  @IsString()
  referenceOrganisme?: string;

  @IsOptional()
  @IsDateString()
  dateSoumission?: string;

  @IsOptional()
  @IsDateString()
  dateReglement?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
