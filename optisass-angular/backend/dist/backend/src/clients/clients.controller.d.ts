import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientFilterDto } from './dto/client-filter.dto';
export declare class ClientsController {
    private readonly clientsService;
    constructor(clientsService: ClientsService);
    create(createClientDto: CreateClientDto): Promise<import("../../../shared/interfaces/client.interface").Client>;
    findAll(filterDto: ClientFilterDto): Promise<import("../../../shared/interfaces/client.interface").Client[]>;
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
    findOne(id: string): Promise<import("../../../shared/interfaces/client.interface").Client>;
    update(id: string, updateClientDto: UpdateClientDto): Promise<import("../../../shared/interfaces/client.interface").Client>;
    remove(id: string): Promise<void>;
}
