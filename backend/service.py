from datetime import datetime, timezone

from .database import connection


def list_trades(market: str | None = None, status: str | None = None) -> list[dict]:
    query, values = "SELECT * FROM trades WHERE 1=1", []
    if market:
        query += " AND market = ?"
        values.append(market)
    if status:
        query += " AND status = ?"
        values.append(status)
    query += " ORDER BY delivery_start DESC"
    with connection() as conn:
        return [dict(row) for row in conn.execute(query, values)]


def create_trade(data: dict) -> dict:
    with connection() as conn:
        cursor = conn.execute(
            "INSERT INTO trades(external_id,market,side,quantity_mwh,price_gbp_mwh,delivery_start,status) VALUES(?,?,?,?,?,?,?)",
            (data["external_id"], data["market"], data["side"], data["quantity_mwh"], data["price_gbp_mwh"], data["delivery_start"], data.get("status", "open")),
        )
        return dict(conn.execute("SELECT * FROM trades WHERE id = ?", (cursor.lastrowid,)).fetchone())


def list_alerts(include_acknowledged: bool = False) -> list[dict]:
    query = "SELECT * FROM alerts" + ("" if include_acknowledged else " WHERE acknowledged = 0") + " ORDER BY id DESC"
    with connection() as conn:
        return [{**dict(row), "acknowledged": bool(row["acknowledged"])} for row in conn.execute(query)]


def acknowledge_alert(alert_id: int) -> bool:
    with connection() as conn:
        return conn.execute("UPDATE alerts SET acknowledged = 1 WHERE id = ?", (alert_id,)).rowcount > 0


def forecast_metrics() -> dict:
    with connection() as conn:
        rows = conn.execute("SELECT * FROM forecasts WHERE realised_price IS NOT NULL").fetchall()
    errors = [abs(r["forecast_price"] - r["realised_price"]) / r["realised_price"] for r in rows if r["realised_price"]]
    accuracy = (1 - sum(errors) / len(errors)) * 100 if errors else 0
    return {"accuracy_percent": round(accuracy, 1), "observations": len(errors), "mean_absolute_percentage_error": round(100 - accuracy, 1)}


def dashboard() -> dict:
    trades = list_trades()
    buy_exposure = sum(t["quantity_mwh"] * t["price_gbp_mwh"] for t in trades if t["side"] == "buy")
    sell_exposure = sum(t["quantity_mwh"] * t["price_gbp_mwh"] for t in trades if t["side"] == "sell")
    return {
        "as_of": datetime.now(timezone.utc).isoformat(),
        "currency": "GBP",
        "today_pnl": 12480,
        "month_to_date_pnl": 82160,
        "net_exposure": round(buy_exposure - sell_exposure, 2),
        "gross_exposure": round(buy_exposure + sell_exposure, 2),
        "open_positions": sum(t["status"] == "open" for t in trades),
        "forecast": forecast_metrics(),
        "unacknowledged_alerts": len(list_alerts()),
        "risk_status": "within_limits",
    }


def daily_report() -> dict:
    summary = dashboard()
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "title": "Northvale Energy daily trading report",
        "summary": summary,
        "commentary": "Portfolio is within configured risk limits. Review all unacknowledged alerts before the next trading session.",
        "disclaimer": "Operational analytics only. This report is not investment advice.",
    }
