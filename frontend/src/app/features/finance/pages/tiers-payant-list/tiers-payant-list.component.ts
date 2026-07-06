import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FinanceService } from '../../services/finance.service';
import { Convention, TiersPayantClaim, TiersPayantStatut } from '../../models/finance.models';

const STATUT_LABELS: Record<TiersPayantStatut, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE: 'Soumise',
  EN_ATTENTE: 'En attente',
  REMBOURSEE: 'Remboursée',
  REJETEE: 'Rejetée',
};

@Component({
  selector: 'app-tiers-payant-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './tiers-payant-list.component.html',
})
export class TiersPayantListComponent implements OnInit {
  protected readonly statutOptions = Object.entries(STATUT_LABELS);
  protected readonly displayedColumns = [
    'select',
    'numero',
    'client',
    'convention',
    'montantTotalTTC',
    'montantPriseEnCharge',
    'montantPartClient',
    'statut',
    'actions',
  ];

  protected claims = signal<TiersPayantClaim[]>([]);
  protected conventions = signal<Convention[]>([]);
  protected loading = signal(false);
  protected filterStatut = signal('');
  protected filterConventionId = signal('');
  protected selectedIds = signal<Set<string>>(new Set());

  protected showCreateForm = signal(false);
  protected lookupNumero = signal('');
  protected lookupResult = signal<{ factureId: string; numero: string; totalTTC: number; clientNom: string } | null>(null);
  protected lookupError = signal<string | null>(null);
  protected lookupLoading = signal(false);
  protected createMontant = signal(0);
  protected creating = signal(false);

  protected selectedCount = computed(() => this.selectedIds().size);

  constructor(
    private financeService: FinanceService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadConventions();
    this.loadClaims();
  }

  statutLabel(statut: string): string {
    return STATUT_LABELS[statut as TiersPayantStatut] || statut;
  }

  loadConventions(): void {
    this.financeService.getConventions().subscribe({
      next: (data) => this.conventions.set(data),
      error: () => {},
    });
  }

  loadClaims(): void {
    this.loading.set(true);
    this.financeService
      .getTiersPayantClaims({
        statut: this.filterStatut() || undefined,
        conventionId: this.filterConventionId() || undefined,
      })
      .subscribe({
        next: (data) => {
          this.claims.set(data);
          this.selectedIds.set(new Set());
          this.loading.set(false);
        },
        error: () => {
          this.snackBar.open('Erreur lors du chargement des dossiers', 'Fermer', { duration: 3000 });
          this.loading.set(false);
        },
      });
  }

  onFilterChange(): void {
    this.loadClaims();
  }

  toggleCreateForm(): void {
    this.showCreateForm.update((v) => !v);
    this.lookupNumero.set('');
    this.lookupResult.set(null);
    this.lookupError.set(null);
    this.createMontant.set(0);
  }

  searchFacture(): void {
    if (!this.lookupNumero()) return;
    this.lookupLoading.set(true);
    this.lookupError.set(null);
    this.lookupResult.set(null);
    this.financeService.lookupFactureForTiersPayant(this.lookupNumero()).subscribe({
      next: (res) => {
        this.lookupResult.set(res);
        this.createMontant.set(res.totalTTC);
        this.lookupLoading.set(false);
      },
      error: (err) => {
        this.lookupError.set(err.error?.message || 'Facture introuvable');
        this.lookupLoading.set(false);
      },
    });
  }

  submitCreate(): void {
    const result = this.lookupResult();
    if (!result) return;
    this.creating.set(true);
    this.financeService
      .createTiersPayantClaim({
        factureId: result.factureId,
        montantPriseEnCharge: this.createMontant(),
      })
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.snackBar.open('Dossier créé avec succès', 'OK', { duration: 3000 });
          this.toggleCreateForm();
          this.loadClaims();
        },
        error: (err) => {
          this.creating.set(false);
          this.snackBar.open(err.error?.message || 'Erreur lors de la création', 'Fermer', { duration: 3000 });
        },
      });
  }

  updateStatut(claim: TiersPayantClaim, statut: string): void {
    this.financeService.updateTiersPayantClaim(claim.id, { statut: statut as TiersPayantStatut }).subscribe({
      next: () => {
        this.snackBar.open('Statut mis à jour', 'OK', { duration: 2000 });
        this.loadClaims();
      },
      error: () => {
        this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 3000 });
      },
    });
  }

  deleteClaim(claim: TiersPayantClaim): void {
    if (!confirm(`Supprimer le dossier de la facture ${claim.facture.numero} ?`)) return;
    this.financeService.deleteTiersPayantClaim(claim.id).subscribe({
      next: () => {
        this.snackBar.open('Dossier supprimé', 'OK', { duration: 2000 });
        this.loadClaims();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erreur lors de la suppression', 'Fermer', { duration: 3000 });
      },
    });
  }

  toggleSelect(id: string): void {
    const set = new Set(this.selectedIds());
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    this.selectedIds.set(set);
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  exportOne(claim: TiersPayantClaim): void {
    this.financeService.exportTiersPayantClaim(claim.id).subscribe({
      next: (blob) => this.downloadBlob(blob, `dossier-tiers-payant-${claim.facture.numero}.pdf`),
      error: () => this.snackBar.open("Erreur lors de l'export", 'Fermer', { duration: 3000 }),
    });
  }

  exportSelected(): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;
    this.financeService.exportTiersPayantClaimsBatch(ids).subscribe({
      next: (blob) => this.downloadBlob(blob, 'dossiers-tiers-payant.pdf'),
      error: () => this.snackBar.open("Erreur lors de l'export", 'Fermer', { duration: 3000 }),
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
