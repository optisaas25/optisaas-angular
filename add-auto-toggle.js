const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'src', 'app', 'features', 'client-management', 'fiches', 'monture-form', 'monture-form.component.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// Define the new HTML to insert
const newHTML = `
        <!-- Detection Mode Toggle (Auto/Manual) -->
        <div class="detection-mode-toggle" *ngIf="pdStep === 'capture'">
            <button type="button" [class.active]="pdDetectionMode === 'auto'" 
                    (click)="pdDetectionMode = 'auto'; openPDMeasurement()">
                🤖 Auto (IA)
            </button>
            <button type="button" [class.active]="pdDetectionMode === 'manual'" 
                    (click)="pdDetectionMode = 'manual'; stopAutoDetection()">
                ✋ Manuel
            </button>
        </div>

        <!-- Real-time Detection Status (Auto Mode Only) -->
        <div class="live-detection" *ngIf="pdDetectionMode === 'auto' && pdStep === 'capture' && detectionActive">
            <div class="detection-indicator">
                <span class="pulse-dot"></span>
                Détection active
            </div>
            <div class="live-values" *ngIf="pdValues.total > 0">
                <div class="value-card">
                    <span class="label">EP Total</span>
                    <span class="value">{{ pdValues.total }} mm</span>
                </div>
                <div class="value-card">
                    <span class="label">OD</span>
                    <span class="value">{{ pdValues.od }} mm</span>
                </div>
                <div class="value-card">
                    <span class="label">OG</span>
                    <span class="value">{{ pdValues.og }} mm</span>
                </div>
                <div class="confidence">
                    📊 Précision: {{ confidenceScore }}%
                </div>
            </div>
        </div>
`;

// Insert after modal-header (find </div> after modal-header, then add before next line)
const insertionPoint = content.indexOf('</div>\r\n\r\n        <div class="modal-body">');
if (insertionPoint !== -1) {
    const before = content.substring(0, insertionPoint + 7); // Include </div>
    const after = content.substring(insertionPoint + 7);
    content = before + newHTML + after;
    fs.writeFileSync(htmlPath, content, 'utf8');
    console.log('✅ Added Auto/Manual toggle and live detection display to PD modal');
} else {
    console.error('❌ Could not find insertion point in HTML');
}
