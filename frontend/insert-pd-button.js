const fs = require('fs');
const path = require('path');

// Read the HTML file
const htmlPath = path.join(__dirname, 'src', 'app', 'features', 'client-management', 'fiches', 'monture-form', 'monture-form.component.html');
const buttonPath = path.join(__dirname, 'pd-button.html');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const buttonContent = fs.readFileSync(buttonPath, 'utf8');

// Find the line with the closing </div> for ordonnance section (line 253)
// We need to insert the button before this closing div
const lines = htmlContent.split('\n');

// Find line 252 (0-indexed: 251) which has "            </div>"
// Insert button before line 253
const insertIndex = 252; // Before line 253 (0-indexed)

// Insert the button
lines.splice(insertIndex, 0, buttonContent);

// Write back
const newContent = lines.join('\n');
fs.writeFileSync(htmlPath, newContent, 'utf8');

console.log('✅ PD Measurement button added successfully!');
console.log(`Inserted at line ${insertIndex + 1}`);
