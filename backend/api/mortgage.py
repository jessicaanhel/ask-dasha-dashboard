import requests
from flask import Blueprint, jsonify, request

from scrapers.cbs_house_prices import (
    NETHERLANDS,
    get_sale_prices,
    municipality_key,
    summarize_prices,
)
from scrapers.cbs_postcode import get_postcode_stats
from scrapers.hypotheker import FIXED_PERIODS, RATE_BASES, get_mortgage_rates
from services.cache import cached
from services.mortgage import (
    DEFAULT_TAX_RATE,
    LOAN_TYPES,
    add_sale_projection,
    build_schedule,
    summarize,
    summarize_by_year,
    summarize_milestones,
)
from services.response import data_response

mortgage_bp = Blueprint("mortgage", __name__)

# name -> (default, min, max); all amounts in EUR
PARAMS = {
    "loan_amount": (420000, 1000, 5000000),
    "interest_rate": (0.041, 0, 0.2),
    # Dutch mortgage interest is only deductible for 30 years
    "years": (30, 1, 30),
    "woz_value": (450000, 0, 10000000),
    "tax_rate": (DEFAULT_TAX_RATE, 0, 0.6),
    "extra_payment": (0, 0, 100000),
    # Only used for the "if I sell after N years" projection
    "purchase_price": (450000, 0, 10000000),
    "price_growth": (0.03, -0.2, 0.3),
    # Transfer tax (2%, 0% for starters) + notary, valuation and advice
    "buying_costs": (0.04, 0, 0.2),
    # Estate agent and notary when selling
    "selling_costs": (0.015, 0, 0.2),
}


def read_params():
    values = {}

    for name, (default, minimum, maximum) in PARAMS.items():
        error_message = f"'{name}' must be a number between {minimum} and {maximum}"

        # Not using request.args.get(type=float): it silently falls back to the default on bad input
        raw_value = request.args.get(name)
        try:
            value = default if raw_value is None else float(raw_value)
        except ValueError:
            raise ValueError(error_message)

        if not minimum <= value <= maximum:
            raise ValueError(error_message)
        values[name] = value

    values["years"] = int(values["years"])

    loan_type = request.args.get("loan_type", "annuity")
    if loan_type not in LOAN_TYPES:
        raise ValueError(f"'loan_type' must be one of: {', '.join(LOAN_TYPES)}")
    values["loan_type"] = loan_type

    return values


def schedule_for(params, extra_payment):
    return build_schedule(
        params["loan_amount"],
        params["interest_rate"],
        params["years"],
        params["woz_value"],
        params["tax_rate"],
        extra_payment,
        params["loan_type"],
    )


@mortgage_bp.route("/api/mortgage")
def mortgage():
    try:
        params = read_params()
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    schedule = schedule_for(params, params["extra_payment"])
    summary = summarize(schedule)
    summary["first_net_payment"] = schedule[0]["net_payment"]
    summary["last_payment"] = schedule[-1]["payment"]
    summary["last_net_payment"] = schedule[-1]["net_payment"]

    # Same loan without the extra payment, to show what the extra saves
    if params["extra_payment"] > 0:
        baseline = summarize(schedule_for(params, 0))
        summary["interest_saved"] = round(baseline["total_interest"] - summary["total_interest"], 2)
        summary["months_saved"] = baseline["payoff_months"] - summary["payoff_months"]
    else:
        summary["interest_saved"] = 0
        summary["months_saved"] = 0

    return data_response(
        {
            "params": params,
            "summary": summary,
            "yearly": summarize_by_year(schedule),
            "milestones": add_sale_projection(
                summarize_milestones(schedule, params["loan_amount"]),
                params["loan_amount"],
                params["purchase_price"],
                params["price_growth"],
                params["buying_costs"],
                params["selling_costs"],
            ),
        },
        "live",
    )


# Rates change once a day, so there's no point asking more often
RATES_CACHE_SECONDS = 3 * 3600


@mortgage_bp.route("/api/mortgage/rates")
def bank_rates():
    # Compared as strings, so bad input like "x" is rejected instead of falling back to a default
    loan_type = request.args.get("loan_type", "annuity")
    rate_basis = request.args.get("rate_basis", "0")
    fixed_period = request.args.get("fixed_period", "10")

    if loan_type not in LOAN_TYPES:
        return jsonify({"error": f"'loan_type' must be one of: {', '.join(LOAN_TYPES)}"}), 400
    if rate_basis not in [str(value) for value in RATE_BASES]:
        return jsonify({"error": f"'rate_basis' must be one of: {RATE_BASES}"}), 400
    if fixed_period not in [str(value) for value in FIXED_PERIODS]:
        return jsonify({"error": f"'fixed_period' must be one of: {FIXED_PERIODS}"}), 400
    rate_basis = int(rate_basis)
    fixed_period = int(fixed_period)

    try:
        payload = cached(
            f"mortgage_rates:{loan_type}:{rate_basis}:{fixed_period}",
            RATES_CACHE_SECONDS,
            lambda: get_mortgage_rates(loan_type, rate_basis, fixed_period),
        )
    except (requests.RequestException, KeyError, ValueError):
        # No mock fallback on purpose: made-up bank rates would be misleading here
        return jsonify({"error": "Could not load mortgage rates from De Hypotheker"}), 502

    return data_response(payload, "live")


# CBS updates these numbers once a year
POSTCODE_CACHE_SECONDS = 24 * 3600


@mortgage_bp.route("/api/mortgage/postcode")
def postcode_stats():
    # Accepts "1062", "1062KT" or "1062 kt"; CBS statistics are per 4-digit postcode
    raw = request.args.get("postcode", "").replace(" ", "")
    digits = raw[:4]
    if not (digits.isdigit() and 1000 <= int(digits) <= 9999):
        return jsonify({"error": "Enter a Dutch postcode, e.g. 1062 or 1062KT"}), 400

    stats = cached(
        f"postcode_stats:{digits}",
        POSTCODE_CACHE_SECONDS,
        lambda: get_postcode_stats(digits),
    )
    if stats is None:
        return jsonify({"error": f"No CBS data found for postcode {digits}"}), 404

    # Real sale price growth for the whole country and the city, to compare with the postcode
    stats = {
        **stats,
        "sale_prices": {
            "netherlands": sale_price_summary(NETHERLANDS),
            "municipality": (
                sale_price_summary(municipality_key(stats["municipality_code"]))
                if stats.get("municipality_code")
                else None
            ),
        },
    }
    return data_response(stats, "live")


def sale_price_summary(region_key):
    try:
        prices = cached(
            f"sale_prices:{region_key}",
            POSTCODE_CACHE_SECONDS,
            lambda: get_sale_prices(region_key),
        )
    except (requests.RequestException, KeyError, ValueError):
        # Postcode stats are still useful without the price comparison
        return None
    return summarize_prices(prices)
