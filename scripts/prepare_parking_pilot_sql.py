"""일회 실제 응답 보고서에서 첫 4개 시설의 저장 SQL을 준비한다. DB에 접속하지 않는다.

python3 scripts/prepare_parking_pilot_sql.py --input /private/tmp/parking-supabase-pilot-source.json --output /private/tmp/parking-pilot-insert.sql
"""
import argparse
import datetime as dt
import json
from pathlib import Path
import uuid

TARGETS = {
    "강변 공영주차장": "172144",
    "성수2가1동 공영주차장": "172134",
    "서울숲아이티밸리": "1367373",
    "갤러리아포레 더몰 상가": "3204785",
}


def literal(value):
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def prepare(report):
    statements = ["-- 실제 응답의 일회 저장. 자동 수집기·일정은 만들지 않는다.", "begin;"]
    summary = []
    for name, source_id in TARGETS.items():
        lot = next(t for t in report["targets"] if t["user_name"] == name)
        matches = [c for c in lot["candidates"] if c["source_fields"]["parking_code"] == source_id]
        if len(matches) != 1:
            raise ValueError(f"원천 코드 후보가 달라짐: {name}")
        c = matches[0]
        a = c["assessment"]
        if a["decision"] != "FRESH" or c["source_fields"]["que_status"] != "1":
            raise ValueError(f"첫 저장은 정상·최신 응답만 허용: {name}")
        if not c.get("started_at"):
            raise ValueError("수집 시작 시각이 있는 새 보고서가 필요함")
        if dt.datetime.fromisoformat(c["started_at"]) > dt.datetime.fromisoformat(c["fetched_at"]):
            raise ValueError("수집 시작·종료 시각 순서 오류")
        parking_id = str(uuid.UUID(lot["parking_id"]))
        attempt_id, observation_id = str(uuid.uuid4()), str(uuid.uuid4())
        values = [parking_id, name, lot["user_address"], "seoul_parking_web", source_id]
        statements.append("insert into public.parking_lots (id,name,address,source,source_parking_id) values ("
                          + ",".join(map(literal, values)) + ") on conflict (id) do nothing;")
        statements.append("do $guard$ begin if not exists (select 1 from public.parking_lots where id="
                          + literal(parking_id) + " and source='seoul_parking_web' and source_parking_id="
                          + literal(source_id) + ") then raise exception '기존 시설 연결과 충돌'; end if; end $guard$;")
        statements.append("insert into public.parking_collection_attempts "
                          "(id,parking_id,started_at,finished_at,result_status) values ("
                          + ",".join(map(literal, [attempt_id, parking_id, c["started_at"],
                                                    c["fetched_at"], "SUCCESS"])) + ");")
        statements.append("insert into public.parking_observations "
                          "(id,parking_id,total_spaces,available_spaces,source_updated_at,collected_at,quality_status,collection_attempt_id) values ("
                          + ",".join(map(literal, [observation_id, parking_id, a["total_spaces"],
                                                    a["available_spaces"], a["source_updated_at"],
                                                    c["fetched_at"], "VALID", attempt_id])) + ");")
        summary.append({"parking_id": parking_id, "name": name, "source_parking_id": source_id,
                        "attempt_id": attempt_id, "observation_id": observation_id,
                        "total_spaces": a["total_spaces"], "available_spaces": a["available_spaces"],
                        "source_updated_at": a["source_updated_at"], "collected_at": c["fetched_at"]})
    statements.extend(["commit;", "select name,source_parking_id from public.parking_lots order by name;"])
    return "\n\n".join(statements) + "\n", summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    sql, summary = prepare(json.loads(args.input.read_text()))
    args.output.write_text(sql)
    args.output.with_suffix(".json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    for r in summary:
        print(r["name"], r["source_parking_id"], r["total_spaces"], r["available_spaces"], r["source_updated_at"])


if __name__ == "__main__":
    main()
