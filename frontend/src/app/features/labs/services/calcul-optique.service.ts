import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class CalculOptiqueService {
    calculer(landmark: any) {
        console.log('CalculOptiqueService calculer stub');
        return {
            centreX: 50,
            centreY: 42,
            scale: 1
        };
    }
}
