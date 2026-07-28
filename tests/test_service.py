import os
import tempfile

import pytest

from backend.database import initialise_database
from backend.service import acknowledge_alert, create_trade, dashboard, forecast_metrics, list_alerts, list_trades


@pytest.fixture(autouse=True)
def isolated_database():
    with tempfile.TemporaryDirectory() as directory:
        os.environ["GRIDLINE_DATABASE"] = f"{directory}/test.db"
        initialise_database()
        yield
        os.environ.pop("GRIDLINE_DATABASE", None)


def test_seeded_dashboard_has_operational_metrics():
    result = dashboard()
    assert result["open_positions"] == 2
    assert result["unacknowledged_alerts"] == 3
    assert result["risk_status"] == "within_limits"
    assert result["forecast"]["accuracy_percent"] > 90


def test_create_and_filter_trade():
    create_trade({"external_id": "TEST-1", "market": "Nord Pool", "side": "buy", "quantity_mwh": 10, "price_gbp_mwh": 51.5, "delivery_start": "2026-08-01T12:00:00Z", "status": "open"})
    trades = list_trades(market="Nord Pool")
    assert len(trades) == 1
    assert trades[0]["external_id"] == "TEST-1"


def test_acknowledge_removes_alert_from_default_view():
    alert_id = list_alerts()[0]["id"]
    assert acknowledge_alert(alert_id)
    assert len(list_alerts()) == 2
    assert len(list_alerts(include_acknowledged=True)) == 3


def test_forecast_metrics_are_derived_from_observations():
    result = forecast_metrics()
    assert result["observations"] == 3
    assert result["mean_absolute_percentage_error"] == pytest.approx(3.5, abs=0.1)
