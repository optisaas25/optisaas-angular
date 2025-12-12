import { Injectable } from '@angular/core';

export interface AutoMeasures {
    hvid?: number;           // Horizontal Visible Iris Diameter (mm)
    pupilPhot?: number;      // Pupille photopique (mm)
    pupilMes?: number;       // Pupille mésopique (mm)
    but?: number;            // Break-Up Time (secondes)
    schirmer?: number;       // Test de Schirmer (mm)
    k1?: number;             // Kératométrie 1 (mm)
    k2?: number;             // Kératométrie 2 (mm)
}

export interface ClinicalParams {
    blinkFreq?: string;      // 'lent' | 'normal' | 'frequent'
    blinkAmp?: string;       // 'complet' | 'incomplet'
    tonus?: string;          // 'faible' | 'normal' | 'fort'
}

export interface LensSuggestion {
    type: string;            // 'Journalière', 'Mensuelle', 'Bimensuelle'
    diameter?: number;       // Diamètre suggéré (mm)
    baseCurve?: number;      // Rayon de courbure (mm)
    material?: string;       // Type de matériau
    notes: string[];         // Recommandations cliniques
    warnings: string[];      // Avertissements
    confidence: number;      // Niveau de confiance (0-100)
}

@Injectable({
    providedIn: 'root'
})
export class OptilensService {

    /**
     * Simule la capture de mesures automatiques depuis une tablette OptiSass
     * À remplacer par l'appel API réel
     */
    async fetchAutoMeasures(): Promise<AutoMeasures> {
        // Simulation d'un délai de capture
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    hvid: 12.2,
                    pupilPhot: 3.1,
                    pupilMes: 5.0,
                    but: 8,
                    schirmer: 6,
                    k1: 7.8,
                    k2: 8.0
                });
            }, 500);
        });
    }

    /**
     * Génère une suggestion de lentille basée sur les mesures et paramètres cliniques
     */
    generateSuggestion(measures: AutoMeasures, clinical: ClinicalParams): LensSuggestion {
        const suggestion: LensSuggestion = {
            type: 'Journalière',
            diameter: undefined,
            baseCurve: undefined,
            material: 'Silicone-hydrogel',
            notes: [],
            warnings: [],
            confidence: 100
        };

        // Calcul du diamètre (HVID + 2mm standard)
        if (measures.hvid) {
            suggestion.diameter = +(measures.hvid + 2).toFixed(1);
        }

        // Calcul de la base curve (moyenne K + 0.8mm)
        if (measures.k1 && measures.k2) {
            const avgK = (measures.k1 + measures.k2) / 2;
            suggestion.baseCurve = +(avgK + 0.8).toFixed(1);
        }

        // Analyse de la sécrétion lacrymale
        if (measures.schirmer !== undefined) {
            if (measures.schirmer < 5) {
                suggestion.material = 'Silicone-hydrogel haute perméabilité';
                suggestion.notes.push('⚠️ Sécrétion faible (<5mm): privilégier silicone-hydrogel pour meilleure oxygénation');
                suggestion.confidence -= 10;
            } else if (measures.schirmer < 10) {
                suggestion.notes.push('Sécrétion modérée: silicone-hydrogel recommandé');
            } else {
                suggestion.notes.push('✓ Sécrétion normale: tous matériaux compatibles');
            }
        }

        // Analyse du BUT (Break-Up Time)
        if (measures.but !== undefined) {
            if (measures.but < 10) {
                suggestion.warnings.push('⚠️ BUT < 10s: risque d\'instabilité du film lacrymal');
                suggestion.notes.push('Recommander larmes artificielles et suivi rapproché');
                suggestion.confidence -= 15;
            } else {
                suggestion.notes.push('✓ BUT normal: stabilité lacrymale satisfaisante');
            }
        }

        // Analyse de la pupille
        if (measures.pupilMes && measures.pupilMes > 6) {
            suggestion.warnings.push('Pupille mésopique large (>6mm): risque de halos nocturnes');
            suggestion.notes.push('Privilégier zone optique large');
        }

        // Analyse du clignement
        if (clinical.blinkFreq === 'lent' || clinical.blinkAmp === 'incomplet') {
            suggestion.warnings.push('Clignement insuffisant: risque de sécheresse');
            suggestion.notes.push('Éduquer patient sur clignement volontaire');
            suggestion.confidence -= 10;
        }

        // Analyse du tonus palpébral
        if (clinical.tonus === 'faible') {
            suggestion.notes.push('Tonus faible: surveiller centrage et mobilité');
            suggestion.confidence -= 5;
        } else if (clinical.tonus === 'fort') {
            suggestion.notes.push('Tonus fort: vérifier confort et absence d\'inconfort');
        }

        // Détermination du type de lentille
        if (measures.schirmer && measures.schirmer < 5) {
            suggestion.type = 'Journalière';
            suggestion.notes.push('Type journalière recommandé pour hygiène optimale');
        } else if (measures.but && measures.but < 10) {
            suggestion.type = 'Journalière';
            suggestion.notes.push('Type journalière recommandé pour minimiser dépôts');
        }

        // Ajuster la confiance finale
        suggestion.confidence = Math.max(0, Math.min(100, suggestion.confidence));

        return suggestion;
    }

    /**
     * Valide si les mesures sont suffisantes pour une suggestion fiable
     */
    validateMeasures(measures: AutoMeasures): { valid: boolean; missing: string[] } {
        const missing: string[] = [];

        if (!measures.hvid) missing.push('HVID');
        if (!measures.but) missing.push('BUT');
        if (!measures.schirmer) missing.push('Test de Schirmer');

        return {
            valid: missing.length === 0,
            missing
        };
    }
}
