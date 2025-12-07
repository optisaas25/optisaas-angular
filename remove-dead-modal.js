const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'src', 'app', 'features', 'client-management', 'fiches', 'monture-form', 'monture-form.component.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// Remove the entire dead Camera Capture Modal block
// From "<!-- Camera Capture Modal -->" to just before "<!-- PD Measurement Modal -->"
const deadModalRegex = /\s*<!-- Camera Capture Modal -->[\s\S]*?(?=\s*<!-- PD Measurement Modal -->)/;

if (deadModalRegex.test(content)) {
    content = content.replace(deadModalRegex, '\n');
    console.log('✅ Removed dead Camera Capture Modal from HTML.');
    fs.writeFileSync(htmlPath, content, 'utf8');
} else {
    console.log('ℹ️ Dead Camera Capture Modal not found (maybe already removed).');
}
