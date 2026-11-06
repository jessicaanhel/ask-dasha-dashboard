"""
Dutch mortgage interest rates of ~40 lenders, from De Hypotheker.

This is the JSON endpoint behind
https://www.hypotheker.nl/en/mortgage-interest-rates/ (they update it daily).
"""

import requests

RATES_URL = "https://api.hypotheker.nl/v2/interestrates/hypotheekaanbieders/"

# Our loan type -> their HypotheekVorm
MORTGAGE_TYPES = {
    "annuity": "Annuiteitenhypotheek",
    "linear": "Lineaire_hypotheek",
}

# Fixed-rate periods in years; 0 means variable rate
FIXED_PERIODS = [0, 1, 5, 6, 7, 10, 15, 20, 30]

# RenteBasis: 0 = with NHG guarantee, otherwise loan-to-value tier in % (loan / market value)
RATE_BASES = [0, 50, 60, 70, 80, 90, 100, 106]


def get_mortgage_rates(loan_type="annuity", rate_basis=0, fixed_period=10):
    response = requests.get(
        RATES_URL,
        params={
            "HypotheekVorm": MORTGAGE_TYPES[loan_type],
            "IsNieuwbouw": "false",
            "RenteBasis": rate_basis,
            "EnergyLabel": "",
            "RentevastePeriode": fixed_period,
        },
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()

    products = []
    for product in data["producten"]:
        # Some lenders don't offer every fixed period
        if product.get("rentestand") is None:
            continue

        products.append(
            {
                "id": product["lookupId"],
                "provider": product["aanbiederNaam"],
                "product": product["hypotheekNaam"],
                "rate": product["rentestand"],
                "rates_by_period": [
                    {"period": item["period"], "rate": item["rate"]}
                    for item in product.get("rvpInterestRates", [])
                ],
            }
        )

    products.sort(key=lambda item: item["rate"])
    return {"updated_at": data.get("laatstBijgewerkt"), "products": products}


if __name__ == "__main__":
    for item in get_mortgage_rates()["products"][:5]:
        print(item["rate"], item["provider"], item["product"])
