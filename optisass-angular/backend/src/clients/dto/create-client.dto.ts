import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString, IsBoolean, IsNumber, ValidateNested, ValidateIf, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ClientType, ClientStatus, Title, CoverageType, InternalContact, Convention } from '../../../../shared/interfaces/client.interface';

export class InternalContactDto implements InternalContact {
    @IsString()
    @IsNotEmpty()
    nom: string;

    @IsString()
    @IsNotEmpty()
    prenom: string;

    @IsString()
    @IsNotEmpty()
    role: string;

    @IsString()
    @IsOptional()
    telephone?: string;

    @IsString()
    @IsOptional()
    email?: string;
}

export class ConventionDto implements Convention {
    @IsBoolean()
    hasConvention: boolean;

    @IsString()
    @IsOptional()
    typePartenariat?: string;

    @IsNumber()
    @IsOptional()
    tauxRemise?: number;

    @IsString()
    @IsOptional()
    details?: string;
}

export class CreateClientDto {
    @IsEnum(ClientType)
    @IsNotEmpty()
    type: ClientType;

    @IsEnum(ClientStatus)
    @IsOptional()
    status: ClientStatus = ClientStatus.ACTIF;

    // --- Particulier Fields ---

    @ValidateIf(o => o.type === ClientType.PARTICULIER)
    @IsEnum(Title)
    @IsNotEmpty()
    title?: Title;

    @ValidateIf(o => o.type === ClientType.PARTICULIER)
    @IsString()
    @IsNotEmpty()
    nom?: string;

    @ValidateIf(o => o.type === ClientType.PARTICULIER)
    @IsString()
    @IsNotEmpty()
    prenom?: string;

    @ValidateIf(o => o.type === ClientType.PARTICULIER)
    @IsDateString()
    @IsNotEmpty()
    dateNaissance?: Date;

    // Contact (Particulier & Professionnel)
    @ValidateIf(o => o.type !== ClientType.ANONYME)
    @IsString()
    @IsNotEmpty()
    telephone?: string;

    @ValidateIf(o => o.type === ClientType.PROFESSIONNEL)
    @IsString()
    @IsNotEmpty()
    email?: string;

    @ValidateIf(o => o.type === ClientType.PARTICULIER)
    @IsString()
    @IsOptional()
    emailParticulier?: string;

    // Situation Familiale (Particulier)
    @IsString()
    @IsOptional()
    partenaireNom?: string;

    @IsString()
    @IsOptional()
    partenairePrenom?: string;

    @IsString()
    @IsOptional()
    partenaireTelephone?: string;

    // Localisation
    @ValidateIf(o => o.type !== ClientType.ANONYME)
    @IsString()
    @IsNotEmpty()
    ville?: string;

    @IsString()
    @IsOptional()
    adresse?: string;

    @IsString()
    @IsOptional()
    codePostal?: string;

    // Document (Particulier)
    @ValidateIf(o => o.type === ClientType.PARTICULIER)
    @IsString()
    @IsNotEmpty()
    cin?: string;

    // Couverture sociale (Particulier)
    @ValidateIf(o => o.type === ClientType.PARTICULIER)
    @IsBoolean()
    hasCouverture?: boolean;

    @ValidateIf(o => o.type === ClientType.PARTICULIER && o.hasCouverture)
    @IsEnum(CoverageType)
    couvertureType?: CoverageType;

    @IsString()
    @IsOptional()
    couvertureDetails?: string;

    // Dossier médical
    @IsString()
    @IsOptional()
    antecedents?: string;

    @IsString()
    @IsOptional()
    remarques?: string;

    // Programme fidélité
    @IsString()
    @IsOptional()
    parrainId?: string;

    // --- Professionnel Fields ---

    @ValidateIf(o => o.type === ClientType.PROFESSIONNEL)
    @IsString()
    @IsNotEmpty()
    raisonSociale?: string;

    @ValidateIf(o => o.type === ClientType.PROFESSIONNEL)
    @IsString()
    @IsNotEmpty()
    identifiantFiscal?: string;

    @IsString()
    @IsOptional()
    ice?: string;

    @IsString()
    @IsOptional()
    numeroSociete?: string;

    @ValidateIf(o => o.type === ClientType.PROFESSIONNEL)
    @ValidateNested()
    @Type(() => ConventionDto)
    convention?: ConventionDto;

    @ValidateIf(o => o.type === ClientType.PROFESSIONNEL)
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InternalContactDto)
    @IsOptional()
    contactsInternes?: InternalContactDto[];

    @IsBoolean()
    @IsOptional()
    facturationGroupee?: boolean;
}
