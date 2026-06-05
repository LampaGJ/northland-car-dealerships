# Duluth–Superior Used Car Dealer Research — Design

**Date:** 2026-06-05
**Status:** Approved

## Goal

Research used car dealers in the Duluth MN / Superior WI region (incl. Hermantown, Proctor, Cloquet fringe): identify each dealer's specialties and current stock with pricing. Persist data locally as JSON; present via a static HTML dashboard.

## Scope decisions (user-confirmed)

- **Dealers:** All — independents plus used inventory of franchise dealers.
- **Depth:** Full inventory where feasible; representative samples (marked `coverage: "partial"`) where sites block access.
- **Dashboard:** Single static HTML file with filters and charts. No build step, no server.

## Architecture

1. **Phase 1 — Discovery:** Web research enumerates dealers → roster (name, address, website, type).
2. **Phase 2 — Extraction:** Parallel `agent-web-data-extraction-engineer` agents, one batch per group of dealers. Feed-first doctrine: fingerprint the dealer CMS (Dealer.com, DealerOn, DealerCarSearch, etc.), prefer JSON endpoints/sitemaps over HTML scraping. Each agent writes `data/raw/<dealer-slug>.json`.
3. **Phase 3 — Merge + dashboard:** Merge raw files into `data/dealers.json` with `meta` block (collection date, per-dealer method + coverage). Build `dashboard.html`.

## Data shape

```json
{
  "meta": { "collectedAt": "...", "region": "Duluth-Superior", "notes": [] },
  "dealers": [{
    "name": "", "slug": "", "type": "independent|franchise",
    "address": "", "city": "", "state": "", "phone": "", "website": "",
    "specialties": [""],
    "coverage": "full|partial|summary-only",
    "method": "json-endpoint|sitemap|html|aggregator",
    "inventory": [{
      "year": 0, "make": "", "model": "", "trim": "",
      "price": 0, "mileage": 0, "drivetrain": "", "url": ""
    }]
  }]
}
```

## Dashboard

`dashboard.html` — self-contained (data embedded inline so `file://` works). Vanilla HTML/CSS/JS; D3 v7 installed locally via npm and referenced from `assets/d3.min.js` (no CDN).

Sections: summary stats bar → dealer cards w/ specialties → sortable/filterable vehicle table (make, price range, mileage, dealer) → charts (price distribution histogram, inventory count by dealer).

## Error handling

- Blocked/unreachable dealer sites: fall back to aggregator samples (Cars.com / AutoTrader), mark coverage `partial` — no silent gaps.
- Missing fields (e.g., "Call for price"): `null`, never fabricated.
