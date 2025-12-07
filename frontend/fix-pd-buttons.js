const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'src', 'app', 'features', 'client-management', 'fiches', 'monture-form', 'monture-form.component.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Connect existing button
// Look for the button with "Mesurer EP (Tablette)" inside
// We'll replace the button tag opening
const buttonRegex = /(<button type="button" class="btn-icon-primary">)(\s*<svg[\s\S]*?Mesurer EP \(Tablette\))/;
if (buttonRegex.test(content)) {
    content = content.replace(buttonRegex, '<button type="button" class="btn-icon-primary" (click)="openPDMeasurement()">$2');
    console.log('✅ Connected existing "Mesurer EP (Tablette)" button.');
} else {
    console.error('❌ Could not find existing "Mesurer EP (Tablette)" button.');
}

// 2. Remove duplicate button at the bottom
const duplicateButtonRegex = /<div class="pd-measurement-section">[\s\S]*?<\/div>/;
if (duplicateButtonRegex.test(content)) {
    content = content.replace(duplicateButtonRegex, '');
    console.log('✅ Removed duplicate PD button at the bottom.');
} else {
    console.log('ℹ️ Duplicate button not found (maybe already removed).');
}

fs.writeFileSync(htmlPath, content, 'utf8');
