"""
Statistics per 4-digit postcode from CBS (Statistics Netherlands), served by PDOK.

Open data, licence CC-BY 4.0: https://service.pdok.nl/cbs/postcode4/{year}/wfs/v1_0
Each year is a separate service. CBS publishes the average WOZ value about 2 years later,
so the newest year usually has housing numbers but no WOZ value yet.
"""

from concurrent.futures import ThreadPoolExecutor

import requests

WFS_URL = "https://service.pdok.nl/cbs/postcode4/{year}/wfs/v1_0"
PLACE_URL = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free"

# 2015 is not available as a working service
YEARS = list(range(2016, 2025))

# CBS uses big negative numbers (e.g. -99995) for "secret" or "not available"
MISSING_BELOW = -99990

FIELDS = [
    "gemiddeldeWozWaardeWoning",
    "aantalWoningen",
    "percentageKoopwoningen",
    "percentageHuurwoningen",
    "aantalInwoners",
    "aantalWoningenBouwjaarVoor1945",
    "aantalWoningenBouwjaar45Tot65",
    "aantalWoningenBouwjaar65Tot75",
    "aantalWoningenBouwjaar75Tot85",
    "aantalWoningenBouwjaar85Tot95",
    "aantalWoningenBouwjaar95Tot05",
    "aantalWoningenBouwjaar05Tot15",
    "aantalWoningenBouwjaar15EnLater",
    "aantalMeergezinsWoningen",
    "gemiddeldGasverbruikWoning",
    "gemiddeldElektriciteitsverbruikWoning",
]

BUILD_PERIODS = [
    ("before 1945", "aantalWoningenBouwjaarVoor1945"),
    ("1945–1964", "aantalWoningenBouwjaar45Tot65"),
    ("1965–1974", "aantalWoningenBouwjaar65Tot75"),
    ("1975–1984", "aantalWoningenBouwjaar75Tot85"),
    ("1985–1994", "aantalWoningenBouwjaar85Tot95"),
    ("1995–2004", "aantalWoningenBouwjaar95Tot05"),
    ("2005–2014", "aantalWoningenBouwjaar05Tot15"),
    ("2015 and later", "aantalWoningenBouwjaar15EnLater"),
]


def clean(value):
    if value is None or (isinstance(value, (int, float)) and value <= MISSING_BELOW):
        return None
    return value


def fetch_year(postcode, year):
    """One year's numbers for one postcode, or None if CBS has no row for it."""
    postcode_filter = (
        "<Filter><PropertyIsEqualTo><PropertyName>postcode</PropertyName>"
        f"<Literal>{postcode}</Literal></PropertyIsEqualTo></Filter>"
    )
    try:
        response = requests.get(
            WFS_URL.format(year=year),
            params={
                "service": "WFS",
                "version": "2.0.0",
                "request": "GetFeature",
                "typeNames": "postcode4:postcode4",
                "outputFormat": "application/json",
                "count": 1,
                "propertyName": ",".join(["postcode", *FIELDS]),
                "filter": postcode_filter,
            },
            timeout=15,
        )
        response.raise_for_status()
        features = response.json().get("features", [])
    except (requests.RequestException, ValueError):
        # One broken year shouldn't break the whole lookup
        return None

    if not features:
        return None
    properties = features[0]["properties"]
    return {field: clean(properties.get(field)) for field in FIELDS}


def fetch_place(postcode):
    try:
        response = requests.get(
            PLACE_URL,
            params={
                "q": postcode,
                "fq": "type:postcode",
                "rows": 1,
                "fl": "woonplaatsnaam,gemeentenaam,gemeentecode",
            },
            timeout=10,
        )
        response.raise_for_status()
        docs = response.json()["response"]["docs"]
    except (requests.RequestException, ValueError, KeyError):
        return None, None, None
    if not docs:
        return None, None, None
    doc = docs[0]
    return doc.get("woonplaatsnaam"), doc.get("gemeentenaam"), doc.get("gemeentecode")


def yearly_growth_pct(first_value, last_value, years):
    if not first_value or not last_value or years <= 0:
        return None
    return round(((last_value / first_value) ** (1 / years) - 1) * 100, 1)


def get_postcode_stats(postcode):
    """
    Average WOZ value history and housing facts for a 4-digit postcode.
    Returns None when CBS has no data for that postcode at all.
    """
    # 9 yearly services: ask them at the same time instead of one after another
    with ThreadPoolExecutor(max_workers=len(YEARS) + 1) as pool:
        year_futures = {year: pool.submit(fetch_year, postcode, year) for year in YEARS}
        place_future = pool.submit(fetch_place, postcode)
        by_year = {year: future.result() for year, future in year_futures.items()}
        place, municipality, municipality_code = place_future.result()

    available = {year: row for year, row in by_year.items() if row}
    if not available:
        return None

    # CBS gives the WOZ value in thousands of euro
    woz_history = [
        {"year": year, "avg_woz": row["gemiddeldeWozWaardeWoning"] * 1000}
        for year, row in sorted(available.items())
        if row["gemiddeldeWozWaardeWoning"] is not None
    ]

    growth = None
    if len(woz_history) >= 2:
        first, last = woz_history[0], woz_history[-1]
        previous = woz_history[-2]
        growth = {
            "from_year": first["year"],
            "to_year": last["year"],
            "avg_yearly_pct": yearly_growth_pct(
                first["avg_woz"], last["avg_woz"], last["year"] - first["year"]
            ),
            "last_year_pct": yearly_growth_pct(previous["avg_woz"], last["avg_woz"], 1),
        }

    # Not every number is published every year, so take each from the newest year that has it
    def newest(field):
        for year in sorted(available, reverse=True):
            if available[year][field] is not None:
                return available[year][field]
        return None

    latest_year = max(available)
    latest = available[latest_year]
    build_years = [
        {"period": label, "homes": latest[field]}
        for label, field in BUILD_PERIODS
        if latest[field] is not None
    ]

    return {
        "postcode": postcode,
        "place": place,
        "municipality": municipality,
        "municipality_code": municipality_code,
        "woz_history": woz_history,
        "growth": growth,
        "facts": {
            "year": latest_year,
            "homes": newest("aantalWoningen"),
            "residents": newest("aantalInwoners"),
            "owner_occupied_pct": newest("percentageKoopwoningen"),
            "rented_pct": newest("percentageHuurwoningen"),
            "apartments": newest("aantalMeergezinsWoningen"),
            "avg_gas_m3": newest("gemiddeldGasverbruikWoning"),
            "avg_electricity_kwh": newest("gemiddeldElektriciteitsverbruikWoning"),
            "build_years": build_years,
        },
        "source": "CBS postcode statistics via PDOK (CC-BY 4.0)",
    }


if __name__ == "__main__":
    import json

    print(json.dumps(get_postcode_stats("1062"), indent=2))
