---
name: refresh-inventory
description: Re-extract used-car inventory for all (or a subset of) the 108 Northland dealers, validate, merge, and publish to GitHub Pages. Use when the user asks to refresh/update inventory data. Accepts optional scope args - a region (Twin Ports, US-2 East, Iron Range, Brainerd Lakes, St. Cloud) or dealer slugs.
---

# Refresh Northland dealer inventory

Re-extracts current inventory + pricing for the dealers in `data/dealers.json`, then validates, merges, and publishes. Full refresh spawns ~15 extraction agents and takes ~15 minutes; scope to a region or dealer list when the user doesn't need everything.

## Procedure

### 1. Scope

- No args → all dealers. Region arg → dealers where `region` matches. Slug args → those dealers.
- Skip dealers whose raw file has `coverage: "summary-only"` AND notes saying closed/no-online-inventory (e.g. gustafson-motors, carhop-st-cloud, duke-boys-auto, 210-auto-sales) unless explicitly requested — but once per quarter re-check 2-3 of them for revived inventory.
- Skip pooled-rooftop placeholders entirely (their inventory lives elsewhere): genesis-of-st-cloud, dondelinger-hyundai, eich-mazda, lake-woods-cdjr, atwater-motors, benna-cdjr → refresh their host rooftop instead.

### 2. Extract (background agents, batched by region, ~4-6 dealers each)

Use `agent-web-data-extraction-engineer` agents. For each dealer, the prompt MUST include:

- Name, address, city/state, phone, website from `data/raw/<slug>.json`
- The documented working method from the file's `"method"` and `"notes"` fields (e.g. "Kestrel /inventory-used.json feed", "DealerOn RSS /rss-usedinventory.aspx + VDP JSON-LD", "Typesense API", "Cars.com dealer ID NNN fallback") — agents should TRY THE DOCUMENTED METHOD FIRST, then fall back per feed-first doctrine
- The exact output schema (copy from an existing raw file), preserving `titleAudit` blocks verbatim if present
- Instruction to add `"extractedAt": "<today YYYY-MM-DD>"` top-level
- The standing rules: USED inventory only at franchises; price/mileage null when unlisted (never 0, never fabricated); cap 300/dealer; dedupe by VIN; exclude non-automobiles (sheds, boats, ATVs, motorcycles, trailers — Motors N More and TB Automotive have burned us); NEVER zip parallel SRP lists (caused the Anderson Motors off-by-one — fetch per-VDP when scraping HTML)

### 3. Validate (before merge — all of these have caught real corruption)

```sh
node scripts/validate.js   # runs all checks below
```

- Every raw file parses; counts vs previous run (flag any dealer whose count dropped >60% — possible extraction failure, not real turnover)
- Model/URL alignment: for URLs embedding the model name, record must match (Anderson bug)
- Placeholder prices: ≥3 identical prices >$50k at one dealer on implausible vehicles (St. Cloud Hyundai $100,349 bug); price ≤ $0 → null
- Implausible mileage: <500 mi on pre-2024 vehicles → null
- Non-vehicle keywords in make/model/trim: shed, cabin, portable building, trailer, moped, snowmobile, ATV

### 4. Merge + verify + publish

```sh
node scripts/merge.js      # raw → dealers.json + dealers.js, region mapping, meta notes
```

- Serve locally (`python3 -m http.server`), Playwright-check: page loads, stats sane, min price ≥ $1,000, filters work, mobile 390px no horizontal overflow
- Commit with a stats-delta message (dealers, vehicles, notable changes) and push — Pages auto-deploys
- Confirm deploy: poll `https://lampagj.github.io/northland-car-dealerships/data/dealers.js` for the new content

### 5. Report

Per-region vehicle deltas, dealers that changed method/coverage, any dealer that went dark (0 vehicles where there were many), new price extremes worth eyeballing.
