# Turkey 2026 Travel Dashboard

Mobile-first personal travel dashboard for the 2026 Turkey trip.

## Features

- Today dashboard with countdown, current or upcoming city, weather, next item, and timeline.
- Trip page with date tabs from 2026/09/22 to 2026/10/01.
- Flight cards for TK25, TK2012, TK2017, and TK124.
- Places and More sections for hotels, attractions, checklist, weather notes, currency, and emergency information.
- Public/private entry points so itinerary updates stay shared while budget details remain private.
- Dynamic weather through Open-Meteo, with graceful fallback when the trip date is outside the forecast range.
- Static-file architecture suitable for GitHub Pages.

## Public vs Private

- `index.html` and `index.public.html` are the public version. They do not load budget data.
- `index.private.html` is the private version. It loads `data/budget.private.js`.
- Shared itinerary, flights, places, and tools live in `data/trip.js`; update this once and both versions change together.
- Private costs live only in `data/budget.private.js`; do not upload this file to a public website.

For a public GitHub Pages upload, include the public files only and exclude:

```text
data/budget.private.js
app.private.js
index.private.html
```

## Edit Trip Data

Most trip content lives in:

```text
data/trip.js
```

Update itinerary events, hotels, places, and flight details there.

Private budget content lives in:

```text
data/budget.private.js
```

## Run Locally

Because this project uses JavaScript modules, serve it with a local web server:

```bash
python -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

## Privacy

Do not add passport numbers, booking references, boarding pass QR codes, ticket barcodes, credit card information, personal phone numbers, private IDs, or sensitive reservation credentials.
