import { Injectable } from '@angular/core';
import { CalibrationData } from '../models/measurement.model';

@Injectable({
    providedIn: 'root'
})
export class CalibrationService {
    private readonly STORAGE_KEY = 'optisass_calibration';
    private readonly CARD_WIDTH_MM = 85.6; // Standard credit card width

    constructor() { }

    /**
     * Calculate pixels per millimeter from card width in pixels
     */
    pixelsPerMmFromCardWidth(cardPxWidth: number): number {
        if (!cardPxWidth || cardPxWidth <= 0) {
            throw new Error('Invalid card pixel width');
        }
        return cardPxWidth / this.CARD_WIDTH_MM;
    }

    /**
     * Convert pixels to millimeters
     */
    pxToMm(px: number, pixelsPerMm: number): number {
        if (!pixelsPerMm || pixelsPerMm <= 0) {
            throw new Error('Invalid pixelsPerMm');
        }
        return px / pixelsPerMm;
    }

    /**
     * Convert millimeters to pixels
     */
    mmToPx(mm: number, pixelsPerMm: number): number {
        if (!pixelsPerMm || pixelsPerMm <= 0) {
            throw new Error('Invalid pixelsPerMm');
        }
        return mm * pixelsPerMm;
    }

    /**
     * Save calibration data to localStorage
     */
    saveCalibration(data: CalibrationData): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save calibration:', error);
        }
    }

    /**
     * Load calibration data from localStorage
     */
    loadCalibration(): CalibrationData | null {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load calibration:', error);
        }
        return null;
    }

    /**
     * Clear calibration data
     */
    clearCalibration(): void {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear calibration:', error);
        }
    }

    /**
     * Check if calibration exists and is recent (within 30 days)
     */
    isCalibrationValid(): boolean {
        const calibration = this.loadCalibration();
        if (!calibration) return false;

        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        return calibration.timestamp > thirtyDaysAgo;
    }
}
