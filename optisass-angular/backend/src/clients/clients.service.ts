import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientFilterDto } from './dto/client-filter.dto';
import { Client, ClientStatus } from '../../../shared/interfaces/client.interface';

@Injectable()
export class ClientsService {
    private collectionName = 'clients';

    constructor(private firebaseService: FirebaseService) { }

    async create(createClientDto: CreateClientDto): Promise<Client> {
        const collection = this.firebaseService.getCollection(this.collectionName);
        const docRef = collection.doc();

        const newClient: Client = {
            id: docRef.id,
            ...createClientDto,
            createdAt: new Date(),
            updatedAt: new Date(),
        } as Client;

        await docRef.set(newClient);
        return newClient;
    }

    async findAll(filterDto: ClientFilterDto): Promise<Client[]> {
        let query: FirebaseFirestore.Query = this.firebaseService.getCollection(this.collectionName);

        if (filterDto.type) {
            query = query.where('type', '==', filterDto.type);
        }

        if (filterDto.status) {
            query = query.where('status', '==', filterDto.status);
        }

        if (filterDto.ville) {
            query = query.where('ville', '==', filterDto.ville);
        }

        const snapshot = await query.get();
        let clients = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
                // Handle other dates if necessary
            } as Client;
        });

        // Client-side filtering for search (Firestore search is limited)
        if (filterDto.search) {
            const searchLower = filterDto.search.toLowerCase();
            clients = clients.filter(client => {
                // Basic search implementation
                if ('nom' in client && client.nom?.toLowerCase().includes(searchLower)) return true;
                if ('prenom' in client && client.prenom?.toLowerCase().includes(searchLower)) return true;
                if ('raisonSociale' in client && client.raisonSociale?.toLowerCase().includes(searchLower)) return true;
                if (client.telephone?.includes(searchLower)) return true;
                return false;
            });
        }

        return clients;
    }

    async findOne(id: string): Promise<Client> {
        const doc = await this.firebaseService.getCollection(this.collectionName).doc(id).get();
        if (!doc.exists) {
            throw new NotFoundException(`Client with ID ${id} not found`);
        }
        const data = doc.data();
        if (!data) {
            throw new NotFoundException(`Client data with ID ${id} not found`);
        }
        return {
            ...data,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
        } as Client;
    }

    async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
        const docRef = this.firebaseService.getCollection(this.collectionName).doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new NotFoundException(`Client with ID ${id} not found`);
        }

        const updateData = {
            ...updateClientDto,
            updatedAt: new Date(),
        };

        await docRef.update(updateData);
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        const docRef = this.firebaseService.getCollection(this.collectionName).doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new NotFoundException(`Client with ID ${id} not found`);
        }
        await docRef.delete();
    }

    async getStats() {
        const snapshot = await this.firebaseService.getCollection(this.collectionName).get();
        const clients = snapshot.docs.map(doc => doc.data() as Client);

        return {
            totalClients: clients.length,
            clientsCompte: clients.filter(c => c.status === ClientStatus.COMPTE).length,
            clientsPassage: clients.filter(c => c.status === ClientStatus.PASSAGE).length,
            clientsAccess: 0, // Define logic for access clients
            byType: {
                particulier: clients.filter(c => c.type === 'particulier').length,
                anonyme: clients.filter(c => c.type === 'anonyme').length,
                professionnel: clients.filter(c => c.type === 'professionnel').length,
            }
        };
    }
}
