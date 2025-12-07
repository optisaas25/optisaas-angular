const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'src', 'app', 'features', 'client-management', 'fiches', 'monture-form', 'monture-form.component.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// Add camera input if not present
if (!content.includes('#cameraInput')) {
    const fileInputRegex = /(<input #fileInput[\s\S]*?>)/;
    if (fileInputRegex.test(content)) {
        content = content.replace(fileInputRegex, '$1\n                    <input #cameraInput type="file" accept="image/*" capture="environment" style="display:none" (change)="onCameraCapture($event)">');
        console.log('✅ Added camera input.');
        fs.writeFileSync(htmlPath, content, 'utf8');
    } else {
        console.error('❌ Could not find fileInput to insert after.');
    }
} else {
    console.log('ℹ️ Camera input already present.');
}
