import { IsNumber, IsObject, IsOptional } from 'class-validator';

/**
 * Placeholder for a future real telesubmission integration. Nothing calls
 * out to an insurer with these today - they're just stored (encrypted) so
 * they're ready to use once real API access/documentation exists.
 */
export interface OrganismeApiCredentials {
  apiEndpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  notes?: string;
}

export class UpdateOrganismeConfigDto {
  @IsOptional()
  @IsNumber()
  plafondRemboursement?: number;

  @IsOptional()
  @IsObject()
  apiCredentials?: OrganismeApiCredentials;
}
