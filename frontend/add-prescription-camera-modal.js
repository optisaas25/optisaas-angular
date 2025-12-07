const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'src', 'app', 'features', 'client-management', 'fiches', 'monture-form', 'monture-form.component.html');
let content = fs.readFileSync(htmlPath, 'utf8');

const cameraModal = `
<!-- Prescription Camera Modal -->
<div class="camera-modal" *ngIf="showCameraModal" (click)="closePrescriptionCamera()">
    <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
            <h3>Prendre une photo de l'ordonnance</h3>
            <button type="button" class="btn-close" (click)="closePrescriptionCamera()">×</button>
        </div>
        
        <div class="modal-body">
            <div class="camera-container">
                <video #videoElement autoplay playsinline></video>
                <canvas #canvasElement style="display:none"></canvas>
            </div>
        </div>
        
        <div class="modal-footer">
            <button type="button" class="btn-secondary" (click)="closePrescriptionCamera()">Annuler</button>
            <button type="button" class="btn-primary" (click)="capturePrescriptionPhoto()">
                📷 Capturer
            </button>
        </div>
    </div>
</div>
`;

// Add before the last closing </div>
const lastDiv = content.lastIndexOf('</div>');
if (lastDiv !== -1) {
    content = content.substring(0, lastDiv) + cameraModal + '\n' + content.substring(lastDiv);
    fs.writeFileSync(htmlPath, content, 'utf8');
    console.log('✅ Added camera modal for prescriptions');
} else {
    console.error('❌ Could not find insertion point');
}
