"""서울시 웹 검색 응답의 일회 검증. DB 저장·반복 실행·화면 연결은 하지 않는다.

python3 scripts/probe_seoul_parking.py --input /private/tmp/parking-seoul-dong-responses.json
python3 scripts/probe_seoul_parking.py --fetch --output /private/tmp/seoul-probe-report.json
"""
import argparse
import datetime as dt
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
URL = "https://parking.seoul.go.kr/search/parking/list.do"
KST = dt.timezone(dt.timedelta(hours=9))
FIELDS = ("parking_code", "parking_name", "address", "capacity", "cur_parking",
          "que_status", "que_status_nm", "cur_parking_time", "sync_time")


def address_key(value):
    match = re.search(r"성수동[12]가\s+\d+(?:-\d+)?(?![\d-])", value or "")
    return re.sub(r"\s+", "", match.group()) if match else None


def assess(row, fetched_at):
    # que_status_nm은 시간 구간 표시다. 수집 주기로 해석하지 않는다.
    status = str(row.get("que_status", ""))
    if status != "1":
        return {"decision": "SOURCE_UNAVAILABLE" if status in {"0", "2", "3"}
                else "UNKNOWN_SOURCE_STATUS", "available_spaces": None}
    try:
        # int(float(...))로 소수·누락을 정상 숫자로 바꾸지 않는다.
        total, parked = (int(str(row[k])) for k in ("capacity", "cur_parking"))
        if total < 1 or parked < 0 or parked > total:
            raise ValueError("count bounds")
    except (ValueError, TypeError, KeyError):
        return {"decision": "INVALID_COUNTS", "available_spaces": None}
    result = {"total_spaces": total, "available_spaces": total - parked}
    stamp = row.get("cur_parking_time")
    if not stamp:
        return {**result, "decision": "SOURCE_TIME_MISSING", "source_updated_at": None}
    try:
        # 원천 문자열에 시간대가 없어, 서울 지역 서비스의 KST로 가정한 검증값이다.
        source = dt.datetime.strptime(stamp, "%Y-%m-%d %H:%M:%S").replace(tzinfo=KST)
        fetched = dt.datetime.fromisoformat(fetched_at)
        if fetched.tzinfo is None or source > fetched:
            raise ValueError("future source time or missing fetch timezone")
    except (ValueError, TypeError):
        return {"decision": "INVALID_TIME", "available_spaces": None}
    age = (fetched - source).total_seconds() / 60
    return {**result, "decision": "FRESH" if age <= 20 else "STALE",
            "source_updated_at": source.astimezone(dt.timezone.utc).isoformat(),
            "age_minutes": round(age, 2)}


def fetch_once():
    batches = []
    for dong in ("성수동1가", "성수동2가"):
        started_at = dt.datetime.now(dt.timezone.utc).isoformat()
        data = {"Gu": "성동구", "Dong": dong, "Keyword": "", "index": 1,
                "Type": 63, "Rule": 0}
        req = urllib.request.Request(URL, data=urllib.parse.urlencode(data).encode(),
            headers={"Referer": "https://parking.seoul.go.kr/",
                     "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                     "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=20) as response:
            body = json.load(response)
        if body.get("result_state") != "0000":
            raise ValueError("Source result_state was not 0000")
        batches.append({"request": data, "response": body, "started_at": started_at,
                        "fetched_at": dt.datetime.now(dt.timezone.utc).isoformat()})
    return batches


def report(batches):
    lots = json.loads((ROOT / "prototype/data/parking.json").read_text())["lots"]
    candidates = {}
    for batch in batches:
        for row in batch["response"]["res_value"]["parking_list"]:
            key = address_key(row.get("address"))
            if key:
                candidates.setdefault(key, {})[row["parking_code"]] = (
                    row, batch["fetched_at"], batch.get("started_at"))
    targets = []
    for lot in lots:
        hits = list(candidates.get(address_key(lot["address"]), {}).values())
        targets.append({"parking_id": lot["id"], "user_name": lot["name"],
                        "user_address": lot["address"],
                        "identity_review": "AMBIGUOUS" if len(hits) > 1 else
                        "CANDIDATE_ONLY" if hits else "NOT_FOUND",
                        "candidates": [{"source_fields": {k: r.get(k) for k in FIELDS},
                                        "started_at": s,
                                        "fetched_at": t, "assessment": assess(r, t)}
                                       for r, t, s in hits]})
    return {"purpose": "ONE_OFF_FEASIBILITY_PROBE_NOT_OPERATIONAL",
            "source": URL, "timezone_assumption": "Asia/Seoul for offset-free cur_parking_time",
            "identity_policy": "주소 일치는 후보 추출에만 사용; 동일 시설 확정 등록은 미실행",
            "batches": [{"request": b["request"], "started_at": b.get("started_at"),
                         "fetched_at": b["fetched_at"],
                         "returned_rows": len(b["response"]["res_value"]["parking_list"])}
                        for b in batches], "targets": targets}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--input", type=Path)
    group.add_argument("--fetch", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    batches = fetch_once() if args.fetch else json.loads(args.input.read_text())
    result = report(batches)
    if args.output:
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    for target in result["targets"]:
        parts = [f'{c["source_fields"]["parking_code"]}: '
                 f'{c["assessment"]["decision"]}, '
                 f'가능 {c["assessment"]["available_spaces"]}' for c in target["candidates"]]
        print(target["user_name"], target["identity_review"], " / ".join(parts))


if __name__ == "__main__":
    main()
