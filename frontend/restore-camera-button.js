const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'src', 'app', 'features', 'client-management', 'fiches', 'monture-form', 'monture-form.component.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// Find the "Importer Files" button and add the camera button after it
const importButtonEnd = content.indexOf('Importer Files\r\n                    </button>');

if (importButtonEnd !== -1) {
    // Insert the camera button after the closing </button> tag
    const insertPoint = importButtonEnd + 'Importer Files\r\n                    </button>'.length;

    const cameraButton = `\r
                    <button type="button" class="btn-icon-camera" (click)="openCamera()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path
                                d="M12 15.2c1.77 0 3.2-1.43 3.2-3.2s-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2 1.43 3.2 3.2 3.2zm0-4.9c.94 0 1.7.76 1.7 1.7s-.76 1.7-1.7 1.7-1.7-.76-1.7-1.7.76-1.7 1.7-1.7zM20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h4.05l1.83-2h4.24l1.83 2H20v12z" />
                        </svg>
                        Prendre une photo
                    </button>`;

    content = content.substring(0, insertPoint) + cameraButton + content.substring(insertPoint);
    console.log('✅ Added "Prendre une photo" button');
} else {
    console.log('❌ Could not find insertion point');
}

// Add #cameraInput after #fileInput
const fileInputEnd = content.indexOf('(change)="onFilesSelected($event)">');
if (fileInputEnd !== -1) {
    const insertPoint = fileInputEnd + '(change)="onFilesSelected($event)">'.length;
    const cameraInput = '\n                    <input #cameraInput type="file" accept="image/*" capture="environment" style="display:none" (change)="onCameraCapture($event)">';

    content = content.substring(0, insertPoint) + cameraInput + content.substring(insertPoint);
    console.log('✅ Added #cameraInput');
} else {
    console.log('❌ Could not find #fileInput');
}

fs.writeFileSync(htmlPath, content, 'utf8');
console.log('✅ Restoration complete');
