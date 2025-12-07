// Measurement models and types for optical measurement system

export interface Point {
    x: number;
    y: number;
    z?: number;
    confidence?: number;
}

export interface Pupils {
    left: Point;
    right: Point;
}

export interface EngineResult {
    pupils?: Pupils;
    landmarks?: Point[]; // pixel coordinates
    confidence?: number; // aggregated confidence 0..1
    angles?: {
        pantoscopic?: number;
        wrap?: number;
    };
    timestamp?: number;
}

export interface Measurement {
    pdMm: number;           // Total PD
    pdLeftMm: number;       // Left PD (from center)
    pdRightMm: number;      // Right PD (from center)
    heightLeftMm?: number;  // Left eye height from bottom
    heightRightMm?: number; // Right eye height from bottom
    pupils: Pupils;
    timestamp: number;
}

export interface CalibrationData {
    pixelsPerMm: number;
    deviceId: string;
    timestamp: number;
    cardWidthPx: number;
}
