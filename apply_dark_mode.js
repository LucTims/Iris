const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  const replacements = [
    { regex: /bg-white(?!\s+dark:bg-)/g, replacement: 'bg-white dark:bg-neutral-900' },
    { regex: /text-neutral-900(?!\s+dark:text-)/g, replacement: 'text-neutral-900 dark:text-neutral-100' },
    { regex: /text-neutral-800(?!\s+dark:text-)/g, replacement: 'text-neutral-800 dark:text-neutral-200' },
    { regex: /text-neutral-700(?!\s+dark:text-)/g, replacement: 'text-neutral-700 dark:text-neutral-300' },
    { regex: /text-neutral-600(?!\s+dark:text-)/g, replacement: 'text-neutral-600 dark:text-neutral-400' },
    { regex: /text-neutral-500(?!\s+dark:text-)/g, replacement: 'text-neutral-500 dark:text-neutral-400' },
    { regex: /bg-neutral-100(?!\s+dark:bg-|\/)/g, replacement: 'bg-neutral-100 dark:bg-neutral-800' },
    { regex: /bg-neutral-50(?!\s+dark:bg-|\/)/g, replacement: 'bg-neutral-50 dark:bg-neutral-800/50' },
    { regex: /border-neutral-200\/80(?!\s+dark:border-)/g, replacement: 'border-neutral-200/80 dark:border-neutral-800' },
    { regex: /border-neutral-200(?!\s+dark:border-|\/)/g, replacement: 'border-neutral-200 dark:border-neutral-800' },
    { regex: /border-neutral-100(?!\s+dark:border-|\/)/g, replacement: 'border-neutral-100 dark:border-neutral-800' },
  ];

  for (const { regex, replacement } of replacements) {
    content = content.replace(regex, replacement);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') && !fullPath.includes('node_modules')) {
      processFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'src', 'app'));
walkDir(path.join(__dirname, 'src', 'components'));
console.log("Done adding dark classes.");
