# Northland Car Dealerships

Used-car dealer research and inventory dashboard for northern/central Minnesota, northwest Wisconsin, and Michigan's western Upper Peninsula.

**Live dashboard:** https://lampagj.github.io/northland-car-dealerships/

## Coverage

| Region | Towns |
|---|---|
| Twin Ports | Duluth, Hermantown, Proctor, Cloquet MN · Superior WI |
| US-2 East | Poplar, Ashland, Mellen WI · Ironwood, Bessemer, Wakefield MI |
| Iron Range | Grand Rapids, Hibbing, Chisholm, Virginia, Eveleth, Cook MN |
| Brainerd Lakes | Brainerd, Baxter, Pequot Lakes, Pine River, Aitkin, Little Falls MN |
| St. Cloud | St. Cloud, Waite Park, Sauk Rapids, St. Joseph MN |

Used/pre-owned inventory only — new vehicles at franchise dealers are excluded.

## Data

- `data/dealers.json` — canonical dataset: one record per dealer with specialties, coverage/method metadata, and nested inventory (`year/make/model/trim/price/mileage/drivetrain/url`)
- `data/dealers.js` — same data as a JS global, consumed by the dashboard (works over `file://`)
- `data/raw/*.json` — per-dealer source files written by the extraction agents
- `data/roster*.json` — dealer discovery rosters per region

### Honesty rules

- `coverage: full` — complete online inventory captured; `partial` — sample (site blocked or JS-rendered); `summary-only` — dealer operational but no online inventory found
- `method` records how each dealer's data was obtained (native JSON endpoint, RSS/feed, sitemap, HTML, or aggregator fallback)
- Prices and mileage are `null` when the dealer didn't list them — never estimated

## Rebuilding

```sh
node scripts/merge.js   # data/raw/*.json → data/dealers.json + data/dealers.js
```

Then open `index.html` — no build step, no server required. D3 is vendored at `assets/d3.min.js`.

Collected 2026-06-05. Inventory turns over fast at small lots — treat prices as a snapshot, not live data.
