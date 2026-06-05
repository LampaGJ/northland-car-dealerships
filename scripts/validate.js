// Pre-merge validation for data/raw/*.json — each check here caught real corruption once.
// Exits 1 if any ERROR; WARNs are advisory.
const fs = require('fs');
const path = require('path');

const rawDir = path.join(__dirname, '..', 'data', 'raw');
const prevPath = path.join(__dirname, '..', 'data', 'dealers.json');
const prev = fs.existsSync(prevPath) ? JSON.parse(fs.readFileSync(prevPath, 'utf8')) : null;
const prevCounts = new Map((prev?.dealers || []).map(d => [d.slug, d.inventory.length]));

const NON_VEHICLE = /shed|cabin|portable building|cottage|trailer|moped|snowmobile|\batv\b|side.by.side|eldocraft|pontoon/i;
let errors = 0, warns = 0;
const err = m => { console.log('ERROR ', m); errors++; };
const warn = m => { console.log('WARN  ', m); warns++; };

for (const f of fs.readdirSync(rawDir).filter(x => x.endsWith('.json')).sort()) {
  let d;
  try { d = JSON.parse(fs.readFileSync(path.join(rawDir, f), 'utf8')); }
  catch (e) { err(`${f}: does not parse — ${e.message}`); continue; }
  const slug = f.replace(/\.json$/, '');
  const inv = d.inventory || [];

  // count collapse vs previous run (>60% drop on a previously stocked dealer)
  const was = prevCounts.get(slug);
  if (was >= 10 && inv.length < was * 0.4) warn(`${slug}: count collapsed ${was} -> ${inv.length} — extraction failure or real clear-out?`);

  // model/URL alignment (Anderson off-by-one)
  let misaligned = 0, checkable = 0;
  for (const v of inv) {
    const u = (v.url || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const model = (v.model || '').toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '');
    if (!u || model.length < 3 || !/used\d{4}|20\d\d[a-z]/.test(u)) continue; // only slug-style URLs
    checkable++;
    if (!u.includes(model)) misaligned++;
  }
  if (checkable >= 5 && misaligned / checkable > 0.3) err(`${slug}: ${misaligned}/${checkable} model/URL mismatches — likely zipped-list misalignment`);

  // placeholder price clusters (>$50k, 3+ identical at one dealer)
  const priceCounts = {};
  inv.forEach(v => { if (v.price > 50000) priceCounts[v.price] = (priceCounts[v.price] || 0) + 1; });
  for (const [p, n] of Object.entries(priceCounts)) {
    if (n >= 3) {
      const aged = inv.filter(v => v.price === +p && v.year && v.year < new Date().getFullYear() - 8);
      if (aged.length) err(`${slug}: ${n} vehicles at identical $${(+p).toLocaleString()} incl. ${aged.length} aged units — placeholder price?`);
      else warn(`${slug}: ${n} vehicles at identical $${(+p).toLocaleString()} — verify (may be fleet stock)`);
    }
  }

  // bad scalars
  inv.forEach(v => {
    if (v.price != null && v.price <= 0) err(`${slug}: price ${v.price} on ${v.year} ${v.make} ${v.model} — should be null`);
    if (v.mileage != null && v.mileage < 500 && v.year && v.year < new Date().getFullYear() - 2)
      warn(`${slug}: implausible ${v.mileage} mi on ${v.year} ${v.make} ${v.model} — null it`);
    if (NON_VEHICLE.test([v.make, v.model, v.trim].join(' ')))
      err(`${slug}: non-vehicle item "${v.year} ${v.make} ${v.model} ${v.trim || ''}"`);
  });
}

console.log(`\n${errors} errors, ${warns} warnings`);
process.exit(errors ? 1 : 0);
