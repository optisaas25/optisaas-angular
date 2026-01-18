import { Component, OnInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../stock-management/services/product.service';
import { Product, ProductType, Frame } from '../../../../shared/interfaces/product.interface';

// TensorFlow & MediaPipe Imports
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-webgl';

interface FrameOverlay {
  frame: Frame;
  x: number;
  y: number;
  scale: number;
  scaleX?: number;
  scaleY?: number;
  rotation: number;
}

@Component({
  selector: 'optisass-essayage-virtuel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 bg-white rounded-lg shadow-md max-w-6xl mx-auto">
      <h2 class="text-2xl font-bold mb-6">Essayage Virtuel (Live AR + IA Perspective)</h2>
      <!-- ... -->
      
      <!-- Debug Logs (Hidden) -->
      <!-- <div class="bg-gray-900 text-green-400 font-mono text-xs p-2 rounded mb-4 max-h-32 overflow-y-auto" *ngIf="logs.length > 0">
        <div *ngFor="let log of logs">{{ log }}</div>
      </div> -->
      
      <!-- Camera / Photo Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left: Camera/Photo Display -->
        <div class="space-y-4">
          <div class="relative bg-black rounded-lg overflow-hidden" style="height: 480px;">
            <!-- Video Stream (Hidden, drawn to Canvas) -->
            <video #videoElement 
                   class="w-full h-full object-cover hidden"
                   autoplay playsinline>
            </video>
            
            <!-- Captured Photo with Overlay -->
            <canvas #overlayCanvas 
                    class="w-full h-full object-contain absolute inset-0 pointer-events-auto"
                    [class.hidden]="!cameraActive && !capturedPhoto"
                    class="w-full h-full object-contain"
                    (mousedown)="startDrag($event)"
                    (mousemove)="onDrag($event)"
                    (mouseup)="endDrag()"
                    (mouseleave)="endDrag()">
            </canvas>
            
             <!-- Loading Indicator for AI -->
            <div *ngIf="detectingFace && !animationFrameId" class="absolute inset-0 bg-black/50 flex items-center justify-center z-10 transition-opacity">
               <div class="text-center text-white">
                 <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-2"></div>
                 <p>Initialisation de l'IA...</p>
               </div>
            </div>

            <!-- Placeholder -->
            <div *ngIf="!cameraActive && !capturedPhoto" 
                 class="absolute inset-0 flex items-center justify-center text-white">
              <div class="text-center">
                <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <p class="text-lg opacity-75">Cliquez sur "Démarrer Caméra"</p>
              </div>
            </div>
          </div>
          
          <!-- Camera Controls -->
          <div class="flex gap-2">
            <button *ngIf="!cameraActive && !capturedPhoto"
                    (click)="startCamera()"
                    class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
              📷 Démarrer Caméra
            </button>
            
            <button *ngIf="cameraActive && !capturedPhoto"
                    (click)="capturePhoto()"
                    class="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
              📸 Capturer Photo
            </button>
            
            <button *ngIf="capturedPhoto"
                    (click)="retakePhoto()"
                    class="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">
              🔄 Reprendre Photo
            </button>
            
            <button *ngIf="capturedPhoto && selectedFrame"
                    (click)="saveResult()"
                    class="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
              💾 Sauvegarder
            </button>
          </div>
          
          <!-- Overlay Controls -->
          <div *ngIf="capturedPhoto && selectedFrame" class="bg-gray-50 p-4 rounded-lg space-y-3">
            <div class="flex justify-between items-center">
                <h3 class="font-semibold text-sm">Ajuster la Monture</h3>
                <button (click)="runDetection()" class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200">
                    🪄 Auto-Ajustement IA
                </button>
            </div>
            
            <div class="space-y-2">
              <label class="text-xs text-gray-600">Taille: {{ frameOverlay.scale.toFixed(2) }}</label>
              <input type="range" 
                     [(ngModel)]="frameOverlay.scale"
                     (input)="redrawOverlay()"
                     min="0.5" max="2" step="0.05"
                     class="w-full">
            </div>
            
            <div class="space-y-2">
              <label class="text-xs text-gray-600">Rotation: {{ frameOverlay.rotation.toFixed(0) }}°</label>
              <input type="range" 
                     [(ngModel)]="frameOverlay.rotation"
                     (input)="redrawOverlay()"
                     min="-30" max="30" step="1"
                     class="w-full">
            </div>
            
            <div class="grid grid-cols-2 gap-2 mt-2">
                <div class="space-y-1">
                    <label class="text-xs text-gray-600">Position X</label>
                    <input type="range" [(ngModel)]="frameOverlay.x" (input)="redrawOverlay()" [min]="0" [max]="overlayCanvas?.width || 500" class="w-full">
                </div>
                 <div class="space-y-1">
                    <label class="text-xs text-gray-600">Position Y</label>
                    <input type="range" [(ngModel)]="frameOverlay.y" (input)="redrawOverlay()" [min]="0" [max]="overlayCanvas?.height || 500" class="w-full">
                </div>
            </div>

            <p class="text-xs text-gray-500 mt-2">💡 L'IA a pré-ajusté la lunette. Glissez ou utilisez les sliders pour affiner.</p>
          </div>
        </div>
        
        <!-- Right: Frame Selection -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Sélectionner une Monture</h3>
            <button (click)="loadFrames()" 
                    class="text-sm text-blue-600 hover:text-blue-800">
              🔄 Actualiser
            </button>
          </div>
          
          <!-- Search -->
          <input type="text" 
                 [(ngModel)]="searchQuery"
                 (input)="filterFrames()"
                 placeholder="Rechercher par marque, modèle..."
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          
          <!-- Filters -->
          <div class="flex gap-2">
            <select [(ngModel)]="filters.brand" (change)="filterFrames()" 
                    class="w-1/2 px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">Toutes Marques</option>
                <option *ngFor="let b of brands" [value]="b">{{ b }}</option>
            </select>
            <select [(ngModel)]="filters.category" (change)="filterFrames()" 
                    class="w-1/2 px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">Toutes Catégories</option>
                <option *ngFor="let c of categories" [value]="c">{{ c }}</option>
            </select>
          </div>
          
          <!-- Error State -->
          <div *ngIf="error && !loading" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ⚠️ {{ error }}
          </div>
          
          <!-- Loading State -->
          <div *ngIf="loading" class="text-center py-8 text-gray-500">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Chargement des montures...
          </div>
          
          <!-- Empty State - No frames loaded yet -->
          <div *ngIf="!loading && frames.length === 0 && !error" class="text-center py-8 text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
            <p class="mb-2">Cliquez sur "🔄 Actualiser" pour charger les montures</p>
          </div>
          
          <!-- Frames Carousel (Dynamic) -->
          <div *ngIf="!loading && filteredFrames.length > 0" class="flex overflow-x-auto gap-4 py-4 px-1 snap-x">
            <div *ngFor="let frame of filteredFrames"
                 (click)="selectFrame(frame)"
                 [class.ring-2]="selectedFrame?.id === frame.id"
                 [class.ring-blue-500]="selectedFrame?.id === frame.id"
                 class="flex-shrink-0 w-40 border rounded-lg p-2 cursor-pointer hover:shadow-lg transition-transform hover:scale-105 snap-center bg-white">
              <div class="aspect-square bg-gray-50 rounded mb-2 overflow-hidden flex items-center justify-center">
                <img *ngIf="frame.photo" 
                     [src]="frame.photo" 
                     [alt]="frame.designation"
                     class="max-w-full max-h-full object-contain mix-blend-multiply"> <!-- Apply blend here too for preview -->
                <div *ngIf="!frame.photo" class="text-gray-300">
                  <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
              </div>
              <p class="text-sm font-bold text-gray-800 truncate">{{ frame.marque }}</p>
              <p class="text-xs text-gray-500 truncate">{{ frame.modele }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      height: 6px;
      border-radius: 3px;
      background: #e5e7eb;
      outline: none;
    }
    
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #2563eb;
      cursor: pointer;
    }
    
    input[type="range"]::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #2563eb;
      cursor: pointer;
      border: none;
    }
  `]
})
export class EssayageVirtuelComponent implements OnInit, OnDestroy {
  // LERP Properties
  targetX = 0; targetY = 0; targetScale = 1; targetRotation = 0;
  targetScaleX = 1; targetScaleY = 1;
  smoothingFactor = 0.2; // Faster smoothing
  animationFrameId: number | null = null;

  // Filters
  filters = { brand: '', category: '' };
  brands = ['Ray-Ban', 'Oakley', 'Gucci', 'Tom Ford', 'Persol', 'Prada'];
  categories = ['Optique', 'Solaire'];

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('overlayCanvas') overlayCanvas!: ElementRef<HTMLCanvasElement>;

  cameraActive = false;
  capturedPhoto: string | null = null;
  stream: MediaStream | null = null;

  frames: Frame[] = [];
  filteredFrames: Frame[] = [];
  selectedFrame: Frame | null = null;
  searchQuery = '';
  loading = false;
  error: string | null = null;

  frameOverlay: FrameOverlay = {
    frame: null as any,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0
  };

  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;

  frameImage: HTMLImageElement | null = null;

  // AI Detection
  detector: faceLandmarksDetection.FaceLandmarksDetector | null = null;
  detectingFace = false;

  // Debug
  logs: string[] = [];
  addLog(msg: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift(`[${time}] ${msg}`);
    if (this.logs.length > 5) this.logs.pop();
  }

  constructor(
    private productService: ProductService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.addLog('Init Component');
    console.log('EssayageVirtuelComponent initialized');
    this.initializeDetector();
  }

  async initializeDetector() {
    try {
      this.addLog('Loading AI Model...');
      console.log('Loading FaceLandmarksDetector...');
      const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      const detectorConfig: faceLandmarksDetection.MediaPipeFaceMeshMediaPipeModelConfig = {
        runtime: 'mediapipe', // or 'tfjs'
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
        refineLandmarks: true
      };

      this.detector = await faceLandmarksDetection.createDetector(model, detectorConfig);
      this.addLog('AI Model Loaded ✅');
      console.log('Face Detector loaded successfully');
    } catch (err: any) {
      const msg = err.message || 'Unknown error';
      this.addLog(`Model Error: ${msg}`);
      console.error('Failed to load Face Detector', err);
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  async startCamera() {
    try {
      console.log('Requesting camera access...');
      this.error = null;

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 }
      });

      console.log('Camera stream obtained');

      this.cameraActive = true;
      this.capturedPhoto = null; // Ensure we are in live mode
      this.cdr.detectChanges();

      if (this.videoElement && this.stream) {
        this.videoElement.nativeElement.srcObject = this.stream;
        this.videoElement.nativeElement.play().catch(e => console.error('Play error:', e));

        // Start Live AR Loop
        this.detectingFace = true;
        this.startLiveDetection();
      }
    } catch (error: any) {
      console.error('Erreur caméra:', error);
      this.error = `Erreur caméra: ${error.message || 'Permission refusée'}`;
      this.cameraActive = false;
      alert('Impossible d\'accéder à la caméra. Vérifiez les permissions dans votre navigateur.');
    }
  }

  async startLiveDetection() {
    if (!this.detector || !this.videoElement) return;

    const loop = async () => {
      if (!this.cameraActive || this.capturedPhoto) return; // Stop if photo taken or camera stopped

      const video = this.videoElement.nativeElement;
      if (video.readyState === 4 && !this.capturedPhoto) {
        await this.detectFaceAndPosition(video);
      }

      requestAnimationFrame(loop);
    };
    loop();
  }



  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.cameraActive = false;
  }

  capturePhoto() {
    if (!this.videoElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      this.capturedPhoto = canvas.toDataURL('image/jpeg');
      this.stopCamera();

      // Initialize overlay position with detection
      setTimeout(() => this.initializeOverlayWithDetection(), 100);
    }
  }

  retakePhoto() {
    this.capturedPhoto = null;
    this.selectedFrame = null;
    this.frameImage = null;
    this.startCamera();
  }

  initializeOverlayWithDetection() {
    if (!this.overlayCanvas || !this.capturedPhoto) return;

    const canvas = this.overlayCanvas.nativeElement;
    const img = new Image();

    img.onload = async () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Default Initialization (Center)
      this.frameOverlay.x = canvas.width / 2;
      this.frameOverlay.y = canvas.height / 2; // Fixed: was height/3 (too high)
      this.frameOverlay.scale = 1;
      this.frameOverlay.rotation = 0;

      // Draw initial state
      this.redrawOverlay();

      // Run Detection
      this.runDetection(img);
    };

    img.src = this.capturedPhoto;
  }

  async runDetection(image?: HTMLImageElement) {
    if (!this.detector) {
      this.addLog('⚠️ Detector not ready');
      return;
    }

    let img = image;
    if (!img && this.capturedPhoto) {
      img = new Image();
      img.src = this.capturedPhoto;
      await new Promise(r => img!.onload = r);
    }

    if (img) {
      this.detectingFace = true;
      this.cdr.detectChanges();
      await this.detectFaceAndPosition(img);
      this.detectingFace = false;
      this.cdr.detectChanges();
    }
  }

  async detectFaceAndPosition(input: HTMLImageElement | HTMLVideoElement) {
    if (!this.detector) return;

    try {
      const faces = await this.detector.estimateFaces(input);

      if (faces.length > 0) {
        const face = faces[0];
        const keypoints = face.keypoints;
        const getPt = (idx: number) => keypoints[idx] || keypoints[0];

        // 1. Inter-Pupillary Distance (IPD)
        const leftPt = getPt(468);
        const rightPt = getPt(473);
        const nosePt = getPt(4); // Nose Tip for Yaw calculation

        if (!leftPt || !rightPt) return;

        const dx = rightPt.x - leftPt.x;
        const dy = rightPt.y - leftPt.y;
        const ipdPx = Math.sqrt(dx * dx + dy * dy);

        // 2. Head Rotation (Roll) - Tilt head left/right
        const rotationRad = Math.atan2(dy, dx);
        const rotationDeg = rotationRad * (180 / Math.PI);

        // 3. Head Yaw (Turn left/right) - 2.5D Perspective
        // Calculate distances from nose to each eye
        const distLeft = Math.sqrt(Math.pow(leftPt.x - nosePt.x, 2) + Math.pow(leftPt.y - nosePt.y, 2));
        const distRight = Math.sqrt(Math.pow(rightPt.x - nosePt.x, 2) + Math.pow(rightPt.y - nosePt.y, 2));

        // Ratio > 1.0 means looking Left, < 1.0 means looking Right.
        const yawRatio = Math.min(distLeft, distRight) / (Math.max(distLeft, distRight) + 0.01); // Avoid div/0

        // --- 2.5D Scaling Logic ---
        // Base Scale Factor (Tuned for less "caricature" size)
        const magicScaleFactor = 2.9;

        // Calculate Base Scale (based on IPD if it were Frontal)
        const frontalIPD = ipdPx / (0.7 + 0.3 * yawRatio); // Compensate shrinkage

        let targetScaleY = 1;
        if (this.frameImage && this.frameImage.width > 0) {
          targetScaleY = (frontalIPD * magicScaleFactor) / this.frameImage.width;
        } else {
          targetScaleY = (frontalIPD * magicScaleFactor) / 500;
        }

        // Scale X should follow the projected IPD + extra squash for 3D feel
        let targetScaleX = targetScaleY * (0.1 + 0.9 * yawRatio); // Squash width as we turn

        // 4. Position (Sellion Anchor)
        const sellion = getPt(168);
        const anchorX = (leftPt.x + rightPt.x) / 2;
        // Adjust Y based on ScaleY so glasses sit correctly on nose bridge
        const anchorY = sellion.y + (frontalIPD * 0.15);

        // LERP Targets
        this.targetX = anchorX;
        this.targetY = anchorY;
        this.targetRotation = rotationDeg;
        this.targetScaleX = targetScaleX;
        this.targetScaleY = targetScaleY;

        // Fallback for UI sliders (average)
        this.targetScale = (targetScaleX + targetScaleY) / 2;

        if (!this.animationFrameId) this.startSmoothLoop();

        // Debug Log
        // this.addLog(`Yaw: ${yawRatio.toFixed(2)} ScaleX: ${targetScaleX.toFixed(2)}`);

      } else {
        // Face lost
      }
    } catch (e) {
      console.error('Detection error:', e);
    }
  }



  drawDebugPoints(ctx: CanvasRenderingContext2D, keypoints: any[]) {
    ctx.fillStyle = 'red';
    keypoints.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Highlight anchors
    const getPt = (idx: number) => keypoints[idx];
    const anchors = [33, 263, 168, 6]; // Eyes, Sellion, NoseTip

    ctx.fillStyle = 'green';
    anchors.forEach(idx => {
      const pt = getPt(idx);
      if (pt) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillText(idx.toString(), pt.x + 5, pt.y);
      }
    });
  }

  startSmoothLoop() {
    const loop = () => {
      this.updatePositionLerp();
      this.redrawOverlay();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  stopSmoothLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  updatePositionLerp() {
    // LERP: current = current + (target - current) * factor
    if (Math.abs(this.targetX - this.frameOverlay.x) > 0.5)
      this.frameOverlay.x += (this.targetX - this.frameOverlay.x) * this.smoothingFactor;

    if (Math.abs(this.targetY - this.frameOverlay.y) > 0.5)
      this.frameOverlay.y += (this.targetY - this.frameOverlay.y) * this.smoothingFactor;

    if (Math.abs(this.targetRotation - this.frameOverlay.rotation) > 0.1)
      this.frameOverlay.rotation += (this.targetRotation - this.frameOverlay.rotation) * this.smoothingFactor;

    // Split Scale LERP
    if (this.targetScaleX && Math.abs(this.targetScaleX - (this.frameOverlay.scaleX || 1)) > 0.001) {
      this.frameOverlay.scaleX = (this.frameOverlay.scaleX || 1) + (this.targetScaleX - (this.frameOverlay.scaleX || 1)) * this.smoothingFactor;
    }

    if (this.targetScaleY && Math.abs(this.targetScaleY - (this.frameOverlay.scaleY || 1)) > 0.001) {
      this.frameOverlay.scaleY = (this.frameOverlay.scaleY || 1) + (this.targetScaleY - (this.frameOverlay.scaleY || 1)) * this.smoothingFactor;
    }

    // Keep legacy 'scale' property updated for UI sliders (using scaleX as ref)
    this.frameOverlay.scale = this.frameOverlay.scaleX || 1;
  }

  redrawOverlay() {
    if (!this.overlayCanvas) return;
    const canvas = this.overlayCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // DRAW BACKGROUND: Either Photo or Live Video
    if (this.capturedPhoto) {
      const photoImg = new Image();
      photoImg.src = this.capturedPhoto;
      // We assume it's loaded for simplicity in this loop, or check complete
      if (photoImg.complete) ctx.drawImage(photoImg, 0, 0, canvas.width, canvas.height);
    } else if (this.cameraActive && this.videoElement) {
      // Draw Live Video Frame
      const video = this.videoElement.nativeElement;
      // Sync canvas size to video if needed
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // DRAW GLASSES
    if (this.selectedFrame && this.frameImage) {
      ctx.save();
      ctx.translate(this.frameOverlay.x, this.frameOverlay.y);
      ctx.rotate((this.frameOverlay.rotation * Math.PI) / 180);

      // Use Split Scale if available, else Legacy
      const sx = this.frameOverlay.scaleX || this.frameOverlay.scale;
      const sy = this.frameOverlay.scaleY || this.frameOverlay.scale;
      ctx.scale(sx, sy);

      ctx.globalCompositeOperation = 'multiply';
      const w = this.frameImage.width;
      const h = this.frameImage.height;
      ctx.drawImage(this.frameImage, -w / 2, -h / 2);
      ctx.globalCompositeOperation = 'source-over';

      ctx.restore();
    }
  }

  loadFrames() {
    console.log('Loading frames from warehouse...');
    this.loading = true;
    this.error = null;

    this.productService.findAll({
      // We limit to 50 frames to avoid huge payloads (images)
      global: true,
      limit: 50
    }).subscribe({
      next: (products) => {
        console.log('Products loaded:', products.length);
        // Filter only frames with photos and available stock
        this.frames = products
          .filter(p => p.photo && p.quantiteActuelle > 0)
          .map(p => p as Frame);
        this.filteredFrames = [...this.frames];
        this.loading = false;
        console.log('Frames with photos:', this.frames.length);

        if (this.frames.length === 0) {
          this.error = 'Aucune monture avec photo disponible en stock';
        }
      },
      error: (error) => {
        console.error('Erreur chargement montures:', error);
        this.error = `Erreur: ${error.message || 'Impossible de charger les montures'}`;
        this.loading = false;
      }
    });
  }

  filterFrames() {
    const query = this.searchQuery.toLowerCase();
    this.filteredFrames = this.frames.filter(frame =>
      frame.marque?.toLowerCase().includes(query) ||
      frame.modele?.toLowerCase().includes(query) ||
      frame.couleur?.toLowerCase().includes(query)
    );
  }

  selectFrame(frame: Frame) {
    this.selectedFrame = frame;
    this.frameOverlay.frame = frame;

    // Load frame image
    if (frame.photo) {
      this.frameImage = new Image();
      this.frameImage.crossOrigin = 'anonymous';
      this.frameImage.onload = () => {
        // If detection already happened, we might need to re-calculate scale
        // because correct scale depends on frameImage.width.
        // But for simplicity, we assume the user might have adjusted or detection happened.
        // If we want to auto-fit NEW frames too, we need face data stored. 
        // For now, just redraw with current detection or defaults.

        // Ideally we would re-run "fit to face" logic if we had valid face data cached.
        // Let's intentionally NOT re-run detection, but just redraw.
        this.redrawOverlay();
      };
      this.frameImage.src = frame.photo;
    }
  }

  startDrag(event: MouseEvent) {
    if (!this.selectedFrame) return;

    const canvas = this.overlayCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;

    this.isDragging = true;
    this.dragStartX = mouseX - this.frameOverlay.x;
    this.dragStartY = mouseY - this.frameOverlay.y;
  }

  onDrag(event: MouseEvent) {
    if (!this.isDragging) return;

    const canvas = this.overlayCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;

    this.frameOverlay.x = mouseX - this.dragStartX;
    this.frameOverlay.y = mouseY - this.dragStartY;

    this.redrawOverlay();
  }

  endDrag() {
    this.isDragging = false;
  }

  saveResult() {
    if (!this.overlayCanvas) return;

    const canvas = this.overlayCanvas.nativeElement;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    // Download the result
    const link = document.createElement('a');
    link.download = `essayage-${this.selectedFrame?.marque}-${Date.now()}.jpg`;
    link.href = dataUrl;
    link.click();

    alert('Image sauvegardée avec succès !');
  }
}
