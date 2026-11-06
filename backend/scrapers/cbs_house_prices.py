"""
Average sale price of existing homes per year, for the Netherlands and per municipality.

CBS table 83625NED "Bestaande koopwoningen; gemiddelde verkoopprijzen, regio" (1995 onwards),
open data: https://opendata.cbs.nl/ODataApi/odata/83625NED
These are real sale prices (from the Kadaster), so they are a better base for
"how fast do prices grow here" than WOZ values.
"""

import requests

DATA_URL = "https://opendata.cbs.nl/ODataApi/odata/83625NED/TypedDataSet"

NETHERLANDS = "NL01"


def municipality_key(gemeentecode):
    """'0363' (from the PDOK location server) -> 'GM0363' (CBS region key)."""
    return f"GM{gemeentecode}"


def get_sale_prices(region_key):
    """[{year, avg_price}] oldest first; empty list if CBS has nothing for the region."""
    response = requests.get(
        DATA_URL,
        params={
            "$format": "json",
            # Region keys are padded with spaces in CBS ("NL01  "), so match the start.
            # "JJ00" periods are whole years (the table also has quarters and months).
            "$filter": (f"startswith(RegioS,'{region_key}') and substring(Perioden,4,4) eq 'JJ00'"),
            "$select": "Perioden,GemiddeldeVerkoopprijs_1",
        },
        timeout=15,
    )
    response.raise_for_status()

    prices = []
    for row in response.json()["value"]:
        price = row.get("GemiddeldeVerkoopprijs_1")
        if price:
            prices.append({"year": int(row["Perioden"][:4]), "avg_price": price})
    return sorted(prices, key=lambda item: item["year"])


def growth_over(prices, years):
    """Average yearly growth (compound, in %) over the last N years, or None if too short."""
    if len(prices) <= years:
        return None
    start, end = prices[-1 - years], prices[-1]
    return round(((end["avg_price"] / start["avg_price"]) ** (1 / years) - 1) * 100, 1)


def summarize_prices(prices):
    if not prices:
        return None
    return {
        "latest_year": prices[-1]["year"],
        "latest_price": prices[-1]["avg_price"],
        "growth_5y_pct": growth_over(prices, 5),
        "growth_10y_pct": growth_over(prices, 10),
        "history": prices,
    }


if __name__ == "__main__":
    for key in (NETHERLANDS, "GM0363"):
        summary = summarize_prices(get_sale_prices(key))
        print(key, {k: v for k, v in summary.items() if k != "history"})
