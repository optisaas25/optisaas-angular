import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaceDetectionService } from '../../services/face-detection.service';
import { Pupils, FrameGeometry } from '../../models';

@Component({
    selector: 'app-camera-capture',
    templateUrl: './camera-capture.component.html',
    styleUrls: ['./camera-capture.component.scss'],
    standalone: true,
    imports: [CommonModule]
})
export class CameraCaptureComponent implements OnInit {
    @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
    @Output() captured = new EventEmitter<{ dataUrl: string; pupils?: Pupils; frameGeom?: FrameGeometry }>();

    public stream?: MediaStream;
    public error?: string;

    constructor(private faceService: FaceDetectionService) { }

    async ngOnInit() {
        try {
            await this.faceService.init();
            this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            this.videoRef.nativeElement.srcObject = this.stream;
            this.videoRef.nativeElement.play();
        } catch (e: any) {
            this.error = e.message || 'Camera error';
            console.error(e);
        }
    }

    async captureOnce() {
        const vid = this.videoRef.nativeElement;
        const canvas = this.canvasRef.nativeElement;
        canvas.width = vid.videoWidth; canvas.height = vid.videoHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');

        // detect pupils on the drawn image
        const img = new Image(); img.src = dataUrl;
        await new Promise(r => img.onload = r);
        const det = await this.faceService.detect(img);
        // attempt frame edges detection (very simple): user can correct if fails
        const frameGeom: FrameGeometry = this.simpleFrameDetect(canvas) || { leftPx: 0, rightPx: canvas.width, widthPx: canvas.width };

        this.captured.emit({ dataUrl, pupils: det.pupils, frameGeom });
    }

    /**
     * Very simple frame detection: sample horizontal brightness line at nose level to find strong dark-light-dark transitions
     * Fallback to full width if not found.
     */
    simpleFrameDetect(canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext('2d')!;
        const w = canvas.width, h = canvas.height;
        const y = Math.round(h * 0.45);
        const data = ctx.getImageData(0, y, w, 1).data;
        // convert to grayscale
        const lum = new Array(w);
        for (let x = 0; x < w; x++) {
            const i = x * 4;
            lum[x] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        // find edges by gradient threshold
        let left = 0, right = w - 1;
        const thresh = 18; // tunable
        for (let x = 10; x < w - 10; x++) {
            const g = Math.abs(lum[x + 1] - lum[x - 1]);
            if (g > thresh) { left = x; break; }
        }
        for (let x = w - 10; x > 10; x--) {
            const g = Math.abs(lum[x + 1] - lum[x - 1]);
            if (g > thresh) { right = x; break; }
        }
        if (right - left < w * 0.3) return undefined; // failed detection
        return { leftPx: left, rightPx: right, widthPx: right - left, centerXpx: (left + right) / 2 };
    }
}
