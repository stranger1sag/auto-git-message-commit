const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const distCLI = path.resolve(__dirname, '../dist/cli.js');
console.log('Testing diff-to-commit generation on built CLI:');
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.diff'));
for (const f of files) {
  const full = path.join(__dirname, f);
  try {
    const cmd = `node "${distCLI}" "${full}"`;
    const out = execSync(cmd, { encoding: 'utf8' });
    console.log('\n=== Diff:', f, '===');
    console.log(out);
  } catch (e) {
    console.error('Error running diff:', f, e.message);
  }
}
