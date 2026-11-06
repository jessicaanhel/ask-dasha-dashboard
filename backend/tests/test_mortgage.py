import pytest

from app import app
from services.mortgage import (
    add_sale_projection,
    build_schedule,
    monthly_annuity_payment,
    summarize,
    summarize_milestones,
)

LOAN = 420000
RATE = 0.041
WOZ = 450000


def test_annuity_payment_matches_known_value():
    # 420k at 4.1% over 30 years, same number as the original pandas script
    assert monthly_annuity_payment(LOAN, RATE, 30) == pytest.approx(2029.43, abs=0.01)


def test_annuity_pays_off_the_whole_loan():
    schedule = build_schedule(LOAN, RATE, 30, WOZ)

    assert len(schedule) == 360
    assert schedule[-1]["remaining_balance"] == 0
    assert sum(row["principal"] for row in schedule) == pytest.approx(LOAN, abs=1)


def test_linear_has_fixed_principal_and_falling_payment():
    schedule = build_schedule(LOAN, RATE, 30, WOZ, loan_type="linear")

    assert schedule[0]["principal"] == pytest.approx(LOAN / 360, abs=0.01)
    assert schedule[0]["payment"] > schedule[-1]["payment"]
    assert schedule[-1]["remaining_balance"] == 0


def test_extra_payment_pays_off_sooner_with_less_interest():
    normal = summarize(build_schedule(LOAN, RATE, 30, WOZ))
    with_extra = summarize(build_schedule(LOAN, RATE, 30, WOZ, extra_payment=475))

    # 20 yr 10 mo, same as the reference calculator screenshot
    assert with_extra["payoff_months"] == 250
    assert with_extra["total_interest"] < normal["total_interest"]


def test_tax_refund_never_negative():
    # Huge WOZ value: the eigenwoningforfait is bigger than the interest
    schedule = build_schedule(LOAN, RATE, 30, 10_000_000)

    assert all(row["tax_refund"] >= 0 for row in schedule)


def test_milestones_every_5_years_until_payoff():
    schedule = build_schedule(LOAN, RATE, 30, WOZ, loan_type="linear")
    milestones = summarize_milestones(schedule, LOAN)

    assert [m["months"] for m in milestones] == [60, 120, 180, 240, 300, 360]
    assert milestones[0]["principal_paid"] == pytest.approx(70000, abs=0.01)
    assert milestones[-1]["repaid_pct"] == 100.0


def test_sale_projection_profit_formula():
    schedule = build_schedule(LOAN, RATE, 30, WOZ)
    milestones = add_sale_projection(
        summarize_milestones(schedule, LOAN),
        LOAN,
        purchase_price=450000,
        price_growth=0.0,
        buying_costs_rate=0.0,
        selling_costs_rate=0.0,
    )
    first = milestones[0]

    # No growth and no costs: cash from sale is exactly the loan repaid + own money
    own_money = 450000 - LOAN
    assert first["cash_from_sale"] == pytest.approx(own_money + first["principal_paid"], abs=1)
    assert first["profit"] == pytest.approx(
        first["cash_from_sale"] - first["cash_put_in"], abs=0.01
    )


@pytest.fixture
def client():
    return app.test_client()


def test_api_rejects_bad_input(client):
    assert client.get("/api/mortgage?years=31").status_code == 400
    assert client.get("/api/mortgage?years=abc").status_code == 400
    assert client.get("/api/mortgage?loan_type=interest_only").status_code == 400


def test_api_returns_summary_and_milestones(client):
    response = client.get("/api/mortgage?extra_payment=475")
    data = response.get_json()

    assert response.status_code == 200
    assert data["summary"]["payoff_months"] == 250
    assert data["summary"]["months_saved"] == 110
    assert "profit" in data["milestones"][0]


def test_rates_api_rejects_bad_input(client):
    # Validated before any request to De Hypotheker is made
    assert client.get("/api/mortgage/rates?rate_basis=x").status_code == 400
    assert client.get("/api/mortgage/rates?fixed_period=3").status_code == 400
