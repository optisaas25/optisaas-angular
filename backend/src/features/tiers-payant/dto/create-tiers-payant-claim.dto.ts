import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTiersPayantClaimDto {
  @IsNotEmpty()
  @IsString()
  factureId: string;

  @IsNumber()
  @Min(0)
  montantPriseEnCharge: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
