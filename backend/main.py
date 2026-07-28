import sqlite3
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .database import initialise_database
from .service import acknowledge_alert, create_trade, daily_report, dashboard, forecast_metrics, list_alerts, list_trades


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialise_database()
    yield


app = FastAPI(title="Gridline API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TradeCreate(BaseModel):
    external_id: str = Field(min_length=1, max_length=80)
    market: str = Field(min_length=1, max_length=100)
    side: Literal["buy", "sell"]
    quantity_mwh: float = Field(gt=0)
    price_gbp_mwh: float = Field(ge=0)
    delivery_start: str
    status: Literal["open", "settled", "cancelled"] = "open"


@app.get("/api/v1/health", tags=["system"])
def health():
    return {"status": "ok"}


@app.get("/api/v1/dashboard", tags=["analytics"])
def get_dashboard():
    return dashboard()


@app.get("/api/v1/trades", tags=["trades"])
def get_trades(market: str | None = None, trade_status: str | None = Query(None, alias="status")):
    return {"items": list_trades(market, trade_status)}


@app.post("/api/v1/trades", tags=["trades"], status_code=status.HTTP_201_CREATED)
def post_trade(trade: TradeCreate):
    try:
        return create_trade(trade.model_dump())
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=409, detail="A trade with that external_id already exists") from error


@app.get("/api/v1/alerts", tags=["monitoring"])
def get_alerts(include_acknowledged: bool = False):
    return {"items": list_alerts(include_acknowledged)}


@app.post("/api/v1/alerts/{alert_id}/acknowledge", tags=["monitoring"])
def post_acknowledge_alert(alert_id: int):
    if not acknowledge_alert(alert_id):
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"id": alert_id, "acknowledged": True}


@app.get("/api/v1/forecasts/metrics", tags=["analytics"])
def get_forecast_metrics():
    return forecast_metrics()


@app.post("/api/v1/reports/daily", tags=["reports"])
def post_daily_report():
    return daily_report()
