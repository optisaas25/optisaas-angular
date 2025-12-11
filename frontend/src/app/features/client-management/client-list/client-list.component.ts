import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ClientService } from '../services/client.service';
import { Client, StatutClient } from '../models/client.model';

interface ClientStats {
    actifs: number;
    enCompte: number;
    passage: number;
    inactifs: number;
}

@Component({
    selector: 'app-client-list',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatSelectModule,
        MatTableModule,
        MatPaginatorModule,
        MatIconModule,
    ],
    templateUrl: './client-list.component.html',
    styleUrl: './client-list.component.css'
})
export class ClientListComponent implements OnInit {
    searchForm: FormGroup;
    stats = signal<ClientStats>({ actifs: 0, enCompte: 0, passage: 0, inactifs: 0 });
    clients = signal<Client[]>([]);
    displayedColumns: string[] = ['type', 'titre', 'nom', 'prenom', 'telephone', 'cin', 'ville', 'statut', 'actions'];

    pageSize = 10;
    pageIndex = 0;
    totalItems = 0;

    clientTypes = ['Particulier', 'Professionnel', 'Anonyme'];
    statuts = ['Actif', 'Inactif', 'En compte', 'De passage'];

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private clientService: ClientService
    ) {
        this.searchForm = this.fb.group({
            typeClient: [''],
            statut: [''],
            nom: [''],
            prenom: [''],
            telephone: [''],
            cin: [''],
            ville: ['']
        });
    }

    ngOnInit() {
        this.loadClients();
        this.loadStats();
    }

    loadStats() {
        // TODO: Implement backend endpoint for stats or calculate from list
        // For now, we initialize with 0
        this.stats.set({
            actifs: 0,
            enCompte: 0,
            passage: 0,
            inactifs: 0
        });
    }

    loadClients() {
        this.clientService.getClients().subscribe({
            next: (data) => {
                this.clients.set(data);
                this.totalItems = data.length;
                this.updateStats(data);
            },
            error: (err) => console.error('Error loading clients', err)
        });
    }

    updateStats(clients: Client[]) {
        const stats = {
            actifs: clients.filter(c => c.statut === StatutClient.ACTIF).length,
            enCompte: clients.filter(c => c.statut === StatutClient.EN_COMPTE).length,
            passage: clients.filter(c => c.statut === StatutClient.DE_PASSAGE).length,
            inactifs: clients.filter(c => c.statut === StatutClient.INACTIF).length
        };
        this.stats.set(stats);
    }

    onSearch() {
        const criteria = this.searchForm.value;
        // Basic filtered list from loaded clients (Client-side filtering for now)
        // OR better: use clientService.searchClients(criteria)
        this.clientService.searchClients(criteria).subscribe({
            next: (data) => {
                this.clients.set(data);
                this.totalItems = data.length;
            },
            error: (err) => console.error('Error searching clients', err)
        });
    }

    onPageChange(event: PageEvent) {
        this.pageSize = event.pageSize;
        this.pageIndex = event.pageIndex;
        // Implement backend pagination if supported
        // For now, simple refresh or slice if we had full list logic (but clients uses full list)
    }

    viewClient(client: Client) {
        this.router.navigate(['/p/clients', client.id]);
    }

    editClient(client: Client) {
        this.router.navigate(['/p/clients', client.id, 'edit']);
    }

    addClient() {
        this.router.navigate(['/p/clients/new']);
    }

    exportClients() {
        console.log('Export des clients');
        // TODO: Implémenter l'export
    }
}
