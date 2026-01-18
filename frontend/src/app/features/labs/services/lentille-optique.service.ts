import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class LentilleOptiqueService {
    calculEffet(prescription: any) {
        console.log('LentilleOptiqueService calculEffet stub');
        return { scale: 1.05 };
    }

    teinte(type: string) {
        console.log('LentilleOptiqueService teinte stub');
        return type === 'aucune' ? 'transparent' : 'rgba(0,0,255,0.1)';
    }
}
