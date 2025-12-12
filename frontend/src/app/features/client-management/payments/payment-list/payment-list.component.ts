import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FactureService, Facture } from '../../services/facture.service';
import { InvoiceSelectionDialogComponent } from '../../factures/invoice-selection-dialog/invoice-selection-dialog.component';
import { PaymentDialogComponent, Payment } from '../../factures/payment-dialog/payment-dialog.component';

interface PaymentRow {
    id?: string; // Payment ID if available, or generated
    date: Date;
    montant: number;
    mode: string;
    reference?: string;
    notes?: string;
    factureNumero: string;
    factureId: string;
}

@Component({
    selector: 'app-payment-list',
    standalone: true,
    imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule],
    template: `
    <div class="payment-list-container">
      <div class="header-actions">
        <h2>Historique des Paiements</h2>
        <button mat-raised-button color="primary" (click)="createNewPayment()">
          <mat-icon>add</mat-icon> Nouveau Paiement
        </button>
      </div>

      <div class="modern-table-container">
        <table mat-table [dataSource]="dataSource" class="mat-elevation-z0">
          
          <!-- Date Column -->
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef> Date </th>
            <td mat-cell *matCellDef="let element"> {{element.date | date:'dd/MM/yyyy'}} </td>
          </ng-container>

          <!-- Facture Column -->
          <ng-container matColumnDef="facture">
            <th mat-header-cell *matHeaderCellDef> Facture </th>
            <td mat-cell *matCellDef="let element"> {{element.factureNumero}} </td>
          </ng-container>

          <!-- Montant Column -->
          <ng-container matColumnDef="montant">
            <th mat-header-cell *matHeaderCellDef> Montant </th>
            <td mat-cell *matCellDef="let element"> {{element.montant | number:'1.2-2'}} DH </td>
          </ng-container>

          <!-- Mode Column -->
          <ng-container matColumnDef="mode">
            <th mat-header-cell *matHeaderCellDef> Mode </th>
            <td mat-cell *matCellDef="let element"> 
                <span class="badge badge-gray">{{ getPaymentModeLabel(element.mode) }}</span>
            </td>
          </ng-container>

          <!-- Reference Column -->
          <ng-container matColumnDef="reference">
            <th mat-header-cell *matHeaderCellDef> Référence </th>
            <td mat-cell *matCellDef="let element"> {{element.reference || '-'}} </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
        
        <div *ngIf="dataSource.data.length === 0" class="empty-state">
             <mat-icon>payments</mat-icon>
             <p>Aucun paiement enregistré.</p>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .payment-list-container {
        padding: 20px;
    }
    .header-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }
    .modern-table-container {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #e2e8f0;
    }
    table {
        width: 100%;
    }
    th {
        background-color: #f8fafc;
        color: #475569;
        font-weight: 500;
        text-transform: uppercase;
        font-size: 12px;
        letter-spacing: 0.5px;
        padding: 16px;
    }
    td {
        padding: 16px;
        border-bottom: 1px solid #e2e8f0;
        color: #1e293b;
    }
    .badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
    }
    .badge-gray {
        background-color: #f1f5f9;
        color: #475569;
    }
    .empty-state {
        padding: 40px;
        text-align: center;
        color: #94a3b8;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
    }
    .empty-state mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
    }
  `]
})
export class PaymentListComponent implements OnInit {
    @Input() clientId!: string;
    dataSource = new MatTableDataSource<PaymentRow>([]);
    displayedColumns: string[] = ['date', 'facture', 'montant', 'mode', 'reference'];

    constructor(
        private factureService: FactureService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit() {
        this.loadPayments();
    }

    loadPayments() {
        if (!this.clientId) return;

        this.factureService.findAll({ clientId: this.clientId, type: 'FACTURE' }).subscribe(factures => {
            const allPayments: PaymentRow[] = [];

            factures.forEach(facture => {
                if (facture.paiements && Array.isArray(facture.paiements)) {
                    facture.paiements.forEach((p: Payment) => {
                        allPayments.push({
                            ...p,
                            factureNumero: facture.numero,
                            factureId: facture.id
                        });
                    });
                }
            });

            // Sort by date desc
            allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            this.dataSource.data = allPayments;
        });
    }

    createNewPayment() {
        // 1. Select Invoice
        const dialogRef = this.dialog.open(InvoiceSelectionDialogComponent, {
            width: '1000px',
            maxWidth: '95vw',
            data: { clientId: this.clientId }
        });

        dialogRef.afterClosed().subscribe((facture: Facture) => {
            if (facture) {
                // Check if invoice is already paid
                if (facture.statut === 'PAYEE') {
                    this.snackBar.open('Cette facture est déjà payée.', 'OK', { duration: 3000 });
                    return;
                }

                // 2. Open Payment Dialog
                this.openPaymentForm(facture);
            }
        });
    }

    openPaymentForm(facture: Facture) {
        const resteAPayer = facture.resteAPayer || (facture.totalTTC - (facture.paiements?.reduce((sum: number, p: any) => sum + p.montant, 0) || 0));

        const dialogRef = this.dialog.open(PaymentDialogComponent, {
            width: '800px',
            maxWidth: '90vw',
            data: {
                resteAPayer: resteAPayer
            }
        });

        dialogRef.afterClosed().subscribe((payment: Payment) => {
            if (payment) {
                this.savePayment(facture, payment);
            }
        });
    }

    savePayment(facture: Facture, payment: Payment) {
        const updatedPayments = [...(facture.paiements || []), payment];

        // Calculate new status
        const totalPaid = updatedPayments.reduce((sum, p) => sum + p.montant, 0);
        let newStatus = facture.statut;
        if (totalPaid >= facture.totalTTC) {
            newStatus = 'PAYEE';
        } else if (totalPaid > 0) {
            newStatus = 'PARTIEL';
        }

        const updatePayload = {
            paiements: updatedPayments,
            statut: newStatus
        };

        this.factureService.update(facture.id, updatePayload).subscribe({
            next: () => {
                this.snackBar.open('Paiement enregistré avec succès', 'Fermer', { duration: 3000 });
                this.loadPayments(); // Reload list
            },
            error: (err) => {
                console.error('Error saving payment', err);
                this.snackBar.open('Erreur lors de l\'enregistrement du paiement', 'Fermer', { duration: 3000 });
            }
        });
    }

    getPaymentModeLabel(mode: string): string {
        const modes: any = {
            'ESPECES': 'Espèces',
            'CARTE': 'Carte',
            'CHEQUE': 'Chèque',
            'VIREMENT': 'Virement',
            'AUTRE': 'Autre'
        };
        return modes[mode] || mode;
    }
}
