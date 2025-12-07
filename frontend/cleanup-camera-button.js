const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'src', 'app', 'features', 'client-management', 'fiches', 'monture-form', 'monture-form.component.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// Remove the "Prendre une photo" button (lines ~97-103)
const cameraButtonRegex = /<button type="button" class="btn-icon-camera"[^>]*>\s*<svg[\s\S]*?<\/svg>\s*Prendre une photo\s*<\/button>/;
if (cameraButtonRegex.test(content)) {
    content = content.replace(cameraButtonRegex, '');
    console.log('✅ Removed "Prendre une photo" button');
} else {
    console.log('ℹ️ Camera button not found or already removed');
}

// Remove the #cameraInput element
const cameraInputRegex = /<input #cameraInput[^>]*>/;
if (cameraInputRegex.test(content)) {
    content = content.replace(cameraInputRegex, '');
    console.log('✅ Removed #cameraInput element');
} else {
    console.log('ℹ️ #cameraInput not found or already removed');
}

fs.writeFileSync(htmlPath, content, 'utf8');
console.log('✅ HTML cleanup complete');
