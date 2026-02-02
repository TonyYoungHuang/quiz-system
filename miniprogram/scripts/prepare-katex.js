const fs = require('fs');
const path = require('path');

const srcCss = path.join(__dirname, '..', 'node_modules', 'katex', 'dist', 'katex.min.css');
const srcFonts = path.join(__dirname, '..', 'node_modules', 'katex', 'dist', 'fonts');
const destDir = path.join(__dirname, '..', 'katex');
const destFonts = path.join(destDir, 'fonts');
const destCss = path.join(destDir, 'katex.wxss');

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
if (!fs.existsSync(destFonts)) fs.mkdirSync(destFonts, { recursive: true });

fs.copyFileSync(srcCss, destCss);
const fontFiles = fs.readdirSync(srcFonts);
fontFiles.forEach(file => {
  fs.copyFileSync(path.join(srcFonts, file), path.join(destFonts, file));
});

let css = fs.readFileSync(destCss, 'utf8');
css = css.replace(/url\(\.\/fonts\//g, "url('/katex/fonts/");
css = css.replace(/\.katex \*\{[^}]*\}/g, '');
fs.writeFileSync(destCss, css, 'utf8');

console.log('KaTeX assets prepared at miniprogram/katex');
