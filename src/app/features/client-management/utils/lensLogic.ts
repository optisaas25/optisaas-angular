// lensLogic.ts
import { lensDatabase, LensOption, LensTreatment } from "./lensDatabase";

export interface Correction { sph: number; cyl: number; }
export interface FrameData {
    ed: number;
    shape: "round" | "rectangular" | "cat-eye";
    mount: "full-rim" | "semi-rim" | "rimless";
}

export interface LensSuggestion {
    option: LensOption;
    rationale: string;
    estimatedThickness: number;
    selectedTreatments: LensTreatment[];
    estimatedPriceMAD: number;
}

export function getLensSuggestion(
    corr: Correction,
    frame: FrameData,
    selectedTreatments: LensTreatment[] = []
): LensSuggestion {
    const absSph = Math.abs(corr.sph);
    const absCyl = Math.abs(corr.cyl);
    const power = absSph + absCyl;

    // Sélection matière selon puissance
    let option: LensOption = lensDatabase[0];
    if (power <= 2) option = lensDatabase.find(l => l.material === "CR-39")!;
    else if (power <= 4) option = lensDatabase.find(l => l.material === "1.60")!;
    else if (power <= 6) option = lensDatabase.find(l => l.material === "1.67")!;
    else option = lensDatabase.find(l => l.material === "1.74")!;

    // Ajustement monture
    if (frame.mount === "semi-rim" && option.index < 1.6)
        option = lensDatabase.find(l => l.material === "Polycarbonate")!;
    if (frame.mount === "rimless" && option.index < 1.67)
        option = lensDatabase.find(l => l.material === "1.67")!;

    // Estimation épaisseur
    const baseThickness = 1.2;
    const edgeFactor = power * (option.index < 1.6 ? 0.8 : option.index < 1.67 ? 0.6 : 0.45);
    let frameFactor = 1;
    if (frame.ed > 55) frameFactor += 0.2;
    else if (frame.ed >= 50) frameFactor += 0.1;
    if (frame.shape === "rectangular") frameFactor += 0.1;
    if (frame.shape === "cat-eye") frameFactor += 0.15;
    if (frame.mount === "semi-rim") frameFactor -= 0.1;
    if (frame.mount === "rimless") frameFactor -= 0.2;

    const estimatedThickness = parseFloat((baseThickness + edgeFactor * frameFactor).toFixed(2));

    // Calcul prix final selon traitements sélectionnés
    let treatmentExtra = 0;
    selectedTreatments.forEach(t => {
        if (t === "AR") treatmentExtra += 150;
        if (t === "BlueCut") treatmentExtra += 150;
        if (t === "Photochromic") treatmentExtra += 300;
        if (t === "Polarized") treatmentExtra += 200;
    });
    const estimatedPriceMAD = Math.min(option.priceRangeMAD[1], option.priceRangeMAD[0] + treatmentExtra);

    const rationale = `
Correction: sph=${corr.sph}, cyl=${corr.cyl} (puissance=${power})
Monture: ED=${frame.ed}, forme=${frame.shape}, cerclage=${frame.mount}
Matériau recommandé: ${option.material}, indice=${option.index}
Épaisseur estimée: ${estimatedThickness} mm
Traitements sélectionnés: ${selectedTreatments.join(", ") || "None"}
Prix estimé: ${estimatedPriceMAD} MAD
  `.trim();

    return { option, rationale, estimatedThickness, selectedTreatments, estimatedPriceMAD };
}

/**
 * Helper function to calculate lens price based on material, index, and treatments
 * (for backward compatibility with existing UI)
 */
export function calculateLensPrice(
    material: string,
    index: string,
    treatments: string[]
): number {
    // Parse index from string (e.g., "1.50 (Standard)" -> 1.50)
    const indexNum = parseFloat(index);

    // Find matching lens option
    const lensOption = lensDatabase.find(lens => {
        if (Math.abs(lens.index - indexNum) > 0.01) return false;

        const materialLower = material.toLowerCase();
        const lensMatLower = lens.material.toLowerCase();

        if (materialLower.includes('cr-39') || materialLower.includes('organique')) {
            return lensMatLower === 'cr-39';
        }
        if (materialLower.includes('poly')) {
            return lensMatLower === 'polycarbonate';
        }
        if (materialLower.includes('trivex')) {
            return lensMatLower === 'trivex';
        }
        return lensMatLower === indexNum.toFixed(2);
    });

    if (!lensOption) {
        return 200; // Fallback
    }

    // Base price (average of range)
    const basePrice = (lensOption.priceRangeMAD[0] + lensOption.priceRangeMAD[1]) / 2;

    // Add treatment costs
    let treatmentCost = 0;
    treatments.forEach(treatment => {
        const treatmentLower = treatment.toLowerCase();
        if (treatmentLower.includes('anti-reflet') || treatmentLower.includes('hmc') || treatmentLower.includes('shmc')) {
            treatmentCost += 100;
        } else if (treatmentLower.includes('blue') || treatmentLower.includes('bleu')) {
            treatmentCost += 150;
        } else if (treatmentLower.includes('photo') || treatmentLower.includes('transition')) {
            treatmentCost += 400;
        } else if (treatmentLower.includes('polar')) {
            treatmentCost += 350;
        } else if (treatmentLower.includes('teint') || treatmentLower.includes('solaire')) {
            treatmentCost += 100;
        } else if (treatmentLower.includes('durci') || treatmentLower.includes('rayure')) {
            treatmentCost += 50;
        } else if (treatmentLower.includes('miroité')) {
            treatmentCost += 200;
        } else if (treatmentLower.includes('hydro')) {
            treatmentCost += 80;
        }
    });

    return Math.round(basePrice + treatmentCost);
}
