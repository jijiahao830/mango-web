#!/usr/bin/env python3
"""
会员登录：按姓名查 MySQL 表 member，返回 level；无记录则插入新会员（默认等级见配置）。

配置与建表说明见仓库根目录 README.md。
本地：pip install -r requirements-member-api.txt → python member_api.py → 浏览器打开 /login.html
"""
from __future__ import annotations

import json
import re
import sqlite3
import sys
from datetime import datetime
from decimal import Decimal
from http import HTTPStatus
from pathlib import Path
from typing import Any

from flask import Flask, abort, jsonify, make_response, request, send_from_directory

ROOT = Path(__file__).resolve().parent
CONFIG_FILE = ROOT / "app_config.json"

DEFAULT_LEVEL = "普通"
DEFAULT_NEW_MEMBER_LEVEL = "芒果"
_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

_config_cache: dict[str, Any] | None = None


def _sql_ident(s: str) -> str:
    if not s or not _IDENT.match(s):
        raise ValueError(f"非法表名/列名（仅允许字母数字下划线）: {s!r}")
    return s


_MYSQL_IDENT = re.compile(r"^[A-Za-z_\u4e00-\u9fff][A-Za-z0-9_\u4e00-\u9fff]*$")


def _sql_ident_mysql(s: str) -> str:
    """MySQL 反引号内的表/列名，允许中文（与 ASCII 列名二选一配置）。"""
    if not s or not _MYSQL_IDENT.match(s):
        raise ValueError(f"非法 MySQL 表/列名: {s!r}")
    return s


def load_config() -> dict[str, Any]:
    global _config_cache
    if _config_cache is not None:
        return _config_cache
    if not CONFIG_FILE.is_file():
        raise FileNotFoundError(
            f"未找到 {CONFIG_FILE.name}，请在 web 目录下创建该文件（字段说明见仓库根目录 README.md）。"
        )
    with CONFIG_FILE.open(encoding="utf-8") as f:
        _config_cache = json.load(f)
    return _config_cache


def _new_member_level(cfg: dict[str, Any]) -> str:
    db = cfg.get("database") or {}
    lv = str(db.get("default_level_for_new_member") or DEFAULT_NEW_MEMBER_LEVEL).strip()
    return lv or DEFAULT_NEW_MEMBER_LEVEL


def lookup_or_create_member(name: str) -> tuple[str, bool]:
    """
    按姓名查询等级；不存在则插入一行（默认等级「芒果」或配置项 default_level_for_new_member）。
    新用户插入时可同时写入注册时间、最近登录时间（见 write_register_and_login_on_insert）。
    返回 (level, 是否本次新建)。
    """
    name = name.strip()
    if not name:
        return DEFAULT_LEVEL, False

    cfg = load_config()
    db = cfg.get("database") or {}
    db_type = (db.get("type") or "mysql").strip().lower()
    write_times_on_insert = db.get("write_register_and_login_on_insert", True)
    new_level = _new_member_level(cfg)

    if db_type == "sqlite":
        table = _sql_ident(str(db.get("table") or "member"))
        col_name = _sql_ident(str(db.get("name_column") or "name"))
        col_level = _sql_ident(str(db.get("level_column") or "level"))
        col_reg = _sql_ident(str(db.get("register_time_column") or "register_time"))
        col_last = _sql_ident(str(db.get("last_login_column") or "last_login_time"))
        raw_path = db.get("sqlite_path") or str(ROOT / "data" / "members.db")
        path = str(Path(raw_path).expanduser())
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(path)
        try:
            cur = conn.execute(
                f"SELECT {col_level} FROM {table} WHERE {col_name} = ? LIMIT 1",
                (name,),
            )
            row = cur.fetchone()
            if row and row[0]:
                return str(row[0]), False
            try:
                if write_times_on_insert:
                    ts = datetime.now()
                    conn.execute(
                        f"INSERT INTO {table} ({col_name}, {col_level}, {col_reg}, {col_last}) "
                        f"VALUES (?, ?, ?, ?)",
                        (name, new_level, ts, ts),
                    )
                else:
                    conn.execute(
                        f"INSERT INTO {table} ({col_name}, {col_level}) VALUES (?, ?)",
                        (name, new_level),
                    )
                conn.commit()
                return new_level, True
            except sqlite3.IntegrityError:
                conn.rollback()
                cur = conn.execute(
                    f"SELECT {col_level} FROM {table} WHERE {col_name} = ? LIMIT 1",
                    (name,),
                )
                row = cur.fetchone()
                return (str(row[0]) if row and row[0] else new_level), False
        finally:
            conn.close()

    if db_type == "mysql":
        try:
            import pymysql
            from pymysql.constants import CLIENT
            from pymysql.err import IntegrityError as PyMySQLIntegrityError
        except ImportError as e:
            raise RuntimeError("请安装: pip install pymysql") from e

        mq = db.get("mysql") or {}
        host = str(mq.get("host") or "127.0.0.1")
        port = int(mq.get("port") or 3306)
        user = str(mq.get("user") or "root")
        password = str(mq.get("password") or "")
        database = str(mq.get("database") or "").strip()
        if not database:
            raise ValueError("请在 app_config.json 的 database.mysql.database 中填写库名")

        table = _sql_ident_mysql(str(db.get("table") or "member"))
        col_name = _sql_ident_mysql(str(db.get("name_column") or "name"))
        col_level = _sql_ident_mysql(str(db.get("level_column") or "level"))
        col_reg = _sql_ident_mysql(str(db.get("register_time_column") or "register_time"))
        col_last = _sql_ident_mysql(str(db.get("last_login_column") or "last_login_time"))

        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            charset="utf8mb4",
            cursorclass=pymysql.cursors.Cursor,
            autocommit=False,
            client_flag=CLIENT.FOUND_ROWS,
        )
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT `{col_level}` FROM `{table}` WHERE `{col_name}` = %s LIMIT 1",
                    (name,),
                )
                row = cur.fetchone()
                if row and row[0]:
                    conn.commit()
                    return str(row[0]), False
                try:
                    if write_times_on_insert:
                        ts = datetime.now()
                        cur.execute(
                            f"INSERT INTO `{table}` (`{col_name}`, `{col_level}`, `{col_reg}`, `{col_last}`) "
                            f"VALUES (%s, %s, %s, %s)",
                            (name, new_level, ts, ts),
                        )
                    else:
                        cur.execute(
                            f"INSERT INTO `{table}` (`{col_name}`, `{col_level}`) VALUES (%s, %s)",
                            (name, new_level),
                        )
                    conn.commit()
                    return new_level, True
                except PyMySQLIntegrityError:
                    conn.rollback()
                    cur.execute(
                        f"SELECT `{col_level}` FROM `{table}` WHERE `{col_name}` = %s LIMIT 1",
                        (name,),
                    )
                    row = cur.fetchone()
                    conn.commit()
                    return (str(row[0]) if row and row[0] else new_level), False
        finally:
            conn.close()

    raise ValueError(f"不支持的 database.type: {db_type}")


def touch_last_login(name: str) -> None:
    """登录成功后写入最近登录时间（列名可配置，见 app_config.json）。"""
    name = name.strip()
    if not name:
        return

    cfg = load_config()
    db = cfg.get("database") or {}
    if db.get("update_last_login") is False:
        return

    db_type = (db.get("type") or "mysql").strip().lower()

    if db_type == "sqlite":
        table = _sql_ident(str(db.get("table") or "member"))
        col_name = _sql_ident(str(db.get("name_column") or "name"))
        col_last = _sql_ident(str(db.get("last_login_column") or "last_login_time"))
        raw_path = db.get("sqlite_path") or str(ROOT / "data" / "members.db")
        path = str(Path(raw_path).expanduser())
        conn = sqlite3.connect(path)
        try:
            cur = conn.execute(
                f"UPDATE {table} SET {col_last} = datetime('now') WHERE {col_name} = ?",
                (name,),
            )
            conn.commit()
            if cur.rowcount == 0:
                raise RuntimeError(
                    "未更新最近登录时间：未找到匹配的会员姓名，请核对 name 与输入是否一致。"
                )
        finally:
            conn.close()
        return

    if db_type == "mysql":
        try:
            import pymysql
            from pymysql.constants import CLIENT
        except ImportError as e:
            raise RuntimeError("请安装: pip install pymysql") from e

        table = _sql_ident_mysql(str(db.get("table") or "member"))
        col_name = _sql_ident_mysql(str(db.get("name_column") or "name"))
        col_last = _sql_ident_mysql(str(db.get("last_login_column") or "last_login_time"))

        mq = db.get("mysql") or {}
        host = str(mq.get("host") or "127.0.0.1")
        port = int(mq.get("port") or 3306)
        user = str(mq.get("user") or "root")
        password = str(mq.get("password") or "")
        database = str(mq.get("database") or "").strip()
        if not database:
            raise ValueError("请在 app_config.json 的 database.mysql.database 中填写库名")

        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            charset="utf8mb4",
            cursorclass=pymysql.cursors.Cursor,
            autocommit=False,
            client_flag=CLIENT.FOUND_ROWS,
        )
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE `{table}` SET `{col_last}` = NOW() WHERE `{col_name}` = %s",
                    (name,),
                )
                n = cur.rowcount
            conn.commit()
            if n == 0:
                raise RuntimeError(
                    "未写入最近登录时间：UPDATE 影响 0 行。请检查："
                    "1) member 表是否有列 "
                    f"`{db.get('last_login_column') or 'last_login_time'}`；"
                    "2) database.last_login_column 是否与数据库列名一致（含中文列名）；"
                    "3) name 是否与登录输入完全一致。"
                )
        finally:
            conn.close()
        return

    raise ValueError(f"不支持的 database.type: {db_type}")


def sync_last_login_from_register(name: str) -> None:
    """
    新用户首次插入后，将「最近登录时间」设为与「注册时间」相同（数据库内同一条记录上的值）。
    用于注册时间已写入但最近登录为空、或与注册不一致的情况。
    """
    name = name.strip()
    if not name:
        return

    cfg = load_config()
    db = cfg.get("database") or {}
    if db.get("sync_last_login_from_register") is False:
        return

    db_type = (db.get("type") or "mysql").strip().lower()

    if db_type == "sqlite":
        table = _sql_ident(str(db.get("table") or "member"))
        col_name = _sql_ident(str(db.get("name_column") or "name"))
        col_reg = _sql_ident(str(db.get("register_time_column") or "register_time"))
        col_last = _sql_ident(str(db.get("last_login_column") or "last_login_time"))
        raw_path = db.get("sqlite_path") or str(ROOT / "data" / "members.db")
        path = str(Path(raw_path).expanduser())
        conn = sqlite3.connect(path)
        try:
            conn.execute(
                f"UPDATE {table} SET {col_last} = {col_reg} WHERE {col_name} = ? "
                f"AND {col_reg} IS NOT NULL",
                (name,),
            )
            conn.commit()
        finally:
            conn.close()
        return

    if db_type == "mysql":
        try:
            import pymysql
            from pymysql.constants import CLIENT
        except ImportError as e:
            raise RuntimeError("请安装: pip install pymysql") from e

        mq = db.get("mysql") or {}
        host = str(mq.get("host") or "127.0.0.1")
        port = int(mq.get("port") or 3306)
        user = str(mq.get("user") or "root")
        password = str(mq.get("password") or "")
        database = str(mq.get("database") or "").strip()
        if not database:
            raise ValueError("请在 app_config.json 的 database.mysql.database 中填写库名")

        table = _sql_ident_mysql(str(db.get("table") or "member"))
        col_name = _sql_ident_mysql(str(db.get("name_column") or "name"))
        col_reg = _sql_ident_mysql(str(db.get("register_time_column") or "register_time"))
        col_last = _sql_ident_mysql(str(db.get("last_login_column") or "last_login_time"))

        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            charset="utf8mb4",
            cursorclass=pymysql.cursors.Cursor,
            autocommit=False,
            client_flag=CLIENT.FOUND_ROWS,
        )
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE `{table}` SET `{col_last}` = `{col_reg}` WHERE `{col_name}` = %s "
                    f"AND `{col_reg}` IS NOT NULL",
                    (name,),
                )
            conn.commit()
        finally:
            conn.close()
        return

    raise ValueError(f"不支持的 database.type: {db_type}")


def _parse_vehicle_price(value: Any) -> Decimal:
    """日租金等数值写入 DECIMAL；非法或缺省为 0。"""
    if value is None or value == "":
        return Decimal("0.00")
    try:
        d = Decimal(str(value))
        return d.quantize(Decimal("0.01"))
    except Exception:
        return Decimal("0.00")


def record_vehicle_click(member: str, brand: str, model: str, price: Decimal) -> None:
    """按日期+品牌+车型（及唯一键定义）累加 click_count，并写入/更新 price（MySQL）。"""
    member = member.strip()
    brand = brand.strip()
    model = model.strip()
    if not member or not brand or not model:
        raise ValueError("member、brand、model 不能为空")

    cfg = load_config()
    db = cfg.get("database") or {}
    if (db.get("type") or "mysql").strip().lower() != "mysql":
        raise ValueError("vehicle_click 统计仅支持 MySQL")

    try:
        import pymysql
        from pymysql.constants import CLIENT
    except ImportError as e:
        raise RuntimeError("请安装: pip install pymysql") from e

    table = _sql_ident_mysql(str(db.get("vehicle_click_table") or "vehicle_click_stat"))
    col_m = _sql_ident_mysql(str(db.get("vehicle_click_member_column") or "member"))
    col_d = _sql_ident_mysql(str(db.get("vehicle_click_date_column") or "click_date"))
    col_b = _sql_ident_mysql(str(db.get("vehicle_click_brand_column") or "brand"))
    col_model = _sql_ident_mysql(str(db.get("vehicle_click_model_column") or "model"))
    col_cnt = _sql_ident_mysql(str(db.get("vehicle_click_count_column") or "click_count"))
    col_price = _sql_ident_mysql(str(db.get("vehicle_click_price_column") or "price"))

    mq = db.get("mysql") or {}
    host = str(mq.get("host") or "127.0.0.1")
    port = int(mq.get("port") or 3306)
    user = str(mq.get("user") or "root")
    password = str(mq.get("password") or "")
    database = str(mq.get("database") or "").strip()
    if not database:
        raise ValueError("请在 app_config.json 的 database.mysql.database 中填写库名")

    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.Cursor,
        autocommit=False,
        client_flag=CLIENT.FOUND_ROWS,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"INSERT INTO `{table}` (`{col_m}`, `{col_d}`, `{col_b}`, `{col_model}`, `{col_cnt}`, `{col_price}`) "
                f"VALUES (%s, CURDATE(), %s, %s, 1, %s) "
                f"ON DUPLICATE KEY UPDATE `{col_cnt}` = `{col_cnt}` + 1, `{col_price}` = VALUES(`{col_price}`)",
                (member, brand, model, price),
            )
            conn.commit()
    finally:
        conn.close()


app = Flask(__name__)


def _cors(resp):
    """允许其它端口 / 域名上的静态页调用本接口（如 VS Code Live Server）。"""
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    return resp


@app.route("/api/member/lookup", methods=["POST", "OPTIONS"])
def api_member_lookup():
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))
    payload = request.get_json(silent=True) or {}
    req_name = (payload.get("name") or "").strip()
    if not req_name:
        return _cors(jsonify(ok=False, error="empty_name")), HTTPStatus.BAD_REQUEST
    try:
        level, created = lookup_or_create_member(req_name)
        if created:
            try:
                sync_last_login_from_register(req_name)
            except Exception as e:
                # 缺 register 列等不应阻止后续写入 last_login_time
                print(
                    f"[member_api] sync_last_login_from_register 已跳过: {e}",
                    file=sys.stderr,
                    flush=True,
                )
        touch_last_login(req_name)
    except Exception as e:
        return _cors(
            jsonify(ok=False, error="db_error", detail=str(e)),
        ), HTTPStatus.SERVICE_UNAVAILABLE
    return _cors(jsonify(ok=True, name=req_name, level=level, created=created))


@app.route("/api/vehicle-click", methods=["POST", "OPTIONS"])
def api_vehicle_click():
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))
    payload = request.get_json(silent=True) or {}
    member = (payload.get("member") or "").strip()
    brand = (payload.get("brand") or "").strip()
    model = (payload.get("model") or "").strip()
    if not member or not brand or not model:
        return _cors(jsonify(ok=False, error="missing_fields")), HTTPStatus.BAD_REQUEST
    price = _parse_vehicle_price(payload.get("price"))
    try:
        record_vehicle_click(member, brand, model, price)
    except Exception as e:
        return (
            _cors(jsonify(ok=False, error="db_error", detail=str(e))),
            HTTPStatus.SERVICE_UNAVAILABLE,
        )
    return _cors(jsonify(ok=True))


@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.get("/<path:filename>")
def static_files(filename: str):
    if ".." in filename or filename.startswith("/"):
        abort(404)
    target = ROOT / filename
    if target.is_file():
        return send_from_directory(ROOT, filename)
    abort(404)


if __name__ == "__main__":
    cfg = load_config()
    port = int(cfg.get("api_port") or 8765)
    host = str(cfg.get("api_host") or "0.0.0.0")
    debug = bool(cfg.get("debug"))
    app.run(host=host, port=port, debug=debug)
