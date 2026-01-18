import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class FicheLaboService {
    getFiche(id: string) {
        console.log('FicheLaboService getFiche stub');
        return { id, details: 'Mock Fiche Details' };
    }
}
