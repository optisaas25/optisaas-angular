# OptiSass - Guide de Style Material Design Pro

## 🎨 Vue d'ensemble

Ce guide définit les standards de design pour tous les modules d'OptiSass, basé sur le Material Design Pro de Google avec un style **Bold, Colorful, Structured**.

---

## 🎯 Principes de Design

### 1. Bold (Audacieux)

- Typographie grande et claire
- Contrastes forts
- Hiérarchie visuelle marquée

### 2. Colorful (Coloré)

- Palette Google Material
- Icônes multicolores
- Gradients vibrants

### 3. Structured (Structuré)

- Layouts basés sur des cartes
- Système d'élévation cohérent
- Grilles responsives

---

## 🎨 Palette de Couleurs

### Couleurs Principales

```scss
// Google Blue (Primary)
$google-blue: #4285f4;
$google-blue-dark: #1a73e8;
$google-blue-light: #aecbfa;

// Google Red (Accent)
$google-red: #ea4335;
$google-red-dark: #d93025;

// Google Yellow (Warning)
$google-yellow: #fbbc04;
$google-yellow-dark: #f9ab00;

// Google Green (Success)
$google-green: #34a853;
$google-green-dark: #0d652d;

// Neutrals
$gray-50: #f8f9fa;
$gray-100: #f1f3f4;
$gray-200: #e8eaed;
$gray-300: #dadce0;
$gray-400: #bdc1c6;
$gray-500: #9aa0a6;
$gray-600: #80868b;
$gray-700: #5f6368;
$gray-800: #3c4043;
$gray-900: #202124;
```

### Couleurs par Module

| Module | Couleur | Code | Usage |
|--------|---------|------|-------|
| Dashboard | Blue | `#4285f4` | Icône, header, stats |
| Clients | Green | `#34a853` | Icône, accents |
| Stock | Orange | `#fb8c00` | Icône, badges |
| Ventes | Purple | `#7b1fa2` | Icône, graphiques |
| Mesures | Teal | `#00897b` | Icône, outils |
| Essayage | Pink | `#e91e63` | Icône, preview |
| Dépenses | Red | `#ea4335` | Icône, alertes |
| Paie | Indigo | `#303f9f` | Icône, calculs |

---

## 📐 Système d'Élévation

### Classes d'Élévation

```scss
.elevation-0 { box-shadow: none; }
.elevation-1 { box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15); }
.elevation-2 { box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 2px 6px 2px rgba(60,64,67,.15); }
.elevation-3 { box-shadow: 0 4px 8px 3px rgba(60,64,67,.15), 0 1px 3px rgba(60,64,67,.3); }
.elevation-4 { box-shadow: 0 6px 10px 4px rgba(60,64,67,.15), 0 2px 3px rgba(60,64,67,.3); }
```

### Usage

- **Elevation-1**: Cartes normales, filtres
- **Elevation-2**: Cartes au hover, modales
- **Elevation-3**: Menus déroulants, tooltips
- **Elevation-4**: Dialogs, overlays

---

## 📦 Composants Standards

### 1. Stat Cards (Cartes de Statistiques)

**Structure HTML:**

```html
<div class="stats-grid">
    <mat-card class="stat-card stat-card-blue">
        <mat-card-content>
            <div class="stat-value">{{ value }}</div>
            <div class="stat-label">{{ label }}</div>
        </mat-card-content>
    </mat-card>
</div>
```

**SCSS:**

```scss
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 32px;
}

.stat-card {
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card:hover {
    box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 2px 6px 2px rgba(60,64,67,.15);
    transform: translateY(-2px);
}

.stat-card-blue {
    background: linear-gradient(135deg, #4285f4 0%, #1a73e8 100%);
    color: white;
}

.stat-value {
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 8px;
}

.stat-label {
    font-size: 14px;
    opacity: 0.9;
    font-weight: 500;
}
```

**Variantes de Couleurs:**

- `.stat-card-blue` - Bleu Google
- `.stat-card-green` - Vert Google
- `.stat-card-orange` - Orange
- `.stat-card-purple` - Violet
- `.stat-card-teal` - Teal
- `.stat-card-pink` - Rose
- `.stat-card-red` - Rouge
- `.stat-card-indigo` - Indigo

---

### 2. Data Tables (Tableaux de Données)

**Structure HTML:**

```html
<div class="table-container">
    <table mat-table [dataSource]="dataSource" class="data-table">
        <!-- Columns -->
    </table>
    <mat-paginator></mat-paginator>
</div>
```

**SCSS:**

```scss
.table-container {
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
    overflow: hidden;
}

.data-table {
    width: 100%;
}

.mat-mdc-header-cell {
    font-weight: 500 !important;
    color: #5f6368 !important;
    font-size: 14px !important;
}

.mat-mdc-cell {
    color: #202124 !important;
    font-size: 14px !important;
}

.mat-mdc-row:hover {
    background-color: #f8f9fa !important;
}
```

---

### 3. Filter Cards (Cartes de Filtres)

**Structure HTML:**

```html
<mat-card class="filter-card">
    <mat-card-content class="filter-content">
        <mat-form-field subscriptSizing="dynamic">
            <mat-label>Filtre</mat-label>
            <mat-select>
                <mat-option value="">Tous</mat-option>
            </mat-select>
        </mat-form-field>
        <button mat-raised-button color="primary">Rechercher</button>
    </mat-card-content>
</mat-card>
```

**SCSS:**

```scss
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
```

---

### 4. Form Fields (Champs de Formulaire)

**Structure HTML:**

```html
<label class="block text-sm font-medium text-gray-700 mb-1">Label</label>
<mat-form-field subscriptSizing="dynamic" class="w-full no-label-field">
    <input matInput formControlName="field">
</mat-form-field>
```

**SCSS (déjà dans styles.scss global):**

```scss
.mat-mdc-input-element {
    background-color: #f8f9fa !important;
    border: 1px solid #dadce0 !important;
    border-radius: 4px !important;
    padding: 10px 12px !important;
    font-size: 14px !important;
    color: #202124 !important;
    height: 44px !important;
}

.mat-mdc-input-element:focus {
    border-color: #4285f4 !important;
    box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2) !important;
}
```

---

### 5. Action Buttons (Boutons d'Action)

**Primary Button:**

```html
<button mat-raised-button color="primary">
    <mat-icon>add</mat-icon> Ajouter
</button>
```

**Secondary Button:**

```html
<button mat-stroked-button>
    <mat-icon>download</mat-icon> Exporter
</button>
```

**Danger Button:**

```html
<button mat-raised-button color="warn">
    <mat-icon>delete</mat-icon> Supprimer
</button>
```

---

### 6. Status Badges (Badges de Statut)

**HTML:**

```html
<span class="status-badge status-active">Actif</span>
<span class="status-badge status-inactive">Inactif</span>
<span class="status-badge status-pending">En attente</span>
```

**SCSS:**

```scss
.status-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    display: inline-block;
}

.status-active {
    background-color: #e6f4ea;
    color: #1e8e3e;
}

.status-inactive {
    background-color: #fce8e6;
    color: #d93025;
}

.status-pending {
    background-color: #fef7e0;
    color: #f9ab00;
}
```

---

## 📱 Layout Standards

### Container Principal

```scss
.module-container {
    padding: 24px;
    background: #f8f9fa;
    min-height: calc(100vh - 64px); // 64px = header height
}
```

### Actions Bar

```scss
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
```

### Grid System

```scss
// 2 colonnes
.grid-2 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
}

// 3 colonnes
.grid-3 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
}

// 4 colonnes
.grid-4 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
}
```

---

## 🎭 Animations

### Transitions Standard

```scss
// Hover effects
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

// Fast transitions
transition: all 0.2s ease;

// Slow transitions
transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
```

### Hover States

```scss
.card:hover {
    transform: translateY(-2px);
    box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 2px 6px 2px rgba(60,64,67,.15);
}

.button:hover {
    transform: scale(1.02);
}
```

---

## 📏 Spacing System

### Marges et Paddings

```scss
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;
$spacing-2xl: 48px;
```

### Usage

- **xs (4px)**: Espacement minimal entre éléments liés
- **sm (8px)**: Espacement entre icônes et texte
- **md (16px)**: Espacement standard entre composants
- **lg (24px)**: Padding de cartes, sections
- **xl (32px)**: Marges entre sections majeures
- **2xl (48px)**: Espacement de page

---

## 🔤 Typographie

### Font Family

```scss
font-family: 'Roboto', sans-serif;
```

### Tailles de Police

```scss
// Headers
h1 { font-size: 32px; font-weight: 500; }
h2 { font-size: 24px; font-weight: 500; }
h3 { font-size: 20px; font-weight: 500; }
h4 { font-size: 18px; font-weight: 500; }

// Body
.text-lg { font-size: 16px; }
.text-base { font-size: 14px; }
.text-sm { font-size: 13px; }
.text-xs { font-size: 12px; }

// Stats
.stat-value { font-size: 32px; font-weight: 700; }
```

---

## 📋 Checklist pour Nouveau Module

Lors de la création d'un nouveau module, vérifier :

- [ ] **Couleur du module** définie (icône sidebar)
- [ ] **Stat cards** avec gradient de la couleur du module
- [ ] **Header** avec titre et boutons d'action
- [ ] **Filter card** si nécessaire
- [ ] **Data table** avec élévation
- [ ] **Form fields** avec labels au-dessus
- [ ] **Buttons** avec icônes Material
- [ ] **Status badges** pour les états
- [ ] **Responsive** sur mobile
- [ ] **Hover effects** sur les cartes
- [ ] **Focus states** sur les inputs

---

## 🎨 Exemple Complet - Module Type

```typescript
// module.component.ts
@Component({
  selector: 'app-module',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule],
  template: `
    <div class="module-container">
      <!-- Stats -->
      <div class="stats-grid">
        <mat-card class="stat-card stat-card-blue">
          <mat-card-content>
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">Total</div>
          </mat-card-content>
        </mat-card>
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
          <!-- Filters -->
        </mat-card-content>
      </mat-card>

      <!-- Data Table -->
      <div class="table-container">
        <table mat-table [dataSource]="dataSource">
          <!-- Columns -->
        </table>
        <mat-paginator></mat-paginator>
      </div>
    </div>
  `,
  styleUrls: ['./module.component.scss']
})
```

---

## 🚀 Ressources

- [Material Design Guidelines](https://m3.material.io/)
- [Angular Material](https://material.angular.io/)
- [Google Material Icons](https://fonts.google.com/icons)
- [Material Color Tool](https://material.io/resources/color/)

---

## ✅ Validation

Avant de merger un nouveau module, vérifier :

1. **Cohérence visuelle** avec les autres modules
2. **Palette de couleurs** respectée
3. **Élévations** correctes
4. **Responsive** testé
5. **Accessibilité** (contraste, ARIA)
6. **Performance** (animations fluides)

---

**Version:** 1.0  
**Dernière mise à jour:** 2025-11-30  
**Auteur:** OptiSass Team
