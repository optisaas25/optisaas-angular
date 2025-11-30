import { Routes } from '@angular/router';
import { LayoutComponent } from './core/layout/layout.component';

export const routes: Routes = [
    {
        path: '',
        component: LayoutComponent,
        children: [
            {
                path: '',
                redirectTo: 'clients',
                pathMatch: 'full',
            },
            {
                path: 'clients',
                loadChildren: () =>
                    import('./features/clients/clients.routes').then((m) => m.CLIENT_ROUTES),
            },
            {
                path: 'stock',
                loadChildren: () =>
                    import('./features/stock/stock.routes').then((m) => m.stockRoutes),
            },
        ],
    },
];
