import { FirebaseService } from '../firebase/firebase.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientFilterDto } from './dto/client-filter.dto';
import { Client } from '../../../../shared/interfaces/client.interface';
export declare class ClientsService {
    private firebaseService;
    private collectionName;
    constructor(firebaseService: FirebaseService);
    create(createClientDto: CreateClientDto): Promise<Client>;
    findAll(filterDto: ClientFilterDto): Promise<Client[]>;
    findOne(id: string): Promise<Client>;
    update(id: string, updateClientDto: UpdateClientDto): Promise<Client>;
    remove(id: string): Promise<void>;
    getStats(): Promise<{
        totalClients: number;
        clientsCompte: number;
        clientsPassage: number;
        clientsAccess: number;
        byType: {
            particulier: number;
            anonyme: number;
            professionnel: number;
        };
    }>;
}
