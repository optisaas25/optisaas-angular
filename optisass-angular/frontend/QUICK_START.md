# OptiSass - Quick Start Guide

## 🚀 Démarrage Rapide pour Nouveau Module

### 1. Créer le Module

```bash
ng generate component features/mon-module/components/mon-module-list --standalone
```

### 2. Importer les Composants Réutilisables

```typescript
import { StatCardComponent, StatusBadgeComponent } from '@app/shared/components';

@Component({
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    StatCardComponent,
    StatusBadgeComponent
  ],
  // ...
})
```

### 3. Copier le Template Standard

Voir `src/app/shared/components/README.md` pour le template complet.

### 4. Choisir la Couleur du Module

| Module | Couleur |
|--------|---------|
| Dashboard | `blue` |
| Clients | `green` |
| Stock | `orange` |
| Ventes | `purple` |
| Mesures | `teal` |
| Essayage | `pink` |
| Dépenses | `red` |
| Paie | `indigo` |

### 5. Ajouter au Sidebar

Dans `sidebar.component.ts`:

```typescript
menuItems: MenuItem[] = [
  // ...
  { label: 'Mon Module', icon: 'icon_name', route: '/mon-module', color: '#couleur' },
];
```

---

## 📦 Composants Essentiels

### Stat Card

```html
<app-stat-card [value]="150" label="Total" color="blue"></app-stat-card>
```

### Status Badge

```html
<app-status-badge label="Actif" type="active"></app-status-badge>
```

### Filter Card

```html
<mat-card class="filter-card">
  <mat-card-content class="filter-content">
    <!-- Filtres -->
  </mat-card-content>
</mat-card>
```

### Data Table

```html
<div class="table-container">
  <table mat-table [dataSource]="dataSource">
    <!-- Colonnes -->
  </table>
  <mat-paginator></mat-paginator>
</div>
```

---

## 🎨 Classes CSS Utiles

```html
<!-- Container principal -->
<div class="module-container">

<!-- Grid de stats -->
<div class="stats-grid">

<!-- Barre d'actions -->
<div class="actions-bar">
  <h2 class="section-title">Titre</h2>
  <div class="actions">
    <button mat-raised-button color="primary">Action</button>
  </div>
</div>
```

---

## 📚 Documentation Complète

- **Guide de Style**: `STYLE_GUIDE.md`
- **Composants**: `src/app/shared/components/README.md`
- **Exemples**: Module `clients` comme référence

---

## ✅ Checklist

- [ ] Module créé
- [ ] Composants importés
- [ ] Couleur choisie
- [ ] Stats cards ajoutées
- [ ] Table de données
- [ ] Filtres
- [ ] Boutons d'action
- [ ] Responsive testé
- [ ] Ajouté au sidebar

---

**Besoin d'aide ?** Consultez le module `clients` comme exemple de référence !
