// lensDatabase.ts
export type LensMaterial = "CR-39" | "Polycarbonate" | "Trivex" | "1.56" | "1.60" | "1.67" | "1.74";
export type LensTreatment = "None" | "AR" | "BlueCut" | "Photochromic" | "Polarized";

export interface LensOption {
    material: LensMaterial;
    index: number;
    treatments: LensTreatment[];
    priceRangeMAD: [number, number]; // min-max prix client Maroc
}

export const lensDatabase: LensOption[] = [
    { material: "CR-39", index: 1.50, treatments: ["None"], priceRangeMAD: [180, 300] },
    { material: "Polycarbonate", index: 1.59, treatments: ["None", "AR", "BlueCut"], priceRangeMAD: [300, 500] },
    { material: "Trivex", index: 1.53, treatments: ["None", "AR", "BlueCut"], priceRangeMAD: [350, 600] },
    { material: "1.56", index: 1.56, treatments: ["None", "AR", "BlueCut", "Photochromic"], priceRangeMAD: [200, 500] },
    { material: "1.60", index: 1.60, treatments: ["None", "AR", "BlueCut", "Photochromic"], priceRangeMAD: [300, 550] },
    { material: "1.67", index: 1.67, treatments: ["None", "AR", "BlueCut", "Photochromic"], priceRangeMAD: [450, 800] },
    { material: "1.74", index: 1.74, treatments: ["None", "AR", "Photochromic"], priceRangeMAD: [700, 1200] },
];

/**
 * Get list of unique materials from database for UI dropdowns
 */
export function getLensMaterials(): string[] {
    const materials = lensDatabase.map(lens => {
        // Map database materials to UI-friendly names
        switch (lens.material) {
            case 'CR-39':
                return 'Organique (CR-39)';
            case 'Polycarbonate':
                return 'Polycarbonate';
            case 'Trivex':
                return 'Trivex';
            case '1.56':
                return 'Organique 1.56';
            case '1.60':
                return 'Organique 1.60';
            case '1.67':
                return 'Organique 1.67';
            case '1.74':
                return 'Organique 1.74';
            default:
                return lens.material;
        }
    });

    // Remove duplicates and sort
    return Array.from(new Set(materials)).sort();
}

/**
 * Get list of unique indices from database for UI dropdowns
 */
export function getLensIndices(): string[] {
    const indices = lensDatabase.map(lens => {
        const indexStr = lens.index.toFixed(2);
        // Add descriptive labels for common indices
        if (lens.index === 1.50) return '1.50 (Standard)';
        if (lens.index === 1.53) return '1.53 (Trivex)';
        if (lens.index === 1.59) return '1.59 (Polycarbonate)';
        return indexStr;
    });

    // Remove duplicates and sort by numeric value
    return Array.from(new Set(indices)).sort((a, b) => {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        return numA - numB;
    });
}
