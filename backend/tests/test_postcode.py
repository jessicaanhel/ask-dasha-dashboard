import pytest

from app import app
from scrapers.cbs_house_prices import growth_over, municipality_key
from scrapers.cbs_postcode import clean, yearly_growth_pct


def test_cbs_missing_markers_become_none():
    assert clean(-99995) is None
    assert clean(-99997.0) is None
    assert clean(None) is None
    assert clean(0) == 0
    assert clean(548) == 548


def test_yearly_growth_is_compound_not_simple():
    # 100k -> 121k in 2 years is 10% a year (not 10.5%)
    assert yearly_growth_pct(100000, 121000, 2) == 10.0
    assert yearly_growth_pct(None, 121000, 2) is None
    assert yearly_growth_pct(100000, 121000, 0) is None


@pytest.mark.parametrize("postcode", ["", "abc", "0999", "12"])
def test_postcode_api_rejects_bad_input(postcode):
    # Validated before any request to CBS is made
    response = app.test_client().get(f"/api/mortgage/postcode?postcode={postcode}")
    assert response.status_code == 400


def test_sale_price_growth_over_last_n_years():
    prices = [{"year": 2020 + i, "avg_price": 100000 * 1.1**i} for i in range(6)]

    assert growth_over(prices, 5) == 10.0
    assert growth_over(prices, 10) is None  # not enough years
    assert municipality_key("0363") == "GM0363"
