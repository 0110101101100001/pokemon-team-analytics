"""Cliente Supabase em memória: cobre só a parte do query builder que o app usa."""

from types import SimpleNamespace
from typing import Any, Dict, List


class FakeQuery:
    def __init__(self, client: "FakeSupabase", rows: List[Dict[str, Any]]):
        self._client = client
        self._rows = rows
        self._columns: List[str] = []
        self._filters: List = []
        self._order = None
        self._limit = None
        self._range = None

    def select(self, columns: str):
        self._columns = [c.strip() for c in columns.split(",")]
        return self

    def eq(self, column: str, value):
        self._filters.append(lambda row: row.get(column) == value)
        return self

    def order(self, column: str, desc: bool = False):
        self._order = (column, desc)
        return self

    def limit(self, size: int):
        self._limit = size
        return self

    def range(self, start: int, end: int):
        self._range = (start, end)
        return self

    def execute(self):
        self._client.executed += 1
        rows = [row for row in self._rows if all(f(row) for f in self._filters)]
        if self._order:
            column, desc = self._order
            rows.sort(key=lambda row: row[column], reverse=desc)
        if self._range:
            start, end = self._range
            rows = rows[start:end + 1]
        if self._limit is not None:
            rows = rows[: self._limit]
        if self._columns != ["*"]:
            rows = [{c: row.get(c) for c in self._columns} for row in rows]
        return SimpleNamespace(data=rows)


class FakeSupabase:
    def __init__(self, rows: List[Dict[str, Any]]):
        self.rows = [{**row, "name_key": row["name"].lower()} for row in rows]
        self.executed = 0

    def table(self, _name: str) -> FakeQuery:
        return FakeQuery(self, self.rows)


def stats_row(name: str, tier: str, date: str, usage: float, teammates=None) -> Dict[str, Any]:
    return {
        "name": name,
        "tier": tier,
        "date": date,
        "raw_count": 100,
        "usage_percent": usage,
        "abilities": {},
        "items": {},
        "moves": {},
        "spreads": {},
        "tera_types": {},
        "teammates": teammates or {},
        "checks_and_counters": [],
    }
