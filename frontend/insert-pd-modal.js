const fs = require('fs');
const path = require('path');

// Read the original HTML file
const htmlPath = path.join(__dirname, 'src', 'app', 'features', 'client-management', 'fiches', 'monture-form', 'monture-form.component.html');
const pdModalPath = path.join(__dirname, 'pd-modal-snippet.html');

const originalContent = fs.readFileSync(htmlPath, 'utf8');
const pdModalContent = fs.readFileSync(pdModalPath, 'utf8');

// Find the last </div> and insert before it
const lastDivIndex = originalContent.lastIndexOf('</div>');

if (lastDivIndex === -1) {
    console.error('Could not find closing </div> tag');
    process.exit(1);
}

// Insert the PD modal before the last </div>
const newContent = originalContent.substring(0, lastDivIndex) +
    pdModalContent + '\r\n' +
    originalContent.substring(lastDivIndex);

// Write the modified content back
fs.writeFileSync(htmlPath, newContent, 'utf8');

console.log('✅ PD Modal successfully added to HTML template!');
console.log(`File size: ${originalContent.length} -> ${newContent.length} bytes`);
