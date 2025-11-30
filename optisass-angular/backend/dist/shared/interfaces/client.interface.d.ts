export interface BaseClient {
    id?: string;
    type: ClientType;
    code?: string;
    status: ClientStatus;
    createdAt: Date;
    updatedAt: Date;
}
export declare enum ClientType {
    PARTICULIER = "particulier",
    ANONYME = "anonyme",
    PROFESSIONNEL = "professionnel"
}
export declare enum ClientStatus {
    ACTIF = "actif",
    INACTIF = "inactif",
    COMPTE = "compte",
    PASSAGE = "passage"
}
export declare enum Title {
    MR = "Mr",
    MME = "Mme",
    MLLE = "Mlle",
    ENF = "Enf"
}
export declare enum CoverageType {
    MUTUELLE = "mutuelle",
    CNSS = "cnss",
    RAMED = "ramed",
    AUTRE = "autre"
}
export interface ClientParticulier extends BaseClient {
    type: ClientType.PARTICULIER;
    title: Title;
    nom: string;
    prenom: string;
    dateNaissance: Date;
    telephone: string;
    email?: string;
    partenaireNom?: string;
    partenairePrenom?: string;
    partenaireTelephone?: string;
    adresse?: string;
    ville: string;
    codePostal?: string;
    cin: string;
    hasCouverture: boolean;
    couvertureType?: CoverageType;
    couvertureDetails?: string;
    antecedents?: string;
    remarques?: string;
    parrainId?: string;
    pointsFidelite?: number;
}
export interface ClientAnonyme extends BaseClient {
    type: ClientType.ANONYME;
    ville?: string;
    telephone?: string;
}
export interface InternalContact {
    nom: string;
    prenom: string;
    role: string;
    telephone?: string;
    email?: string;
}
export interface Convention {
    hasConvention: boolean;
    typePartenariat?: string;
    tauxRemise?: number;
    details?: string;
}
export interface ClientProfessionnel extends BaseClient {
    type: ClientType.PROFESSIONNEL;
    raisonSociale: string;
    identifiantFiscal: string;
    ice?: string;
    numeroSociete?: string;
    adresse: string;
    ville: string;
    codePostal?: string;
    telephone: string;
    email: string;
    convention: Convention;
    contactsInternes?: InternalContact[];
    facturationGroupee?: boolean;
}
export type Client = ClientParticulier | ClientAnonyme | ClientProfessionnel;
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
export declare enum VisitType {
    CONSULTATION = "consultation",
    VENTE = "vente",
    CONTROLE = "controle",
    REPARATION = "reparation",
    AUTRE = "autre"
}
export interface Reminder {
    id?: string;
    clientId: string;
    type: ReminderType;
    dueDate: Date;
    sent: boolean;
    sentDate?: Date;
    message?: string;
}
export declare enum ReminderType {
    CONTROLE_ANNUEL = "controle_annuel",
    RENOUVELLEMENT_LENTILLES = "renouvellement_lentilles",
    SUIVI_COMMANDE = "suivi_commande",
    AUTRE = "autre"
}
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
