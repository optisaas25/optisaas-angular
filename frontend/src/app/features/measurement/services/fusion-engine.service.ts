import { Injectable } from '@angular/core';
import { EngineResult, Pupils, Point } from '../models/measurement.model';

@Injectable({
    providedIn: 'root'
})
export class FusionEngineService {
    constructor() { }

    /**
     * Fuse results from MediaPipe and TensorFlow.js engines
     * Strategy: weighted average based on confidence scores
     */
    fuseResults(mp?: EngineResult, tf?: EngineResult): EngineResult {
        // If both are missing or have zero confidence
        if ((!mp || mp.confidence === 0) && (!tf || tf.confidence === 0)) {
            return { confidence: 0, timestamp: Date.now() };
        }

        // If only one engine has results
        if (mp && (!tf || tf.confidence! < 0.2)) {
            return mp;
        }
        if (tf && (!mp || mp.confidence! < 0.2)) {
            return tf;
        }

        // Both engines have results - fuse them
        const weightMp = mp?.confidence ?? 0.5;
        const weightTf = tf?.confidence ?? 0.5;
        const sum = weightMp + weightTf;
        const wMp = weightMp / sum;
        const wTf = weightTf / sum;

        const pupils: Pupils = {
            left: this.avgPoints(mp!.pupils!.left, tf!.pupils!.left, wMp),
            right: this.avgPoints(mp!.pupils!.right, tf!.pupils!.right, wMp)
        };

        const confidence = Math.max(mp?.confidence ?? 0, tf?.confidence ?? 0);

        return {
            pupils,
            confidence,
            timestamp: Date.now()
        };
    }

    private avgPoints(a: Point, b: Point, wa: number): Point {
        return {
            x: a.x * wa + b.x * (1 - wa),
            y: a.y * wa + b.y * (1 - wa),
            z: ((a.z ?? 0) * wa + (b.z ?? 0) * (1 - wa)),
            confidence: ((a.confidence ?? 0) * wa + (b.confidence ?? 0) * (1 - wa))
        };
    }
}
