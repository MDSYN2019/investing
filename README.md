# Gridline energy-trading cockpit

Gridline is a working starter application for operational energy-trading analytics. It combines a React dashboard with a FastAPI-compatible API, a small SQLite data store, P&L/exposure summaries, forecast-error metrics, alerts, and JSON daily reports.

The seeded records are synthetic. Gridline does **not** connect to a broker, route orders, hold money, or provide investment advice.

## What is in the repository?

```text
.
├── backend/
│   ├── database.py       # SQLite connection, schema creation, and demo seed data
│   ├── main.py           # HTTP API, validation, CORS, and OpenAPI metadata
│   └── service.py        # Queries and analytics kept separate from HTTP concerns
├── src/
│   ├── main.jsx          # Dashboard and API integration
│   └── styles.css        # Responsive dashboard design
├── tests/test_service.py # Isolated service/analytics tests
├── requirements.txt      # Pinned Python runtime packages
└── vite.config.js        # Proxies /api requests to FastAPI during development
```

At startup, the API creates `backend/gridline.db` and inserts a few example trades, forecasts, and alerts if the database is empty. Set `GRIDLINE_DATABASE` to use a different SQLite file. The service layer contains the calculations and can later be moved to Postgres without changing the public endpoints.

## Quick start

Prerequisites: Python 3.10+ and Node.js 20+.

### 1. Start the API

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Open <http://127.0.0.1:8000/docs> for interactive Swagger documentation or <http://127.0.0.1:8000/api/v1/health> for the health check.

### 2. Start the dashboard in a second terminal

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:5173>. Vite forwards `/api/*` to port 8000. The status beside the date reads **LIVE API** when the backend is available and **DEMO DATA** when the frontend has fallen back to its built-in display values.

The **Refresh data** button reloads the dashboard summary. **Generate report** calls the report endpoint and downloads the result as `gridline-daily-report.json`.

## API endpoints

All endpoints use the `/api/v1` prefix. FastAPI generates the complete request/response reference at `/docs` and `/openapi.json`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness response for deployment checks |
| `GET` | `/dashboard` | Aggregated P&L, exposure, position, forecast, alert, and risk status |
| `GET` | `/trades` | List trades; optionally filter with `?market=` or `?status=` |
| `POST` | `/trades` | Validate and insert a trade; duplicate external IDs return HTTP 409 |
| `GET` | `/alerts` | List unacknowledged alerts; add `?include_acknowledged=true` for all |
| `POST` | `/alerts/{id}/acknowledge` | Mark an alert as handled |
| `GET` | `/forecasts/metrics` | Calculate accuracy and MAPE from forecast/realised observations |
| `POST` | `/reports/daily` | Generate a current operational report as JSON |

### Example requests

Check the aggregate dashboard:

```bash
curl http://127.0.0.1:8000/api/v1/dashboard
```

Create a trade:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/trades \
  -H 'Content-Type: application/json' \
  -d '{
    "external_id": "IMPORT-2001",
    "market": "GB Day-Ahead",
    "side": "buy",
    "quantity_mwh": 25,
    "price_gbp_mwh": 71.40,
    "delivery_start": "2026-07-29T18:00:00Z",
    "status": "open"
  }'
```

Acknowledge alert 1 and include it in a later audit query:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/alerts/1/acknowledge
curl 'http://127.0.0.1:8000/api/v1/alerts?include_acknowledged=true'
```

## Data model and calculations

* **Trades** are uniquely identified by `external_id`; side, positive energy quantity, non-negative price, delivery time, and lifecycle status are validated at the API boundary.
* **Gross exposure** is the sum of absolute trade notionals (`quantity_mwh × price_gbp_mwh`). **Net exposure** is buy notional minus sell notional.
* **Forecast accuracy** is `100 - MAPE`, based only on rows that have a realised price.
* **Alerts** remain available after acknowledgement for audit purposes, but the default query and dashboard count include only unacknowledged alerts.
* The demonstration P&L values are seeded placeholders. Production P&L must be calculated from validated executions, settlement prices, fees, currencies, and contract specifications.

## Tests and production build

Service tests use a temporary database and never touch the development database:

```bash
pytest -q
npm run build
```

## Suggested production roadmap

1. Add authenticated organisations/workspaces and role-based access.
2. Implement idempotent CSV/API ingestion with source-file lineage and rejected-row reporting.
3. Move persistence to Postgres and add schema migrations.
4. Model market-specific units, delivery periods, currencies, fees, and settlement revisions.
5. Add a reconciliation engine comparing orders, executions, positions, cash, and statements.
6. Calculate P&L from immutable ledger entries and validate it against known broker/market fixtures.
7. Queue scheduled reports and alerts using a worker rather than the API process.
8. Add audit logs, encrypted secrets, backups, observability, and retention policies before handling customer data.

Keep the product positioned as engineering, monitoring, and operational analytics. Obtain specialist legal advice before adding personalised recommendations, discretionary management, or order routing.
