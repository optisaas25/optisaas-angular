const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'src', 'app', 'features', 'client-management', 'fiches', 'monture-form', 'monture-form.component.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// Update the pd-mode-selector to only show in manual mode
const oldSelector = /<div class="pd-mode-selector" \*ngIf="pdStep === 'capture'">/;
const newSelector = '<div class="pd-mode-selector" *ngIf="pdStep === \'capture\' && pdDetectionMode === \'manual\'">';

if (oldSelector.test(content)) {
    content = content.replace(oldSelector, newSelector);
    fs.writeFileSync(htmlPath, content, 'utf8');
    console.log('✅ Updated pd-mode-selector to only show in manual mode');
} else {
    console.log('ℹ️ pd-mode-selector already updated or not found');
}
