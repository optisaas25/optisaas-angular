import { Injectable } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import { Pupils, Point } from '../models';

@Injectable({ providedIn: 'root' })
export class FaceDetectionService {
    private detector: any;

    async init() {
        if (this.detector) return;
        await tf.ready();
        this.detector = await faceLandmarksDetection.createDetector(
            faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
            { runtime: 'tfjs', refineLandmarks: true }
        );
    }

    /** Detect landmarks on an HTMLVideoElement or HTMLImageElement */
    async detect(el: HTMLVideoElement | HTMLImageElement): Promise<{ pupils?: Pupils; landmarks?: Point[]; }> {
        if (!this.detector) return {};
        try {
            const predictions = await this.detector.estimateFaces(el as any, { flipHorizontal: false });
            if (!predictions || !predictions.length) return {};

            const p = predictions[0];
            // keypoints exist; map to Point[]
            const pts: Point[] = (p.keypoints || []).map((k: any) => ({ x: k.x, y: k.y, z: k.z }));

            // Indices for eyes in MediaPipe Face Mesh
            // Left Eye
            const leftIdx = [33, 133, 160, 158, 159, 145];
            // Right Eye
            const rightIdx = [362, 263, 387, 385, 386, 374];

            const avg = (idxs: number[]) => {
                const arr = idxs.map(i => pts[i]).filter(Boolean);
                if (!arr.length) return undefined;
                const s = arr.reduce((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y, z: (acc.z ?? 0) + (v.z ?? 0) }), { x: 0, y: 0, z: 0 });
                return { x: s.x / arr.length, y: s.y / arr.length, z: s.z / arr.length };
            };

            const left = avg(leftIdx) || { x: p.box?.xMin ?? 0, y: p.box?.yMin ?? 0, z: 0 };
            const right = avg(rightIdx) || { x: p.box?.xMax ?? 0, y: p.box?.yMax ?? 0, z: 0 };

            return { pupils: { left: left as Point, right: right as Point }, landmarks: pts };
        } catch (err) {
            console.warn('Detection error:', err);
            return {};
        }
    }
}
