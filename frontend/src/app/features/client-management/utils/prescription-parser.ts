export interface ParsedPrescription {
    OD: { sph: number; cyl: number; axis?: number; add?: number };
    OG: { sph: number; cyl: number; axis?: number; add?: number };
}

export function parsePrescription(text: string): ParsedPrescription {
    const regexOD = /OD[:\s]*([+-]?\d+\.?\d*)\s*([+-]?\d+\.?\d*)?\s*(?:@(\d+))?\s*(?:ADD\s*([+-]?\d+\.?\d*))?/i;
    const regexOG = /OG[:\s]*([+-]?\d+\.?\d*)\s*([+-]?\d+\.?\d*)?\s*(?:@(\d+))?\s*(?:ADD\s*([+-]?\d+\.?\d*))?/i;

    const odMatch = text.match(regexOD);
    const ogMatch = text.match(regexOG);

    return {
        OD: {
            sph: odMatch ? parseFloat(odMatch[1]) : 0,
            cyl: odMatch && odMatch[2] ? parseFloat(odMatch[2]) : 0,
            axis: odMatch && odMatch[3] ? parseInt(odMatch[3]) : undefined,
            add: odMatch && odMatch[4] ? parseFloat(odMatch[4]) : undefined,
        },
        OG: {
            sph: ogMatch ? parseFloat(ogMatch[1]) : 0,
            cyl: ogMatch && ogMatch[2] ? parseFloat(ogMatch[2]) : 0,
            axis: ogMatch && ogMatch[3] ? parseInt(ogMatch[3]) : undefined,
            add: ogMatch && ogMatch[4] ? parseFloat(ogMatch[4]) : undefined,
        },
    };
}
