/**
 * Base Client Interface
 */
export interface BaseClient {
    id?: string;
    type: ClientType;
    code?: string;
    status: ClientStatus;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Client Types
 */
export enum ClientType {
    PARTICULIER = 'particulier',
    ANONYME = 'anonyme',
    PROFESSIONNEL = 'professionnel'
}

/**
 * Client Status
 */
export enum ClientStatus {
    ACTIF = 'actif',
    INACTIF = 'inactif',
    COMPTE = 'compte',
    PASSAGE = 'passage'
}

/**
 * Title for Client Particulier
 */
export enum Title {
    MR = 'Mr',
    MME = 'Mme',
    MLLE = 'Mlle',
    ENF = 'Enf'
}

/**
 * Coverage Type
 */
export enum CoverageType {
    MUTUELLE = 'mutuelle',
    CNSS = 'cnss',
    RAMED = 'ramed',
    AUTRE = 'autre'
}

/**
 * Client Particulier (Individual Client)
 */
export interface ClientParticulier extends BaseClient {
    type: ClientType.PARTICULIER;

    // Identité
    title: Title;
    nom: string;
    prenom: string;

    // Naissance
    dateNaissance: Date;

    // Contact
    telephone: string; // obligatoire
    email?: string; // secondaire

    // Situation Familiale
    partenaireNom?: string;
    partenairePrenom?: string;
    partenaireTelephone?: string;

    // Localisation
    adresse?: string; // facultative
    ville: string; // obligatoire
    codePostal?: string;

    // Document
    cin: string; // ou CIN du parent si mineur

    // Couverture sociale
    hasCouverture: boolean;
    couvertureType?: CoverageType;
    couvertureDetails?: string;

    // Dossier médical
    antecedents?: string;
    remarques?: string;

    // Programme fidélité
    parrainId?: string;
    pointsFidelite?: number;
}

/**
 * Client Anonyme (Anonymous Client)
 */
export interface ClientAnonyme extends BaseClient {
    type: ClientType.ANONYME;

    // Données limitées
    ville?: string; // facultatif
    telephone?: string; // facultatif

    // Pas d'historique médical
    // Ne participe pas au programme fidélité
}

/**
 * Internal Contact for Professional Client
 */
export interface InternalContact {
    nom: string;
    prenom: string;
    role: string; // RH, comptable, etc.
    telephone?: string;
    email?: string;
}

/**
 * Convention Details
 */
export interface Convention {
    hasConvention: boolean;
    typePartenariat?: string; // tarif, remise, facturation groupée
    tauxRemise?: number;
    details?: string;
}

/**
 * Client Professionnel (Professional/Corporate Client)
 */
export interface ClientProfessionnel extends BaseClient {
    type: ClientType.PROFESSIONNEL;

    // Identité
    raisonSociale: string;

    // Légal
    identifiantFiscal: string;
    ice?: string;
    numeroSociete?: string;

    // Contact
    adresse: string;
    ville: string;
    codePostal?: string;
    telephone: string;
    email: string;

    // Convention
    convention: Convention;

    // Contacts internes
    contactsInternes?: InternalContact[];

    // Facturation groupée
    facturationGroupee?: boolean;
}

/**
 * Union type for all client types
 */
export type Client = ClientParticulier | ClientAnonyme | ClientProfessionnel;

/**
 * Visit History Entry
 */
export interface VisitHistory {
    id?: string;
    clientId: string;
    date: Date;
    type: VisitType;
    montureId?: string;
    lentillesId?: string;
    verresId?: string;
    notes?: string;
    montant?: number;
}

export enum VisitType {
    CONSULTATION = 'consultation',
    VENTE = 'vente',
    CONTROLE = 'controle',
    REPARATION = 'reparation',
    AUTRE = 'autre'
}

/**
 * Reminder Entry
 */
export interface Reminder {
    id?: string;
    clientId: string;
    type: ReminderType;
    dueDate: Date;
    sent: boolean;
    sentDate?: Date;
    message?: string;
}

export enum ReminderType {
    CONTROLE_ANNUEL = 'controle_annuel',
    RENOUVELLEMENT_LENTILLES = 'renouvellement_lentilles',
    SUIVI_COMMANDE = 'suivi_commande',
    AUTRE = 'autre'
}

/**
 * Client Statistics
 */
export interface ClientStats {
    totalClients: number;
    clientsCompte: number;
    clientsPassage: number;
    clientsAccess: number;
    byType: {
        particulier: number;
        anonyme: number;
        professionnel: number;
    };
}
