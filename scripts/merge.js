// Merge data/raw/*.json dealer files into data/dealers.json
const fs = require('fs');
const path = require('path');

const rawDir = path.join(__dirname, '..', 'data', 'raw');
const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.json')).sort();

const REGION_BY_CITY = {
  // Twin Ports core
  'Duluth': 'Twin Ports', 'Hermantown': 'Twin Ports', 'Proctor': 'Twin Ports',
  'Cloquet': 'Twin Ports', 'Superior': 'Twin Ports',
  // US-2 corridor east to Ironwood
  'Poplar': 'US-2 East', 'Ashland': 'US-2 East', 'Mellen': 'US-2 East',
  'Ironwood': 'US-2 East', 'Bessemer': 'US-2 East', 'Wakefield': 'US-2 East',
  // Iron Range
  'Grand Rapids': 'Iron Range', 'Cohasset': 'Iron Range', 'Hibbing': 'Iron Range',
  'Chisholm': 'Iron Range', 'Virginia': 'Iron Range', 'Eveleth': 'Iron Range', 'Cook': 'Iron Range',
  // Brainerd Lakes / Aitkin / Little Falls
  'Brainerd': 'Brainerd Lakes', 'Baxter': 'Brainerd Lakes', 'Merrifield': 'Brainerd Lakes',
  'Pequot Lakes': 'Brainerd Lakes', 'Pine River': 'Brainerd Lakes',
  'Aitkin': 'Brainerd Lakes', 'Little Falls': 'Brainerd Lakes',
  // St. Cloud metro
  'St. Cloud': 'St. Cloud', 'Saint Cloud': 'St. Cloud', 'Waite Park': 'St. Cloud',
  'Sauk Rapids': 'St. Cloud', 'Sartell': 'St. Cloud', 'St. Joseph': 'St. Cloud',
  'Saint Stephen': 'St. Cloud', 'St. Augusta': 'St. Cloud',
};

const dealers = files.map(f => {
  const d = JSON.parse(fs.readFileSync(path.join(rawDir, f), 'utf8'));
  d.slug = d.slug || f.replace(/\.json$/, '');
  d.region = REGION_BY_CITY[d.city] || 'Other';
  if (d.region === 'Other') console.warn(`WARN: no region mapping for city "${d.city}" (${d.slug})`);
  d.inventory = (d.inventory || []).map(v => ({
    year: v.year ?? null,
    make: v.make ?? null,
    model: v.model ?? null,
    trim: v.trim ?? null,
    price: typeof v.price === 'number' && v.price > 0 ? v.price : null, // some APIs encode "call for price" as 0
    mileage: typeof v.mileage === 'number' ? v.mileage : null,
    drivetrain: v.drivetrain ?? null,
    url: v.url ?? null,
  }));
  return d;
});

const totalVehicles = dealers.reduce((n, d) => n + d.inventory.length, 0);

const out = {
  meta: {
    collectedAt: '2026-06-05',
    region: 'Northland: Twin Ports · US-2 east to Ironwood MI · Iron Range · Brainerd Lakes · St. Cloud',
    dealerCount: dealers.length,
    vehicleCount: totalVehicles,
    notes: [
      'Used/pre-owned inventory only; new vehicles excluded at franchise dealers.',
      'coverage: full = complete online inventory captured; partial = sample or incomplete capture (site blocked or JS-rendered); summary-only = dealer operational but no online inventory found.',
      'Benna Ford and Benna CDJR share a cross-lot inventory pool — some VINs may appear under both rooftops.',
      'Shared-pool rooftops recorded once to avoid double-counting: Genesis of St. Cloud (under St. Cloud Hyundai), Dondelinger Hyundai (under Dondelinger Chevrolet), Eich Mazda (under Eich VW), Lake Woods CDJR (absorbed into Dondelinger Ford CDJR), Atwater Motors Baxter (under Atwater Chevrolet GMC).',
      'Confirmed closed during research: Gustafson Motors (Cook), CarHop St. Cloud (April 2026).',
      'Prices/mileage are null where the dealer did not list them ("call for price") — never estimated.',
    ],
  },
  dealers,
};

fs.writeFileSync(path.join(__dirname, '..', 'data', 'dealers.json'), JSON.stringify(out, null, 2));
// JS module so dashboard.html works over file:// (no fetch/CORS)
fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'dealers.js'),
  'window.DEALER_DATA = ' + JSON.stringify(out) + ';\n'
);
console.log(`Wrote data/dealers.json + data/dealers.js: ${dealers.length} dealers, ${totalVehicles} vehicles`);

// Quick integrity report
for (const d of dealers) {
  const priced = d.inventory.filter(v => v.price != null);
  const lo = priced.length ? Math.min(...priced.map(v => v.price)) : null;
  const hi = priced.length ? Math.max(...priced.map(v => v.price)) : null;
  console.log(
    d.slug.padEnd(30),
    String(d.inventory.length).padStart(4),
    `${priced.length} priced`.padStart(11),
    lo != null ? `$${lo.toLocaleString()}–$${hi.toLocaleString()}` : '—'
  );
}
