import json
from datetime import datetime


def normalize_value(value):

    if value is None:
        return None

    if isinstance(value, (list, dict)):
        return json.dumps(value)

    if isinstance(value, datetime):
        return value.isoformat()

    return value