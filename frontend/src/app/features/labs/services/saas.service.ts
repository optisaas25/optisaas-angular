import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class SaasService {
    statsConversion() {
        console.log('SaasService statsConversion stub');
        return {
            monturesPopulaires: {
                'Monture A': 10,
                'Monture B': 5
            }
        };
    }
}
