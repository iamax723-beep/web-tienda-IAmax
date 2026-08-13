const fs = require('fs');
const t = fs.readFileSync('bundle.js', 'utf8');
const urls = t.match(/https?:\/\/[^\s"'\\]+/g) || [];
const filtered = [...new Set(urls)].filter(u => u.includes('api') || u.includes('products') || u.includes('v1') || u.includes('api.quantumvault'));
console.log("Found API URLs:", filtered);

// Also let's search for paths starting with /api/
const paths = t.match(/\/api\/[^\s"'\\]+/g) || [];
console.log("Found API Paths:", [...new Set(paths)]);

// Search for 'products' related keys or paths
const p = t.match(/[^\s"'\\]*products[^\s"'\\]*/g) || [];
console.log("Products related strings (sample):", [...new Set(p)].slice(0, 20));
