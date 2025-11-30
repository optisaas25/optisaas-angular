# OptiSass - Composants Réutilisables Material Design Pro

## 📦 Composants Disponibles

### 1. StatCardComponent

Carte de statistique avec gradient coloré et effet hover.

**Import:**

```typescript
import { StatCardComponent } from '@app/shared/components';
```

**Usage:**

```html
<app-stat-card 
  [value]="150" 
  label="Clients actifs" 
  color="blue">
</app-stat-card>
```

**Props:**

- `value` (string | number): Valeur à afficher
- `label` (string): Libellé de la statistique
- `color` (StatCardColor): Couleur du gradient
  - Options: `'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'pink' | 'red' | 'indigo'`

**Exemple complet:**

```typescript
// component.ts
import { StatCardComponent } from '@app/shared/components';

@Component({
  imports: [StatCardComponent],
  // ...
})

// component.html
<div class="stats-grid">
  <app-stat-card [value]="stats.total" label="Total" color="blue"></app-stat-card>
  <app-stat-card [value]="stats.active" label="Actifs" color="green"></app-stat-card>
  <app-stat-card [value]="stats.pending" label="En attente" color="orange"></app-stat-card>
</div>
```

---

### 2. StatusBadgeComponent

Badge de statut avec couleurs prédéfinies.

**Import:**

```typescript
import { StatusBadgeComponent } from '@app/shared/components';
```

**Usage:**

```html
<app-status-badge label="Actif" type="active"></app-status-badge>
```

**Props:**

- `label` (string): Texte du badge
- `type` (StatusType): Type de statut
  - Options: `'active' | 'inactive' | 'pending' | 'success' | 'warning' | 'error'`

**Exemple complet:**

```typescript
// component.ts
import { StatusBadgeComponent } from '@app/shared/components';

@Component({
  imports: [StatusBadgeComponent],
  // ...
})

// component.html
<app-status-badge 
  [label]="client.status | titlecase" 
  [type]="client.status">
</app-status-badge>
```

---

## 🎨 Classes CSS Utilitaires

### Grid Layouts

```html
<!-- 2 colonnes -->
<div class="grid-2">
  <app-stat-card ...></app-stat-card>
  <app-stat-card ...></app-stat-card>
</div>

<!-- 3 colonnes -->
<div class="grid-3">
  <app-stat-card ...></app-stat-card>
  <app-stat-card ...></app-stat-card>
  <app-stat-card ...></app-stat-card>
</div>

<!-- 4 colonnes -->
<div class="grid-4">
  <app-stat-card ...></app-stat-card>
  <app-stat-card ...></app-stat-card>
  <app-stat-card ...></app-stat-card>
  <app-stat-card ...></app-stat-card>
</div>
```

### Elevation

```html
<mat-card class="elevation-1">Carte normale</mat-card>
<mat-card class="elevation-2">Carte élevée</mat-card>
<mat-card class="elevation-3">Carte très élevée</mat-card>
```

### Couleurs Google

```html
<!-- Texte -->
<span class="google-blue">Texte bleu</span>
<span class="google-red">Texte rouge</span>
<span class="google-yellow">Texte jaune</span>
<span class="google-green">Texte vert</span>

<!-- Fond -->
<div class="bg-google-blue">Fond bleu</div>
<div class="bg-google-red">Fond rouge</div>
<div class="bg-google-yellow">Fond jaune</div>
<div class="bg-google-green">Fond vert</div>
```

---

## 📋 Template de Module Standard

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { StatCardComponent, StatusBadgeComponent } from '@app/shared/components';

@Component({
  selector: 'app-my-module',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    StatCardComponent,
    StatusBadgeComponent
  ],
  template: `
    <div class="module-container">
      <!-- Stats Cards -->
      <div class="stats-grid">
        <app-stat-card 
          [value]="stats.total" 
          label="Total" 
          color="blue">
        </app-stat-card>
        <app-stat-card 
          [value]="stats.active" 
          label="Actifs" 
          color="green">
        </app-stat-card>
        <app-stat-card 
          [value]="stats.pending" 
          label="En attente" 
          color="orange">
        </app-stat-card>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <h2 class="section-title">Vue d'ensemble</h2>
        <div class="actions">
          <button mat-stroked-button>
            <mat-icon>download</mat-icon> Exporter
          </button>
          <button mat-raised-button color="primary">
            <mat-icon>add</mat-icon> Ajouter
          </button>
        </div>
      </div>

      <!-- Filter Card -->
      <mat-card class="filter-card">
        <mat-card-content class="filter-content">
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Statut</mat-label>
            <mat-select [(ngModel)]="filter.status">
              <mat-option value="">Tous</mat-option>
              <mat-option value="active">Actif</mat-option>
              <mat-option value="inactive">Inactif</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-raised-button color="primary">Rechercher</button>
        </mat-card-content>
      </mat-card>

      <!-- Data Table -->
      <div class="table-container">
        <table mat-table [dataSource]="dataSource" class="data-table">
          <!-- Status Column with Badge -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Statut</th>
            <td mat-cell *matCellDef="let row">
              <app-status-badge 
                [label]="row.status | titlecase" 
                [type]="row.status">
              </app-status-badge>
            </td>
          </ng-container>

          <!-- Other columns... -->

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
        <mat-paginator [pageSizeOptions]="[5, 10, 25, 100]"></mat-paginator>
      </div>
    </div>
  `,
  styleUrls: ['./my-module.component.scss']
})
export class MyModuleComponent {
  stats = {
    total: 150,
    active: 120,
    pending: 30
  };

  filter = {
    status: ''
  };

  displayedColumns = ['name', 'status', 'actions'];
  dataSource = [];
}
```

**SCSS du module:**

```scss
.module-container {
    padding: 24px;
    background: #f8f9fa;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 32px;
}

.actions-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.section-title {
    font-size: 24px;
    font-weight: 500;
    color: #202124;
    margin: 0;
}

.actions {
    display: flex;
    gap: 12px;
}

.filter-card {
    margin-bottom: 24px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
}

.filter-content {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    align-items: center;
    padding: 20px;
}

.table-container {
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
    overflow: hidden;
}

.data-table {
    width: 100%;
}
```

---

## 🎯 Bonnes Pratiques

### 1. Couleurs par Module

Choisir une couleur cohérente pour chaque module :

```typescript
// Stock Module
<app-stat-card color="orange" ...></app-stat-card>

// Ventes Module
<app-stat-card color="purple" ...></app-stat-card>

// Clients Module
<app-stat-card color="green" ...></app-stat-card>
```

### 2. Responsive

Toujours utiliser les grids responsives :

```html
<div class="stats-grid">
  <!-- S'adapte automatiquement sur mobile -->
</div>
```

### 3. Accessibilité

Ajouter des labels ARIA :

```html
<app-stat-card 
  [value]="150" 
  label="Clients actifs" 
  color="blue"
  role="region"
  aria-label="Statistique des clients actifs">
</app-stat-card>
```

### 4. Performance

Utiliser `trackBy` pour les listes :

```html
<app-stat-card 
  *ngFor="let stat of stats; trackBy: trackByStat"
  [value]="stat.value"
  [label]="stat.label"
  [color]="stat.color">
</app-stat-card>
```

---

## 📚 Ressources

- [STYLE_GUIDE.md](./STYLE_GUIDE.md) - Guide de style complet
- [Material Design](https://m3.material.io/) - Documentation officielle
- [Angular Material](https://material.angular.io/) - Composants Angular

---

**Version:** 1.0  
**Dernière mise à jour:** 2025-11-30
