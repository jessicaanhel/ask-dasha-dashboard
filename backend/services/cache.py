import time

_store = {}


def cached(key, ttl_seconds, fetch_fn):
    now = time.time()
    entry = _store.get(key)
    if entry and now - entry["time"] < ttl_seconds:
        return entry["value"]
    value = fetch_fn()
    _store[key] = {"time": now, "value": value}
    return value
