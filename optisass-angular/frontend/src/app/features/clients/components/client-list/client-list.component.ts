import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { Client } from '../../../../shared/interfaces/client.interface';
import { ClientService } from '../../../../core/services/client.service';

@Component({
    selector: 'app-client-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        FormsModule,
    ],
    templateUrl: './client-list.component.html',
    styleUrls: ['./client-list.component.scss'],
})
export class ClientListComponent implements OnInit {
    displayedColumns: string[] = ['type', 'nom', 'prenom', 'telephone', 'cin', 'ville', 'status', 'actions'];
    dataSource: MatTableDataSource<Client> = new MatTableDataSource<Client>([]);

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    filter = {
        type: '',
        status: '',
        search: '',
        prenom: '',
        telephone: '',
        cin: '',
        ville: '',
    };

    stats = {
        totalClients: 0,
        clientsCompte: 0,
        clientsPassage: 0,
        clientsAccess: 0,
    };

    constructor(private clientService: ClientService) { }

    ngOnInit(): void {
        this.loadClients();
        this.loadStats();
    }

    loadClients(): void {
        this.clientService.getClients().subscribe({
            next: (clients: Client[]) => {
                this.dataSource.data = clients;
                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort;
            },
            error: (error: any) => console.error('Error loading clients:', error),
        });
    }

    loadStats(): void {
        // Mock stats for now
        this.stats = {
            totalClients: this.dataSource.data.length,
            clientsCompte: 0,
            clientsPassage: 0,
            clientsAccess: 0,
        };
    }

    applyFilter(): void {
        this.loadClients();
    }

    exportXLS(): void {
        console.log('Export XLS functionality to be implemented');
    }

    getClientName(client: Client): string {
        if ('nom' in client && 'prenom' in client) {
            return `${client.nom} ${client.prenom}`;
        }
        if ('raisonSociale' in client) {
            return client.raisonSociale;
        }
        return 'Client Anonyme';
    }

    getClientCity(client: Client): string {
        return ('ville' in client ? client.ville : '--') ?? '--';
    }

    getClientPostalCode(client: Client): string {
        return ('codePostal' in client ? client.codePostal : '--') ?? '--';
    }

    getClientCIN(client: Client): string {
        if (client.type === 'particulier' && 'cin' in client) {
            return client.cin || '--';
        }
        return '--';
    }

    getClientPrenom(client: Client): string {
        if (client.type === 'particulier' && 'prenom' in client) {
            return client.prenom || '--';
        }
        return '--';
    }
}
