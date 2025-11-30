import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Client, ClientType, ClientStatus, Title } from '../../../../../shared/interfaces/client.interface';

@Injectable({
    providedIn: 'root'
})
export class ClientService {

    private mockClients: Client[] = [
        {
            id: '1',
            type: ClientType.PARTICULIER,
            status: ClientStatus.ACTIF,
            createdAt: new Date(),
            updatedAt: new Date(),
            nom: 'Doe',
            prenom: 'John',
            ville: 'Casablanca',
            telephone: '0600000000',
            cin: 'AB123456',
            hasCouverture: false,
            title: Title.MR,
            dateNaissance: new Date('1990-01-01')
        }
    ];

    constructor() { }

    // Get all clients
    getClients(): Observable<Client[]> {
        return of(this.mockClients);
    }

    // Get client by ID
    getClientById(id: string): Observable<Client | undefined> {
        const client = this.mockClients.find(c => c.id === id);
        return of(client);
    }

    // Find one client (alias for getClientById)
    findOne(id: string): Observable<Client | undefined> {
        return this.getClientById(id);
    }

    // Create new client
    create(client: Partial<Client>): Observable<Client> {
        console.log('Creating client:', client);

        // Generate ID and timestamps
        const id = Math.random().toString(36).substr(2, 9);
        const createdAt = new Date();
        const updatedAt = new Date();

        // Create new client with proper type
        const newClient = {
            ...client,
            id,
            createdAt,
            updatedAt
        } as Client;

        this.mockClients.push(newClient);
        console.log('Client created successfully:', newClient);
        console.log('Total clients:', this.mockClients.length);
        return of(newClient);
    }

    // Add client (alias for create)
    addClient(client: Client): Observable<Client> {
        return this.create(client);
    }

    // Update existing client
    update(id: string, clientData: Partial<Client>): Observable<Client> {
        console.log('Updating client:', id, clientData);
        const index = this.mockClients.findIndex(c => c.id === id);
        if (index !== -1) {
            const updatedClient = {
                ...this.mockClients[index],
                ...clientData,
                id: id, // Preserve ID
                updatedAt: new Date()
            } as Client;

            this.mockClients[index] = updatedClient;
            console.log('Client updated successfully:', updatedClient);
            return of(updatedClient);
        }
        throw new Error(`Client with id ${id} not found`);
    }

    // Update client (alternative signature)
    updateClient(client: Client): Observable<Client> {
        return this.update(client.id!, client);
    }

    // Delete client
    delete(id: string): Observable<boolean> {
        const index = this.mockClients.findIndex(c => c.id === id);
        if (index !== -1) {
            this.mockClients.splice(index, 1);
            console.log('Client deleted successfully');
            return of(true);
        }
        return of(false);
    }
}
