import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-client-detail',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatButtonModule],
    template: `
    <div class="p-6">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Détails du Client</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Client ID: {{ clientId }}</p>
          <p>Détails à venir...</p>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="goBack()">Retour</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
})
export class ClientDetailComponent {
    clientId: string | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router
    ) {
        this.clientId = this.route.snapshot.paramMap.get('id');
    }

    goBack() {
        this.router.navigate(['/p/clients']);
    }
}
