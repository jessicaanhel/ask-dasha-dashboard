"""Annuity mortgage schedule with the Dutch mortgage interest deduction (hypotheekrenteaftrek)."""

# Maximum deduction rate for mortgage interest in 2026
DEFAULT_TAX_RATE = 0.3756

# Eigenwoningforfait: yearly notional income of 0.35% of the WOZ value
# (applies to homes between ~75k and ~1.3M EUR WOZ value in 2026)
EIGENWONINGFORFAIT_RATE = 0.0035

# annuity: same total payment every month (interest part shrinks, principal part grows)
# linear: same principal every month, so the total payment starts high and goes down
LOAN_TYPES = ("annuity", "linear")


def monthly_annuity_payment(loan_amount, annual_interest_rate, years):
    months = years * 12
    monthly_rate = annual_interest_rate / 12

    if monthly_rate == 0:
        return loan_amount / months

    growth = (1 + monthly_rate) ** months
    return loan_amount * monthly_rate * growth / (growth - 1)


def build_schedule(
    loan_amount,
    annual_interest_rate,
    years,
    woz_value,
    tax_rate=DEFAULT_TAX_RATE,
    extra_payment=0,
    loan_type="annuity",
):
    """
    Returns one row per month with payment, interest, principal, tax refund and net payment.

    extra_payment is paid on top of the annuity every month and goes fully to principal,
    so the loan is paid off earlier. The schedule stops at the month the balance hits zero.

    The real tax refund is settled yearly (or via voorlopige aanslag), so the monthly
    refund here is an estimate: the eigenwoningforfait is spread evenly over 12 months
    and lowers the deductible interest.
    """
    months = years * 12
    monthly_rate = annual_interest_rate / 12
    annuity_payment = monthly_annuity_payment(loan_amount, annual_interest_rate, years)
    linear_principal = loan_amount / months
    monthly_forfait = woz_value * EIGENWONINGFORFAIT_RATE / 12

    remaining_balance = loan_amount
    schedule = []

    for month in range(1, months + 1):
        interest = remaining_balance * monthly_rate

        if loan_type == "linear":
            scheduled_principal = linear_principal
        else:
            scheduled_principal = annuity_payment - interest

        # The last payment is usually smaller: never pay more principal than is left
        principal = min(scheduled_principal + extra_payment, remaining_balance)
        payment = interest + principal

        # The refund can't go negative: below that point the forfait is simply not deducted
        tax_refund = max(0, (interest - monthly_forfait) * tax_rate)
        net_payment = payment - tax_refund
        remaining_balance -= principal

        schedule.append(
            {
                "month": month,
                "payment": round(payment, 2),
                "interest": round(interest, 2),
                "principal": round(principal, 2),
                "tax_refund": round(tax_refund, 2),
                "net_payment": round(net_payment, 2),
                "remaining_balance": round(max(0, remaining_balance), 2),
            }
        )

        # Small epsilon so float rounding doesn't leave a 0.0001 cent month at the end
        if remaining_balance < 0.005:
            break

    return schedule


def summarize_by_year(schedule):
    years = []

    for start in range(0, len(schedule), 12):
        year_rows = schedule[start : start + 12]
        net_paid = sum(row["net_payment"] for row in year_rows)
        years.append(
            {
                "year": start // 12 + 1,
                "months": len(year_rows),
                "paid": round(sum(row["payment"] for row in year_rows), 2),
                "interest_paid": round(sum(row["interest"] for row in year_rows), 2),
                "principal_paid": round(sum(row["principal"] for row in year_rows), 2),
                "tax_refund": round(sum(row["tax_refund"] for row in year_rows), 2),
                "net_paid": round(net_paid, 2),
                "avg_net_payment": round(net_paid / len(year_rows), 2),
                "remaining_balance": year_rows[-1]["remaining_balance"],
            }
        )

    return years


def summarize_milestones(schedule, loan_amount, every_years=5):
    """
    Totals after 5, 10, 15... years: how much of the loan is repaid vs how much went to interest.
    Stops at the payoff year; that last row is the full loan.
    """
    milestones = []
    payoff_months = len(schedule)
    years = every_years

    while True:
        months = min(years * 12, payoff_months)
        rows = schedule[:months]
        interest_paid = sum(row["interest"] for row in rows)
        tax_refund = sum(row["tax_refund"] for row in rows)
        net_paid = sum(row["net_payment"] for row in rows)
        # Not summing the rounded monthly principals: that drifts by a few euro over the years
        principal_paid = loan_amount - rows[-1]["remaining_balance"]

        milestones.append(
            {
                "months": months,
                "principal_paid": round(principal_paid, 2),
                "interest_paid": round(interest_paid, 2),
                "tax_refund": round(tax_refund, 2),
                "net_interest": round(interest_paid - tax_refund, 2),
                "total_paid": round(principal_paid + interest_paid, 2),
                "net_paid": round(net_paid, 2),
                "repaid_pct": round(principal_paid / loan_amount * 100, 1),
                "remaining_balance": rows[-1]["remaining_balance"],
            }
        )

        if months >= payoff_months:
            return milestones
        years += every_years


def add_sale_projection(
    milestones, loan_amount, purchase_price, price_growth, buying_costs_rate, selling_costs_rate
):
    """
    What you'd end up with if you sold the house at each milestone.

    profit = what you get from the sale (price - selling costs - remaining loan)
             - everything you put in (own money at purchase + all net monthly payments)

    Rent you would have paid otherwise is not part of this, so a small loss can still
    be better than renting.
    """
    # Cash needed at purchase: the part of the price + buying costs the loan doesn't cover.
    # Not clamped at 0: if the loan is bigger than that, the extra cash is real money too.
    own_money = purchase_price * (1 + buying_costs_rate) - loan_amount

    for milestone in milestones:
        years_owned = milestone["months"] / 12
        sale_price = purchase_price * (1 + price_growth) ** years_owned
        selling_costs = sale_price * selling_costs_rate
        cash_from_sale = sale_price - selling_costs - milestone["remaining_balance"]
        cash_put_in = own_money + milestone["net_paid"]

        milestone["sale_price"] = round(sale_price, 2)
        milestone["selling_costs"] = round(selling_costs, 2)
        milestone["cash_from_sale"] = round(cash_from_sale, 2)
        milestone["cash_put_in"] = round(cash_put_in, 2)
        milestone["profit"] = round(cash_from_sale - cash_put_in, 2)

    return milestones


def summarize(schedule):
    return {
        "payoff_months": len(schedule),
        "first_payment": schedule[0]["payment"],
        "total_interest": round(sum(row["interest"] for row in schedule), 2),
        "total_paid": round(sum(row["payment"] for row in schedule), 2),
        "total_tax_refund": round(sum(row["tax_refund"] for row in schedule), 2),
        "total_net_paid": round(sum(row["net_payment"] for row in schedule), 2),
    }
