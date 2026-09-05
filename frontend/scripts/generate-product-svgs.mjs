// Generates themed SVG placeholder images for catalog SKUs that have no JPG.
// Run from the frontend dir: node scripts/generate-product-svgs.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public', 'products')

const ACCENTS = {
  Electronics: '#22d3ee',
  Accessories: '#a78bfa',
  Wearables: '#f472b6',
  Gear: '#34d399',
  Fashion: '#fbbf24',
  'High-End Audio': '#818cf8',
  Displays: '#60a5fa',
  Peripherals: '#c084fc',
  Storage: '#38bdf8',
  Connectivity: '#2dd4bf',
  Cameras: '#fb7185',
  Audio: '#a78bfa',
  'Smart Home': '#4ade80',
  Furniture: '#fb923c',
  Apparel: '#fbbf24',
  'Leather Goods': '#d97706',
  Timepieces: '#fcd34d',
  Footwear: '#b45309',
}

const PRODUCTS = [
  // merchant_default additions
  ['SKU_110', 'Insulated Water Bottle', 'Gear'],
  ['SKU_111', 'Wireless Mouse Pro', 'Electronics'],
  ['SKU_112', 'Mechanical Keyboard TKL', 'Electronics'],
  // apex_electronics additions
  ['SKU_201', 'RGB Mechanical Keyboard', 'Peripherals'],
  ['SKU_202', 'Wireless Gaming Mouse', 'Peripherals'],
  ['SKU_203', '2TB NVMe SSD Pro', 'Storage'],
  ['SKU_204', 'Thunderbolt 4 Dock', 'Connectivity'],
  ['SKU_205', '4K Streaming Webcam', 'Cameras'],
  ['SKU_206', 'Studio Microphone', 'Audio'],
  ['SKU_207', 'Smart Speaker', 'Smart Home'],
  ['SKU_208', 'Ergonomic Gaming Chair', 'Furniture'],
  ['SKU_209', '27" 4K OLED Monitor', 'Displays'],
  // nexus_fashion additions
  ['SKU_301', 'Cashmere Overcoat', 'Apparel'],
  ['SKU_302', 'Hand-Stitched Oxford Shoes', 'Footwear'],
  ['SKU_303', 'Silk Pocket Square Set', 'Apparel'],
  ['SKU_304', 'Leather Belt', 'Leather Goods'],
  ['SKU_305', 'Sterling Silver Cufflinks', 'Accessories'],
  ['SKU_306', 'Cashmere Travel Shawl', 'Apparel'],
  ['SKU_307', 'Linen Shirt', 'Apparel'],
  ['SKU_308', 'Leather Gloves', 'Accessories'],
  ['SKU_309', 'Travel Valet Tray', 'Leather Goods'],
]

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function svgFor([id, name, category]) {
  const accent = ACCENTS[category] || '#22d3ee'
  const initial = (name.charAt(0) || '?').toUpperCase()
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0e111b"/>
      <stop offset="55%" stop-color="#131729"/>
      <stop offset="100%" stop-color="#1b1f32"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="70%" stop-color="${accent}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <rect width="800" height="600" fill="url(#glow)"/>
  <circle cx="400" cy="240" r="120" fill="none" stroke="${accent}" stroke-opacity="0.5" stroke-width="1.5"/>
  <circle cx="400" cy="240" r="88" fill="none" stroke="${accent}" stroke-opacity="0.3" stroke-width="1"/>
  <text x="400" y="272" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="110" font-weight="700" fill="#ffffff" text-anchor="middle">${escapeXml(initial)}</text>
  <rect x="300" y="330" width="200" height="34" rx="17" fill="${accent}" fill-opacity="0.15" stroke="${accent}" stroke-opacity="0.5"/>
  <text x="400" y="353" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="16" font-weight="600" letter-spacing="3" fill="${accent}" text-anchor="middle">${escapeXml(category.toUpperCase())}</text>
  <text x="400" y="420" font-family="ui-sans-serif, system-ui, sans-serif" font-size="26" font-weight="700" fill="#e5e7eb" text-anchor="middle">${escapeXml(name)}</text>
  <text x="400" y="455" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" fill="#64748b" text-anchor="middle">${escapeXml(id)}</text>
  <text x="400" y="540" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" letter-spacing="6" fill="#475569" text-anchor="middle">RAZORCAGE</text>
</svg>
`
}

mkdirSync(outDir, { recursive: true })
for (const p of PRODUCTS) {
  const file = join(outDir, `${p[0]}.svg`)
  writeFileSync(file, svgFor(p))
  console.log('wrote', file)
}
console.log(`\nGenerated ${PRODUCTS.length} SVGs into ${outDir}`)