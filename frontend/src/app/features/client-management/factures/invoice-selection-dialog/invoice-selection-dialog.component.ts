import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FactureService } from '../../services/facture.service';

@Component({
  selector: 'app-invoice-selection-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatTableModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Sélectionner une facture à annuler</h2>
    <mat-dialog-content>
      <div class="modern-table-container">
          <table mat-table [dataSource]="invoices" class="mat-elevation-z0">
            <!-- Numero Column -->
            <ng-container matColumnDef="numero">
              <th mat-header-cell *matHeaderCellDef> Numéro </th>
              <td mat-cell *matCellDef="let element"> {{element.numero}} </td>
            </ng-container>

            <!-- Date Column -->
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef> Date </th>
              <td mat-cell *matCellDef="let element"> {{element.dateEmission | date:'dd/MM/yyyy'}} </td>
            </ng-container>

            <!-- Total Column -->
            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef> Total TTC </th>
              <td mat-cell *matCellDef="let element"> {{element.totalTTC | number:'1.2-2'}} DH </td>
            </ng-container>

            <!-- Action Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef> </th>
              <td mat-cell *matCellDef="let element">
                <button mat-stroked-button color="primary" (click)="select(element)">
                  Sélectionner
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <div *ngIf="invoices.length === 0" class="empty-state">
              <mat-icon>info</mat-icon>
              <p>Aucune facture disponible pour ce client.</p>
          </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .modern-table-container {
        width: 100%;
        max-height: 500px;
        overflow: auto;
    }
    table {
        width: 100%;
    }
    .empty-state {
        padding: 2rem;
        text-align: center;
        color: #64748b;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }
  `]
})
export class InvoiceSelectionDialogComponent implements OnInit {
  invoices: any[] = [];
  displayedColumns: string[] = ['numero', 'date', 'total', 'actions'];

  constructor(
    private dialogRef: MatDialogRef<InvoiceSelectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { clientId: string },
    private factureService: FactureService
  ) { }

  ngOnInit() {
    this.loadInvoices();
  }

  loadInvoices() {
    this.factureService.findAll({
      clientId: this.data.clientId,
      type: 'FACTURE'
    }).subscribe(data => {
      // Filter out drafts if necessary, though user might want to credit a draft (unlikely, usually we edit drafts)
      // Usually Avoir is for Validated invoices.
      this.invoices = data.filter(f => f.statut !== 'BROUILLON');
    });
  }

  select(invoice: any) {
    this.dialogRef.close(invoice);
  }
}
