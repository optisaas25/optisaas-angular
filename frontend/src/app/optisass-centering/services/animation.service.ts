import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AnimationService {

    /**
     * createAnimationFromCanvas: draws simple animated sequence using base canvas and records WebM
     * durationSec: seconds of animation
     */
    async createAnimationFromCanvas(baseCanvas: HTMLCanvasElement, durationSec = 2): Promise<Blob> {
        // create anim canvas same size
        const anim = document.createElement('canvas');
        anim.width = baseCanvas.width; anim.height = baseCanvas.height;
        const ctx = anim.getContext('2d')!;

        const fps = 24;
        const totalFrames = Math.max(1, Math.floor(durationSec * fps));
        const stream = (anim as any).captureStream(fps);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
        const chunks: Blob[] = [];
        recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        recorder.start();

        let frame = 0;
        return new Promise<Blob>((resolve, reject) => {
            const draw = () => {
                // small zoom and slow pan
                const t = frame / totalFrames;
                const zoom = 1 + 0.02 * Math.sin(t * Math.PI); // tiny zoom
                const panX = (anim.width * 0.01) * Math.sin(t * Math.PI * 2);
                const panY = (anim.height * 0.008) * Math.cos(t * Math.PI * 2);

                ctx.clearRect(0, 0, anim.width, anim.height);
                ctx.save();
                // center zoom
                ctx.translate(anim.width / 2 + panX, anim.height / 2 + panY);
                ctx.scale(zoom, zoom);
                ctx.drawImage(baseCanvas, -anim.width / 2, -anim.height / 2);
                ctx.restore();

                frame++;
                if (frame <= totalFrames) {
                    requestAnimationFrame(draw);
                } else {
                    recorder.stop();
                }
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                resolve(blob);
            };

            recorder.onerror = (e) => reject(e);

            draw();
        });
    }
}
