import { Routes } from '@angular/router';
import { ProductListComponent } from './components/product-list/product-list.component';

export const stockRoutes: Routes = [
    {
        path: '',
        component: ProductListComponent
    },
    {
        path: 'new',
        loadComponent: () => import('./components/product-form/product-form.component').then(m => m.ProductFormComponent)
    },
    {
        path: ':id',
        loadComponent: () => import('./components/product-detail/product-detail.component').then(m => m.ProductDetailComponent)
    },
    {
        path: ':id/edit',
        loadComponent: () => import('./components/product-form/product-form.component').then(m => m.ProductFormComponent)
    }
];
