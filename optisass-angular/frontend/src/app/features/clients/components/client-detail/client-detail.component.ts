import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { ClientsService } from '../../services/clients.service';
import { Client, ClientType, ClientParticulier, ClientProfessionnel } from '../../../../shared/interfaces/client.interface';

@Component({
    selector: 'app-client-detail',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatTabsModule,
        MatDividerModule
    ],
    templateUrl: './client-detail.component.html',
    styleUrls: ['./client-detail.component.scss']
})
export class ClientDetailComponent implements OnInit {
    client: Client | null = null;
    ClientType = ClientType;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private clientsService: ClientsService
    ) { }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadClient(id);
        }
    }

    loadClient(id: string) {
        this.clientsService.findOne(id).subscribe(client => {
            this.client = client;
        });
    }

    getClientEmail(client: Client): string {
        if (client.type === ClientType.PARTICULIER) {
            return (client as ClientParticulier).email || '--';
        } else if (client.type === ClientType.PROFESSIONNEL) {
            return (client as ClientProfessionnel).email;
        }
        return '--';
    }

    deleteClient() {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
            if (this.client && this.client.id) {
                this.clientsService.delete(this.client.id).subscribe(() => {
                    this.router.navigate(['/clients']);
                });
            }
        }
    }
}
