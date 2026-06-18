const fs = require('fs');
const path = require('path');

const dir = './src/app/dashboard';
const files = [
  'guardian/page.tsx',
  'finance/page.tsx',
  'marketing/page.tsx',
  'people/page.tsx',
  'ai/page.tsx',
  'gpt/page.tsx',
  'sales/page.tsx',
  'meeting/page.tsx',
  'settings/page.tsx'
];

files.forEach(f => {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) return;
  
  let content = fs.readFileSync(p, 'utf8');
  
  // Remove C from import
  content = content.replace(/import\s*\{\s*C\s*,\s*/g, 'import { ');
  content = content.replace(/import\s*\{\s*C\s*\}\s*from\s*'@\/lib\/ui'/g, '');

  // Add import { useApp } from '@/lib/theme' if not there
  if (!content.includes(`useApp } from '@/lib/theme'`)) {
    content = content.replace(/(import .* from '@\/lib\/ui')/, "$1\nimport { useApp } from '@/lib/theme'");
  }

  // Inject const { colors: C } = useApp() inside the main component
  content = content.replace(/(export default function \w+\(.*\) \{)/, "$1\n  const { colors: C } = useApp()");
  
  fs.writeFileSync(p, content);
  console.log('Updated ' + f);
});
