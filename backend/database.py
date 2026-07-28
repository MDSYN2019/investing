import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DEFAULT_DATABASE = Path(__file__).resolve().parent / "gridline.db"


def database_path() -> Path:
    return Path(os.getenv("GRIDLINE_DATABASE", DEFAULT_DATABASE))


@contextmanager
def connection():
    database = database_path()
    database.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(database)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def initialise_database() -> None:
    with connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                external_id TEXT NOT NULL UNIQUE,
                market TEXT NOT NULL,
                side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
                quantity_mwh REAL NOT NULL CHECK (quantity_mwh > 0),
                price_gbp_mwh REAL NOT NULL CHECK (price_gbp_mwh >= 0),
                delivery_start TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'open',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                severity TEXT NOT NULL,
                title TEXT NOT NULL,
                detail TEXT NOT NULL,
                acknowledged INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS forecasts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                market TEXT NOT NULL,
                period TEXT NOT NULL,
                forecast_price REAL NOT NULL,
                realised_price REAL,
                UNIQUE(market, period)
            );
            """
        )
        if conn.execute("SELECT COUNT(*) FROM trades").fetchone()[0] == 0:
            conn.executemany(
                "INSERT INTO trades(external_id,market,side,quantity_mwh,price_gbp_mwh,delivery_start,status) VALUES(?,?,?,?,?,?,?)",
                [
                    ("GL-1001", "GB Day-Ahead", "buy", 120, 74.20, "2026-07-28T18:00:00Z", "open"),
                    ("GL-1002", "GB Intraday", "sell", 80, 88.50, "2026-07-28T19:00:00Z", "open"),
                    ("GL-1003", "EPEX Spot", "sell", 45, 79.10, "2026-07-28T20:00:00Z", "settled"),
                ],
            )
        if conn.execute("SELECT COUNT(*) FROM alerts").fetchone()[0] == 0:
            conn.executemany(
                "INSERT INTO alerts(severity,title,detail) VALUES(?,?,?)",
                [
                    ("warning", "Forecast deviation above threshold", "GB Day-Ahead · Period 18:00–19:00"),
                    ("critical", "Missing settlement data", "EPEX Spot · 27 July"),
                    ("info", "Position nearing concentration limit", "GB Intraday · 46% of limit"),
                ],
            )
        if conn.execute("SELECT COUNT(*) FROM forecasts").fetchone()[0] == 0:
            conn.executemany(
                "INSERT INTO forecasts(market,period,forecast_price,realised_price) VALUES(?,?,?,?)",
                [
                    ("GB Day-Ahead", "2026-07-27T18:00:00Z", 81.2, 83.1),
                    ("GB Day-Ahead", "2026-07-27T19:00:00Z", 77.8, 75.4),
                    ("GB Intraday", "2026-07-27T20:00:00Z", 69.5, 73.2),
                ],
            )
