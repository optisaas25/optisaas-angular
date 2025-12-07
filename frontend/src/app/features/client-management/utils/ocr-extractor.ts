import Tesseract from 'tesseract.js';

export async function extractTextFromImage(file: File | string): Promise<string> {
    const result = await Tesseract.recognize(file, 'fra', { logger: m => console.log(m) });
    return result.data.text;
}

/**
 * Parse prescription text to extract values
 * Reworked to share logic with manual paste if needed, but keeping this simple for now.
 */
export function parsePrescriptionText(text: string): {
    od?: { sphere?: string; cylinder?: string; axis?: string; addition?: string };
    og?: { sphere?: string; cylinder?: string; axis?: string; addition?: string };
    ep?: string;
} {
    const result: any = { od: {}, og: {} };

    // Normalize text
    const normalized = text.toUpperCase().replace(/\s+/g, ' ');

    // Look for OD (Oeil Droit / Right Eye) values
    // Match patterns like "OD: +2.00 -0.50 90" or "OD +2.00"
    const odMatch = normalized.match(/OD[:\s]+([+-]?\d+[.,]?\d*)\s*([+-]?\d+[.,]?\d*)?\s*(\d+)?/);
    if (odMatch) {
        result.od.sphere = odMatch[1]?.replace(',', '.');
        if (odMatch[2]) result.od.cylinder = odMatch[2].replace(',', '.');
        if (odMatch[3]) result.od.axis = odMatch[3];
    }

    // Look for OG (Oeil Gauche / Left Eye) values
    const ogMatch = normalized.match(/OG[:\s]+([+-]?\d+[.,]?\d*)\s*([+-]?\d+[.,]?\d*)?\s*(\d+)?/);
    if (ogMatch) {
        result.og.sphere = ogMatch[1]?.replace(',', '.');
        if (ogMatch[2]) result.og.cylinder = ogMatch[2].replace(',', '.');
        if (ogMatch[3]) result.og.axis = ogMatch[3];
    }

    // Look for Addition (often common to both)
    const addMatch = normalized.match(/ADD[:\s]+([+-]?\d+[.,]?\d*)/);
    if (addMatch) {
        const addition = addMatch[1].replace(',', '.');
        result.od.addition = addition;
        result.og.addition = addition;
    }

    // Look for EP (Ecart Pupillaire)
    const epMatch = normalized.match(/EP[:\s]+(\d+[.,]?\d*)/);
    if (epMatch) {
        result.ep = epMatch[1].replace(',', '.');
    }

    return result;
}
