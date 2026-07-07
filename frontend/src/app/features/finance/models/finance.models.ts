export interface Supplier {
    id: string;
    nom: string;
    contact?: string;
    email?: string;
    telephone?: string;
    adresse?: string;
    ville?: string;
    siteWeb?: string;
    ice?: string;
    rc?: string;
    identifiantFiscal?: string;
    patente?: string;
    cnss?: string;
    siret?: string;
    banque?: string;
    rib?: string;
    conditionsPaiement?: string;
    conditionsPaiement2?: string;  // Temporary field for migration
    contacts?: SupplierContact[];
    convention?: any;
    createdAt?: string;
    updatedAt?: string;
}

export interface SupplierContact {
    nom: string;
    prenom: string;
    fonction: string;
    telephone: string;
    email: string;
    taches?: string[];
    canal?: string;
}

export interface Expense {
    id: string;
    date: string;
    montant: number;
    categorie: string;
    description?: string;
    modePaiement: string;
    statut: string;
    justificatifUrl?: string;
    reference?: string;
    banque?: string;
    dateEcheance?: string;
    centreId: string;
    centre?: { nom: string };
    fournisseurId?: string;
    fournisseur?: { nom: string };
    factureFournisseur?: { numeroFacture: string, fournisseur: { nom: string } };
    bonLivraisonId?: string;
    bonLivraison?: { numeroBL: string, fournisseur?: { nom: string } };
    createdAt?: string;
}

export interface ExpenseDTO {
    date: string;
    montant: number;
    categorie: string;
    description?: string;
    modePaiement: string;
    statut: string;
    justificatifUrl?: string;
    reference?: string;
    banque?: string;
    dateEcheance?: string;
    centreId: string;
    fournisseurId?: string;
    factureFournisseurId?: string;
    bonLivraisonId?: string;
}

export interface SupplierInvoice {
    id: string;
    numeroFacture: string;
    dateEmission: string;
    dateEcheance?: string;
    montantHT: number;
    montantTVA: number;
    montantTTC: number;
    statut: string;
    type: string;
    parentInvoice?: SupplierInvoice;
    childBLs?: any[]; // Links to BonLivraison objects
    pieceJointeUrl?: string;
    fournisseurId: string;
    centreId?: string;
    clientId?: string;
    ficheId?: string;
    client?: any;
    fiche?: any;
    fournisseur?: Supplier;
    echeances?: Echeance[];
    createdAt?: string;
}

export interface Echeance {
    id?: string;
    type: string;
    dateEcheance: string;
    dateEncaissement?: string;
    montant: number;
    statut: string;
    reference?: string; // CHEQUE/LCN num
    banque?: string;
}

export interface SupplierInvoiceDTO {
    numeroFacture: string;
    dateEmission: string;
    dateEcheance?: string;
    montantHT: number;
    montantTVA: number;
    montantTTC: number;
    statut: string;
    type: string;
    fournisseurId: string;
    clientId?: string;
    ficheId?: string;
    centreId?: string;
    pieceJointeUrl?: string;
    echeances?: Echeance[];
    base64File?: string;
    fileName?: string;
}

export interface BonLivraison {
    id: string;
    numeroBL: string;
    dateEmission: string;
    dateEcheance?: string;
    montantHT: number;
    montantTVA: number;
    montantTTC: number;
    statut: string;
    type: string;
    categorieBL?: string;
    factureFournisseurId?: string;
    factureFournisseur?: SupplierInvoice;
    pieceJointeUrl?: string;
    fournisseurId: string;
    centreId?: string;
    clientId?: string;
    ficheId?: string;
    client?: any;
    fiche?: any;
    fournisseur?: Supplier;
    echeances?: Echeance[];
    createdAt?: string;
}

export interface BonLivraisonListResponse {
    data: BonLivraison[];
    total: number;
    stats: {
        totalTTC: number;
        totalPaid: number;
        totalRemaining: number;
    };
}

export interface BonLivraisonDTO {
    numeroBL: string;
    dateEmission: string;
    dateEcheance?: string;
    montantHT: number;
    montantTVA: number;
    montantTTC: number;
    statut: string;
    type: string;
    categorieBL?: string;
    factureFournisseurId?: string;
    fournisseurId: string;
    clientId?: string;
    ficheId?: string;
    centreId?: string;
    pieceJointeUrl?: string;
    echeances?: Echeance[];
    base64File?: string;
    fileName?: string;
}

export interface FundingRequest {
    id: string;
    montant: number;
    statut: string;
    createdAt: string;
    validatedAt?: string;
    validatedBy?: string;
    remarque?: string;
    depenseId?: string;
    paiementId?: string;
    depense?: Expense;
    paiement?: any; // To be improved with Payment interface if needed
    journeeCaisse: {
        centreId: string;
        caisse: { nom: string };
    };
}

export interface Convention {
    id: string;
    nom: string;
    description?: string;
    contact?: string;
    email?: string;
    telephone?: string;
    adresse?: string;
    remiseType: 'PERCENTAGE' | 'FLAT_AMOUNT';
    remiseValeur: number;
    remiseForfaitaire?: boolean;
    montantForfaitaire?: number;
    montantForfaitaireMonture?: number;
    montantForfaitaireVerre?: number;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
    _count?: {
        clients: number;
    };
}

export interface OrganismeApiCredentialsInput {
    apiEndpoint?: string;
    apiKey?: string;
    apiSecret?: string;
    notes?: string;
}

/** Never carries the real apiKey/apiSecret back from the API - only whether they're set. */
export interface OrganismeApiCredentialsMasked {
    apiEndpoint: string | null;
    notes: string | null;
    hasApiKey: boolean;
    hasApiSecret: boolean;
}

/** Reimbursement-side settings for an organisme (Convention) - separate from the billing/remise rule. */
export interface OrganismeConfig {
    plafondRemboursement: number | null;
    apiCredentials: OrganismeApiCredentialsMasked | null;
}

export interface OrganismeConfigInput {
    plafondRemboursement?: number | null;
    apiCredentials?: OrganismeApiCredentialsInput;
}

export type OrganismeListItem = Convention & OrganismeConfig;

export interface TiersPayantFactureSuggestion {
    factureId: string;
    numero: string;
    totalTTC: number;
    clientNom: string;
    hasOrganisme: boolean;
}

export type TiersPayantStatut = 'BROUILLON' | 'SOUMISE' | 'EN_ATTENTE' | 'REMBOURSEE' | 'REJETEE';

export interface TiersPayantClaim {
    id: string;
    factureId: string;
    conventionId: string;
    clientId: string;
    montantTotalTTC: number;
    montantPriseEnCharge: number;
    montantPartClient: number;
    statut: TiersPayantStatut;
    referenceOrganisme?: string;
    dateSoumission?: string;
    dateReglement?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    facture: { id: string; numero: string; dateEmission: string; totalTTC: number };
    convention: { id: string; nom: string };
    client: { id: string; nom: string; prenom: string };
}
