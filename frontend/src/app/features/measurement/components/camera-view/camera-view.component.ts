import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, Output, EventEmitter, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaPipeEngineService } from '../../services/mediapipe-engine.service';
import { CalibrationService } from '../../services/calibration.service';
import { ExpSmoother } from '../../utils/smoothing.util';
import { Measurement, Point } from '../../models/measurement.model';

@Component({
    selector: 'app-camera-view',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './camera-view.component.html',
    styleUrls: ['./camera-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CameraViewComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
    @ViewChild('overlayCanvas') overlayCanvas!: ElementRef<HTMLCanvasElement>;

    @Output() measurementChange = new EventEmitter<Measurement>();

    frameWidthMm: number = 140; // Default frame width
    pixelsPerMm: number | null = null;
    isCalibrated = false;
    isReady = false;
    latestMeasurement: Measurement | null = null;

    // Face landmarks for calibration
    faceWidth: number = 0; // Face width in pixels
    currentLandmarks: Point[] = [];

    private smootherLeft = new ExpSmoother(0.35);
    private smootherRight = new ExpSmoother(0.35);

    constructor(
        private mpEngine: MediaPipeEngineService,
        private calibrationService: CalibrationService,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit(): Promise<void> {
        // Load saved calibration
        const savedCalibration = this.calibrationService.loadCalibration();
        if (savedCalibration && this.calibrationService.isCalibrationValid()) {
            this.pixelsPerMm = savedCalibration.pixelsPerMm;
            this.isCalibrated = true;
        }

        // Initialize MediaPipe engine
        try {
            await this.mpEngine.init();
            this.isReady = true;
            this.cdr.markForCheck();
        } catch (error) {
            console.error('Failed to initialize MediaPipe:', error);
        }
    }

    async ngAfterViewInit(): Promise<void> {
        console.log('CameraView ngAfterViewInit called');

        // Wait for MediaPipe to be ready if not already
        if (!this.isReady) {
            console.log('Waiting for MediaPipe to initialize...');
            for (let i = 0; i < 50; i++) {
                if (this.isReady) break;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        if (this.isReady && this.videoElement) {
            console.log('Starting camera...');
            setTimeout(() => {
                this.startCamera();
            }, 500);
        } else {
            console.error('MediaPipe not ready or video element not found');
        }
    }

    ngOnDestroy(): void {
        this.mpEngine.stop();
    }

    async startCamera(): Promise<void> {
        console.log('startCamera called');

        if (!this.videoElement) {
            console.error('Video element not found');
            return;
        }

        try {
            // Request camera permissions first
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 1280, height: 720 },
                audio: false
            });

            console.log('Camera stream obtained:', stream);

            // Set video source
            this.videoElement.nativeElement.srcObject = stream;

            // Start MediaPipe detection
            this.mpEngine.start(this.videoElement.nativeElement, (result) => {
                if (result.pupils) {
                    // Apply smoothing
                    const smoothedLeft = this.smootherLeft.next(result.pupils.left);
                    const smoothedRight = this.smootherRight.next(result.pupils.right);

                    result.pupils.left = smoothedLeft;
                    result.pupils.right = smoothedRight;

                    // Store landmarks for calibration
                    if (result.landmarks) {
                        this.currentLandmarks = result.landmarks;
                        this.calculateFaceWidth();
                    }

                    // Draw overlay
                    this.drawOverlay(result.pupils);

                    // Calculate measurement if calibrated
                    if (this.pixelsPerMm) {
                        const measurement = this.calculateMeasurement(result.pupils);
                        this.latestMeasurement = measurement;
                        this.measurementChange.emit(measurement);
                        this.cdr.markForCheck();
                    }
                }
            });

            console.log('MediaPipe engine started');
        } catch (error) {
            console.error('Failed to start camera:', error);
            alert('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
        }
    }

    /**
     * Calculate face width using landmarks (temple to temple)
     */
    private calculateFaceWidth(): void {
        if (!this.currentLandmarks || this.currentLandmarks.length < 454) return;

        // Use landmarks 234 (left temple) and 454 (right temple)
        const leftTemple = this.currentLandmarks[234];
        const rightTemple = this.currentLandmarks[454];

        if (leftTemple && rightTemple) {
            this.faceWidth = Math.hypot(
                rightTemple.x - leftTemple.x,
                rightTemple.y - leftTemple.y
            );
        }
    }

    /**
     * Calibrate using frame width
     */
    calibrateWithFrame(): void {
        if (!this.frameWidthMm || this.frameWidthMm <= 0) {
            alert('Veuillez entrer une largeur de monture valide');
            return;
        }

        if (this.faceWidth <= 0) {
            alert('Aucun visage détecté. Assurez-vous d\'être bien visible dans la caméra.');
            return;
        }

        try {
            // Calculate pixels per mm based on face width
            // Assuming frame width ≈ face width when wearing glasses
            this.pixelsPerMm = this.faceWidth / this.frameWidthMm;
            this.isCalibrated = true;

            // Save calibration
            this.calibrationService.saveCalibration({
                pixelsPerMm: this.pixelsPerMm,
                cardWidthPx: this.faceWidth, // Store face width as reference
                deviceId: navigator.userAgent,
                timestamp: Date.now()
            });

            console.log(`Calibrated: ${this.pixelsPerMm.toFixed(2)} px/mm`);
            this.cdr.markForCheck();
        } catch (error) {
            console.error('Calibration error:', error);
            alert('Erreur de calibration');
        }
    }

    resetCalibration(): void {
        this.isCalibrated = false;
        this.pixelsPerMm = null;
        localStorage.removeItem('calibration_data');
        this.cdr.markForCheck();
    }

    private calculateMeasurement(pupils: { left: Point; right: Point }): Measurement {
        const pdPx = Math.hypot(
            pupils.right.x - pupils.left.x,
            pupils.right.y - pupils.left.y
        );
        const pdMm = this.calibrationService.pxToMm(pdPx, this.pixelsPerMm!);

        const midX = (pupils.left.x + pupils.right.x) / 2;
        const midY = (pupils.left.y + pupils.right.y) / 2;

        const pdLeftPx = Math.hypot(pupils.left.x - midX, pupils.left.y - midY);
        pdMm,
            pdLeftMm,
            pdRightMm,
            heightLeftMm,
            heightRightMm,
            pupils,
            isCalibrated = false;
        isReady = false;
        latestMeasurement: Measurement | null = null;

        // Face landmarks for calibration
        faceWidth: number = 0; // Face width in pixels
        currentLandmarks: Point[] = [];

    private smootherLeft = new ExpSmoother(0.35);
    private smootherRight = new ExpSmoother(0.35);

    constructor(
        private mpEngine: MediaPipeEngineService,
        private calibrationService: CalibrationService,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit(): Promise<void> {
        // Load saved calibration
        const savedCalibration = this.calibrationService.loadCalibration();
        if (savedCalibration && this.calibrationService.isCalibrationValid()) {
            this.pixelsPerMm = savedCalibration.pixelsPerMm;
            this.isCalibrated = true;
        }

        // Initialize MediaPipe engine
        try {
            await this.mpEngine.init();
            this.isReady = true;
            this.cdr.markForCheck();
        } catch (error) {
            console.error('Failed to initialize MediaPipe:', error);
        }
    }

    async ngAfterViewInit(): Promise<void> {
        console.log('CameraView ngAfterViewInit called');

        // Wait for MediaPipe to be ready if not already
        if (!this.isReady) {
            console.log('Waiting for MediaPipe to initialize...');
            for (let i = 0; i < 50; i++) {
                if (this.isReady) break;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        if (this.isReady && this.videoElement) {
            console.log('Starting camera...');
            setTimeout(() => {
                this.startCamera();
            }, 500);
        } else {
            console.error('MediaPipe not ready or video element not found');
        }
    }

    ngOnDestroy(): void {
        this.mpEngine.stop();
    }

    async startCamera(): Promise<void> {
        console.log('startCamera called');

        if (!this.videoElement) {
            console.error('Video element not found');
            return;
        }

        try {
            // Request camera permissions first
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 1280, height: 720 },
                audio: false
            });

            console.log('Camera stream obtained:', stream);

            // Set video source
            this.videoElement.nativeElement.srcObject = stream;

            // Start MediaPipe detection
            this.mpEngine.start(this.videoElement.nativeElement, (result) => {
                if (result.pupils) {
                    // Apply smoothing
                    const smoothedLeft = this.smootherLeft.next(result.pupils.left);
                    const smoothedRight = this.smootherRight.next(result.pupils.right);

                    result.pupils.left = smoothedLeft;
                    result.pupils.right = smoothedRight;

                    // Store landmarks for calibration
                    if (result.landmarks) {
                        this.currentLandmarks = result.landmarks;
                        this.calculateFaceWidth();
                    }

                    // Draw overlay
                    this.drawOverlay(result.pupils);

                    // Calculate measurement if calibrated
                    if (this.pixelsPerMm) {
                        const measurement = this.calculateMeasurement(result.pupils);
                        this.latestMeasurement = measurement;
                        this.measurementChange.emit(measurement);
                        this.cdr.markForCheck();
                    }
                }
            });

            console.log('MediaPipe engine started');
        } catch (error) {
            console.error('Failed to start camera:', error);
            alert('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
        }
    }

    /**
     * Calculate face width using landmarks (temple to temple)
     */
    private calculateFaceWidth(): void {
        if (!this.currentLandmarks || this.currentLandmarks.length < 454) return;

        // Use landmarks 234 (left temple) and 454 (right temple)
        const leftTemple = this.currentLandmarks[234];
        const rightTemple = this.currentLandmarks[454];

        if (leftTemple && rightTemple) {
            this.faceWidth = Math.hypot(
                rightTemple.x - leftTemple.x,
                rightTemple.y - leftTemple.y
            );
        }
    }

    /**
     * Calibrate using frame width
     */
    calibrateWithFrame(): void {
        if (!this.frameWidthMm || this.frameWidthMm <= 0) {
            alert('Veuillez entrer une largeur de monture valide');
            return;
        }

        if (this.faceWidth <= 0) {
            alert('Aucun visage détecté. Assurez-vous d\'être bien visible dans la caméra.');
            return;
        }

        try {
            // Calculate pixels per mm based on face width
            // Assuming frame width ≈ face width when wearing glasses
            this.pixelsPerMm = this.faceWidth / this.frameWidthMm;
            this.isCalibrated = true;

            // Save calibration
            this.calibrationService.saveCalibration({
                pixelsPerMm: this.pixelsPerMm,
                cardWidthPx: this.faceWidth, // Store face width as reference
                deviceId: navigator.userAgent,
                timestamp: Date.now()
            });

            console.log(`Calibrated: ${this.pixelsPerMm.toFixed(2)} px/mm`);
            this.cdr.markForCheck();
        } catch (error) {
            console.error('Calibration error:', error);
            alert('Erreur de calibration');
        }
    }

    resetCalibration(): void {
        this.isCalibrated = false;
        this.pixelsPerMm = null;
        localStorage.removeItem('calibration_data');
        this.cdr.markForCheck();
    }

    private calculateMeasurement(pupils: { left: Point; right: Point }): Measurement {
        const pdPx = Math.hypot(
            pupils.right.x - pupils.left.x,
            pupils.right.y - pupils.left.y
        );
        const pdMm = this.calibrationService.pxToMm(pdPx, this.pixelsPerMm!);

        const midX = (pupils.left.x + pupils.right.x) / 2;
        const midY = (pupils.left.y + pupils.right.y) / 2;

        const pdLeftPx = Math.hypot(pupils.left.x - midX, pupils.left.y - midY);
        pdMm,
            pdLeftMm,
            pdRightMm,
            heightLeftMm,
            heightRightMm,
            pupils,
            timestamp: Date.now()
    };
}

    private drawOverlay(pupils: { left: Point; right: Point }): void {
    if(!this.overlayCanvas || !this.videoElement) return;

    const canvas = this.overlayCanvas.nativeElement;
    const video = this.videoElement.nativeElement;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;

    // Ensure canvas matches video dimensions
    if(canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
}

ctx.clearRect(0, 0, canvas.width, canvas.height);

// Draw eyebrow landmarks (frame top reference) if available
if (this.currentLandmarks && this.currentLandmarks.length > 285) {
    const leftEyebrowTop = this.currentLandmarks[285];
    const rightEyebrowTop = this.currentLandmarks[55];

    if (leftEyebrowTop && rightEyebrowTop) {
        // Draw horizontal line at eyebrow level (frame top)
        const avgEyebrowY = (leftEyebrowTop.y + rightEyebrowTop.y) / 2;
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, avgEyebrowY);
        ctx.lineTo(canvas.width, avgEyebrowY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw eyebrow points
        ctx.fillStyle = 'rgba(255, 165, 0, 0.9)';
        ctx.beginPath();
        ctx.arc(leftEyebrowTop.x, leftEyebrowTop.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEyebrowTop.x, rightEyebrowTop.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = '#FFA500';
        ctx.font = 'bold 14px Inter, Arial';
        ctx.fillText('Haut de monture (sourcils)', 10, avgEyebrowY - 10);
    }
}

// Draw pupils - VERY VISIBLE with white outline
ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
ctx.lineWidth = 3;
ctx.fillStyle = 'rgba(0, 255, 0, 1)';

// Left pupil
ctx.beginPath();
ctx.arc(pupils.left.x, pupils.left.y, 10, 0, Math.PI * 2);
ctx.fill();
ctx.stroke();

// Right pupil
ctx.beginPath();
ctx.arc(pupils.right.x, pupils.right.y, 10, 0, Math.PI * 2);
ctx.fill();
ctx.stroke();

// Draw line between pupils
ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(pupils.left.x, pupils.left.y);
ctx.lineTo(pupils.right.x, pupils.right.y);
ctx.stroke();

// Draw vertical lines from pupils to eyebrows (height visualization)
if (this.currentLandmarks && this.currentLandmarks.length > 285) {
    const leftEyebrowTop = this.currentLandmarks[285];
    const rightEyebrowTop = this.currentLandmarks[55];

    if (leftEyebrowTop && rightEyebrowTop) {
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);

        // Left height line
        ctx.beginPath();
        ctx.moveTo(pupils.left.x, pupils.left.y);
        ctx.lineTo(pupils.left.x, leftEyebrowTop.y);
        ctx.stroke();

        // Right height line
        ctx.beginPath();
        ctx.moveTo(pupils.right.x, pupils.right.y);
        ctx.lineTo(pupils.right.x, rightEyebrowTop.y);
        ctx.stroke();

        ctx.setLineDash([]);
    }
}

// Draw measurement text
if (this.latestMeasurement) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Inter, Arial';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;

    const texts = [
        `PD: ${this.latestMeasurement.pdMm.toFixed(1)} mm`,
        `PD L: ${this.latestMeasurement.pdLeftMm.toFixed(1)} mm`,
        `PD R: ${this.latestMeasurement.pdRightMm.toFixed(1)} mm`
    ];

    if (this.latestMeasurement.heightLeftMm) {
        texts.push(`H L: ${this.latestMeasurement.heightLeftMm.toFixed(1)} mm`);
    }
    if (this.latestMeasurement.heightRightMm) {
        texts.push(`H R: ${this.latestMeasurement.heightRightMm.toFixed(1)} mm`);
    }

    texts.forEach((text, i) => {
        const y = 30 + (i * 25);
        ctx.strokeText(text, 10, y);
        ctx.fillText(text, 10, y);
    });
}
    }
}
