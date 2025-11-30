import { ClientType, ClientStatus, Title, CoverageType, InternalContact, Convention } from '../../../../shared/interfaces/client.interface';
export declare class InternalContactDto implements InternalContact {
    nom: string;
    prenom: string;
    role: string;
    telephone?: string;
    email?: string;
}
export declare class ConventionDto implements Convention {
    hasConvention: boolean;
    typePartenariat?: string;
    tauxRemise?: number;
    details?: string;
}
export declare class CreateClientDto {
    type: ClientType;
    status: ClientStatus;
    title?: Title;
    nom?: string;
    prenom?: string;
    dateNaissance?: Date;
    telephone?: string;
    email?: string;
    emailParticulier?: string;
    partenaireNom?: string;
    partenairePrenom?: string;
    partenaireTelephone?: string;
    ville?: string;
    adresse?: string;
    codePostal?: string;
    cin?: string;
    hasCouverture?: boolean;
    couvertureType?: CoverageType;
    couvertureDetails?: string;
    antecedents?: string;
    remarques?: string;
    parrainId?: string;
    raisonSociale?: string;
    identifiantFiscal?: string;
    ice?: string;
    numeroSociete?: string;
    convention?: ConventionDto;
    contactsInternes?: InternalContactDto[];
    facturationGroupee?: boolean;
}
