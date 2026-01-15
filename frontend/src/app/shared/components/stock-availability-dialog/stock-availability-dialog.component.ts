import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface StockAvailabilityItem {
    description: string;
    reference: string;
    localStock: number;
    required: number;
    globalAvailability: {
        centreName: string;
        entrepotNom: string;
        quantite: number;
    }[];
}

export interface StockAvailabilityData {
    items: StockAvailabilityItem[];
    documentType: 'BC' | 'Facture';
}

@Component({
    selector: 'app-stock-availability-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    template: `
        <div class="availability-check-container">
            <div class="dialog-header">
                <mat-icon color="warn">warning</mat-icon>
                <h2 mat-dialog-title>Disponibilité Stock</h2>
            </div>

            <mat-dialog-content>
                <p class="intro-text">
                    Certains produits de ce <strong>{{ data.documentType === 'BC' ? 'Bon de Commande' : 'Facture' }}</strong> 
                    ne sont pas disponibles en stock suffisant dans votre centre.
                </p>

                <div class="conflicts-list">
                    <div *ngFor="let item of data.items" class="conflict-item card-glass mb-4">
                        <div class="item-header">
                            <span class="item-title">{{ item.description }}</span>
                            <span class="item-ref">Ref: {{ item.reference }}</span>
                        </div>

                        <div class="availability-status mt-2">
                            <div class="status-row">
                                <span class="label">Stock Local Actuel:</span>
                                <span class="value badge-outline" [class.danger]="item.localStock < item.required">
                                    {{ item.localStock }} unité(s)
                                </span>
                            </div>
                            <div class="status-row">
                                <span class="label">Quantité Requise:</span>
                                <span class="value">{{ item.required }} unité(s)</span>
                            </div>
                        </div>

                        <div class="global-availability mt-3" *ngIf="item.globalAvailability.length > 0">
                            <span class="sub-title">Disponible dans d'autres centres :</span>
                            <div class="table-container mt-2">
                                <table class="availability-table">
                                    <thead>
                                        <tr>
                                            <th>Centre</th>
                                            <th>Entrepôt</th>
                                            <th>Quantité</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr *ngFor="let loc of item.globalAvailability">
                                            <td>{{ loc.centreName }}</td>
                                            <td>{{ loc.entrepotNom }}</td>
                                            <td class="text-primary font-bold">{{ loc.quantite }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="no-global-availability mt-3" *ngIf="item.globalAvailability.length === 0">
                            <span class="text-danger small">
                                <mat-icon class="tiny-icon">error_outline</mat-icon>
                                Aucune disponibilité trouvée dans les autres centres du groupe.
                            </span>
                        </div>
                    </div>
                </div>

                <div class="alert-info card-glass-info mt-4">
                    <mat-icon>info</mat-icon>
                    <p>
                        Vous pouvez tout de même forcer la validation si vous attendez une réception imminente 
                        ou s'il s'agit d'une erreur d'inventaire connue.
                    </p>
                </div>
            </mat-dialog-content>

            <mat-dialog-actions align="end">
                <button mat-button (click)="onCancel()" class="btn-cancel">ANNULER</button>
                <button mat-raised-button color="warn" (click)="onConfirm()" class="btn-force">
                    VALIDER QUAND MÊME
                </button>
            </mat-dialog-actions>
        </div>
    `,
    styles: [`
        .availability-check-container {
            padding: 10px;
        }
        .dialog-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            color: #d32f2f;
        }
        .dialog-header h2 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 600;
        }
        .intro-text {
            color: #555;
            margin-bottom: 24px;
            font-size: 1.1rem;
        }
        .item-title {
            font-weight: 600;
            font-size: 1.1rem;
            color: #333;
        }
        .item-ref {
            font-size: 0.9rem;
            color: #666;
            background: #f0f0f0;
            padding: 2px 8px;
            border-radius: 4px;
        }
        .status-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
        }
        .label { color: #666; }
        .value { font-weight: 600; }
        .value.danger { color: #d32f2f; }
        
        .sub-title {
            display: block;
            font-weight: 600;
            font-size: 0.95rem;
            color: #1976d2;
            margin-bottom: 8px;
        }
        
        .availability-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
        }
        .availability-table th {
            text-align: left;
            padding: 8px;
            background: rgba(0,0,0,0.05);
            border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        .availability-table td {
            padding: 8px;
            border-bottom: 1px solid rgba(0,0,0,0.05);
        }

        .tiny-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
            vertical-align: middle;
            margin-right: 4px;
        }

        .btn-force {
            background-color: #d32f2f !important;
            color: white !important;
        }
    `]
})
export class StockAvailabilityDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<StockAvailabilityDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: StockAvailabilityData
    ) { }

    onCancel(): void {
        this.dialogRef.close(false);
    }

    onConfirm(): void {
        this.dialogRef.close(true);
    }
}
