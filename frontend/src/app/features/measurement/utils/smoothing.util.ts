// Smoothing utility for real-time measurements
// Uses exponential smoothing to reduce noise

export class ExpSmoother {
    private alpha: number;
    private state: any;

    constructor(alpha: number = 0.4) {
        this.alpha = alpha;
        this.state = null;
    }

    next(val: any): any {
        if (!this.state) {
            this.state = JSON.parse(JSON.stringify(val));
            return this.state;
        }

        // Assume val is object with numeric fields x, y, z
        this.state.x = this.state.x * (1 - this.alpha) + val.x * this.alpha;
        this.state.y = this.state.y * (1 - this.alpha) + val.y * this.alpha;

        if (val.z !== undefined) {
            this.state.z = (this.state.z ?? 0) * (1 - this.alpha) + (val.z ?? 0) * this.alpha;
        }

        if (val.confidence !== undefined) {
            this.state.confidence = (this.state.confidence ?? 0) * (1 - this.alpha) + (val.confidence ?? 0) * this.alpha;
        }

        return this.state;
    }

    reset(): void {
        this.state = null;
    }
}
