import { Routes } from '@angular/router';
import { LabsContainerComponent } from './labs-container.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { EssayageVirtuelComponent } from './components/essayage-virtuel/essayage-virtuel.component';
// Temporarily disabled due to Three.js module resolution issues
// import { Essayage3DComponent } from './components/essayage-3d/essayage-3d.component';
import { LentillesComponent } from './components/lentilles/lentilles.component';
import { FicheLaboComponent } from './components/fiche-labo/fiche-labo.component';

export const routes: Routes = [
    {
        path: '',
        component: LabsContainerComponent,
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: DashboardComponent },
            { path: 'essayage-virtuel', component: EssayageVirtuelComponent },
            // Temporarily disabled - Three.js resolution issue
            // { path: 'essayage-3d', component: Essayage3DComponent },
            { path: 'lentilles', component: LentillesComponent },
            { path: 'fiche-labo', component: FicheLaboComponent },
        ]
    }
];
