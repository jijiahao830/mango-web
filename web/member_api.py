#!/usr/bin/env python3
"""
会员登录：按姓名查 MySQL 表 member，返回 level；无记录则插入新会员（默认等级见配置）。

配置与建表说明见仓库根目录 README.md。
本地：pip install -r requirements-member-api.txt → python member_api.py → 浏览器打开 /login.html
"""
from __future__ import annotations

import json
import re
import secrets
import sqlite3
import sys
import unicodedata
import urllib.error
import urllib.request
from datetime import date, datetime
from decimal import Decimal
from http import HTTPStatus
from pathlib import Path
from typing import Any

from flask import Flask, abort, jsonify, make_response, request, send_from_directory

ROOT = Path(__file__).resolve().parent
CONFIG_FILE = ROOT / "app_config.json"

DEFAULT_LEVEL = "普通"
DEFAULT_NEW_MEMBER_LEVEL = "芒果π"
_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

_config_cache: dict[str, Any] | None = None
BIGMODEL_CHAT_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"


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
    按姓名查询等级；不存在则插入一行（默认等级「芒果π」或配置项 default_level_for_new_member）。
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

def _verify_cardata_password(plain: str, expected: str) -> bool:
    """常量时间比较 UTF-8 字节（长度不一致时视为不匹配）。"""
    try:
        a = plain.encode("utf-8")
        b = expected.encode("utf-8")
        return secrets.compare_digest(a, b)
    except ValueError:
        return False


def _cardata_gate() -> tuple[dict[str, Any] | None, tuple[Any, int] | None]:
    """
    校验请求体中的 password 是否与 app_config.json 的 cardata_password 一致。
    成功返回 (cfg, None)；失败返回 (None, (response, http_status))。
    """
    cfg = load_config()
    raw = cfg.get("cardata_password")
    expected = (str(raw) if raw is not None else "").strip()
    if not expected:
        return None, (
            _cors(jsonify(ok=False, error="not_configured")),
            HTTPStatus.SERVICE_UNAVAILABLE,
        )
    payload = request.get_json(silent=True) or {}
    given = (payload.get("password") or "")
    if not isinstance(given, str):
        given = str(given)
    if not _verify_cardata_password(given, expected):
        if _cardata_should_log_submitted_password(cfg):
            msg = (
                f"[cardata] 口令错误 提交值={given!r} 客户端={request.remote_addr or '-'} "
                f"{request.path}"
            )
            app.logger.warning(msg)
            print(msg, flush=True)
        return None, (
            _cors(jsonify(ok=False, error="invalid_password")),
            HTTPStatus.UNAUTHORIZED,
        )
    return cfg, None


def _json_safe_mysql_value(v: Any) -> Any:
    if v is None:
        return None
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, datetime):
        return v.isoformat(sep=" ", timespec="seconds")
    if isinstance(v, date):
        return v.isoformat()
    d = getattr(v, "isoformat", None)
    if callable(d):
        try:
            return v.isoformat()
        except Exception:
            pass
    return v


def _resolve_cardata_view_name(cfg: dict[str, Any], default: str, config_key: str) -> str:
    v = cfg.get(config_key)
    if v:
        return str(v).strip()
    db_inner = cfg.get("database")
    if isinstance(db_inner, dict) and db_inner.get(config_key):
        return str(db_inner[config_key]).strip()
    return default


def _cardata_query_view(cfg: dict[str, Any], view_name: str) -> tuple[list[dict[str, Any]], str | None]:
    """SELECT * FROM 视图。成功 (rows, None)，失败 ([], 错误码或描述)。"""
    try:
        view_ident = _sql_ident_mysql(view_name.strip())
    except ValueError as e:
        return [], str(e)

    db = cfg.get("database") or {}
    if (db.get("type") or "mysql").strip().lower() != "mysql":
        return [], "mysql_only"

    try:
        import pymysql
        from pymysql.constants import CLIENT
        from pymysql.cursors import DictCursor
    except ImportError:
        return [], "import_pymysql"

    mq = db.get("mysql") or {}
    host = str(mq.get("host") or "127.0.0.1")
    port = int(mq.get("port") or 3306)
    user = str(mq.get("user") or "root")
    password = str(mq.get("password") or "")
    database = str(mq.get("database") or "").strip()
    if not database:
        return [], "no_database"

    try:
        _ct = mq.get("connect_timeout")
        connect_timeout = int(_ct) if _ct is not None else 10
    except (TypeError, ValueError):
        connect_timeout = 10
    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            charset="utf8mb4",
            cursorclass=DictCursor,
            autocommit=True,
            client_flag=CLIENT.FOUND_ROWS,
            connect_timeout=connect_timeout,
        )
    except Exception as e:
        return [], str(e)
    try:
        with conn.cursor() as cur:
            cur.execute(f"SELECT * FROM `{view_ident}`")
            raw_rows = cur.fetchall()
    except Exception as e:
        return [], str(e)
    finally:
        conn.close()

    rows: list[dict[str, Any]] = []
    for row in raw_rows:
        rows.append({k: _json_safe_mysql_value(v) for k, v in row.items()})
    return rows, None


# 自定义日期区间查询的最大跨度（天），防止一次扫表过大
_CARDATA_CUSTOM_RANGE_MAX_DAYS = 730


def _cardata_query_vehicle_click_range(
    cfg: dict[str, Any], start_d: date, end_d: date
) -> tuple[list[dict[str, Any]], str | None]:
    """
    按日期区间在 vehicle_click_stat 上按车聚合点击次数，返回行结构与周/月视图一致：
    统计周期、车辆、总点击次数（按总点击降序）。
    """
    db = cfg.get("database") or {}
    if (db.get("type") or "mysql").strip().lower() != "mysql":
        return [], "mysql_only"

    try:
        import pymysql
        from pymysql.constants import CLIENT
        from pymysql.cursors import DictCursor
    except ImportError:
        return [], "import_pymysql"

    try:
        table = _sql_ident_mysql(str(db.get("vehicle_click_table") or "vehicle_click_stat"))
        col_d = _sql_ident_mysql(str(db.get("vehicle_click_date_column") or "click_date"))
        col_b = _sql_ident_mysql(str(db.get("vehicle_click_brand_column") or "brand"))
        col_model = _sql_ident_mysql(str(db.get("vehicle_click_model_column") or "model"))
        col_cnt = _sql_ident_mysql(str(db.get("vehicle_click_count_column") or "click_count"))
    except ValueError as e:
        return [], str(e)

    mq = db.get("mysql") or {}
    host = str(mq.get("host") or "127.0.0.1")
    port = int(mq.get("port") or 3306)
    user = str(mq.get("user") or "root")
    password = str(mq.get("password") or "")
    database = str(mq.get("database") or "").strip()
    if not database:
        return [], "no_database"

    period_label = f"{start_d.isoformat()} ~ {end_d.isoformat()}"
    sql = (
        f"SELECT %s AS `统计周期`, "
        f"CONCAT(`{col_b}`, ' ', `{col_model}`) AS `车辆`, "
        f"SUM(`{col_cnt}`) AS `总点击次数` "
        f"FROM `{table}` WHERE `{col_d}` BETWEEN %s AND %s "
        f"GROUP BY `{col_b}`, `{col_model}` "
        f"ORDER BY `总点击次数` DESC "
        f"LIMIT 500"
    )

    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
        client_flag=CLIENT.FOUND_ROWS,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(sql, (period_label, start_d, end_d))
            raw_rows = cur.fetchall()
    except Exception as e:
        return [], str(e)
    finally:
        conn.close()

    rows_out: list[dict[str, Any]] = []
    for row in raw_rows:
        rows_out.append({k: _json_safe_mysql_value(v) for k, v in row.items()})
    return rows_out, None


def _cardata_query_vehicle_click_today(
    cfg: dict[str, Any],
) -> tuple[list[dict[str, Any]], str | None]:
    """
    今日车辆点击：只统计 vehicle_click_stat 里 click_date = CURDATE()（MySQL 会话日历日）。
    与 /api/cardata-custom-range 使用同一套表与列配置，避免 v_today_vehicle_click 等视图过滤错误导致「非当日」车上榜。
    """
    db = cfg.get("database") or {}
    if (db.get("type") or "mysql").strip().lower() != "mysql":
        return [], "mysql_only"

    try:
        import pymysql
        from pymysql.constants import CLIENT
        from pymysql.cursors import DictCursor
    except ImportError:
        return [], "import_pymysql"

    try:
        table = _sql_ident_mysql(str(db.get("vehicle_click_table") or "vehicle_click_stat"))
        col_d = _sql_ident_mysql(str(db.get("vehicle_click_date_column") or "click_date"))
        col_b = _sql_ident_mysql(str(db.get("vehicle_click_brand_column") or "brand"))
        col_model = _sql_ident_mysql(str(db.get("vehicle_click_model_column") or "model"))
        col_cnt = _sql_ident_mysql(str(db.get("vehicle_click_count_column") or "click_count"))
    except ValueError as e:
        return [], str(e)

    mq = db.get("mysql") or {}
    host = str(mq.get("host") or "127.0.0.1")
    port = int(mq.get("port") or 3306)
    user = str(mq.get("user") or "root")
    password = str(mq.get("password") or "")
    database = str(mq.get("database") or "").strip()
    if not database:
        return [], "no_database"

    sql = (
        f"SELECT CAST(CURDATE() AS CHAR) AS `统计周期`, "
        f"CONCAT(`{col_b}`, ' ', `{col_model}`) AS `车辆`, "
        f"SUM(`{col_cnt}`) AS `总点击次数` "
        f"FROM `{table}` WHERE `{col_d}` = CURDATE() "
        f"GROUP BY `{col_b}`, `{col_model}` "
        f"ORDER BY `总点击次数` DESC "
        f"LIMIT 500"
    )

    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
        client_flag=CLIENT.FOUND_ROWS,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            raw_rows = cur.fetchall()
    except Exception as e:
        return [], str(e)
    finally:
        conn.close()

    rows_out: list[dict[str, Any]] = []
    for row in raw_rows:
        rows_out.append({k: _json_safe_mysql_value(v) for k, v in row.items()})
    return rows_out, None


def _cardata_truthy(cfg_val: Any) -> bool:
    s = str(cfg_val or "").strip().lower()
    return s in ("1", "true", "yes", "on")


def _cardata_should_log_submitted_password(cfg: dict[str, Any]) -> bool:
    """是否在口令错误时把用户提交的明文打到日志（成功时从不输出）。"""
    if _cardata_truthy(cfg.get("cardata_log_password")):
        return True
    return _cardata_truthy(cfg.get("debug"))


def _cardata_query_store_visit_range_from_vehicle_clicks(
    cfg: dict[str, Any], start_d: date, end_d: date
) -> tuple[list[dict[str, Any]], str | None]:
    """
    自定义区间「访问人数」：在 vehicle_click_stat 上对 click_date 落在区间内的 member 去重计数
    （与 view_today_visit_count / view_week_visit_count 等同口径，不依赖额外观图）。
    返回列：统计周期、门店（展示用标签）、访问人数。
    表/列可通过 database.vehicle_click_table、vehicle_click_date_column、vehicle_click_member_column 覆盖。
    """
    db = cfg.get("database") or {}
    if (db.get("type") or "mysql").strip().lower() != "mysql":
        return [], "mysql_only"

    try:
        import pymysql
        from pymysql.constants import CLIENT
        from pymysql.cursors import DictCursor
    except ImportError:
        return [], "import_pymysql"

    try:
        table = _sql_ident_mysql(str(db.get("vehicle_click_table") or "vehicle_click_stat"))
        col_d = _sql_ident_mysql(str(db.get("vehicle_click_date_column") or "click_date"))
        col_m = _sql_ident_mysql(str(db.get("vehicle_click_member_column") or "member"))
    except ValueError as e:
        return [], str(e)

    total_label = str(db.get("store_visit_total_label") or "全店合计").strip() or "全店合计"
    mq = db.get("mysql") or {}
    host = str(mq.get("host") or "127.0.0.1")
    port = int(mq.get("port") or 3306)
    user = str(mq.get("user") or "root")
    password = str(mq.get("password") or "")
    database = str(mq.get("database") or "").strip()
    if not database:
        return [], "no_database"

    period_label = f"{start_d.isoformat()} ~ {end_d.isoformat()}"
    sql = (
        f"SELECT %s AS `统计周期`, %s AS `门店`, "
        f"COUNT(DISTINCT `{col_m}`) AS `访问人数` "
        f"FROM `{table}` WHERE `{col_d}` BETWEEN %s AND %s"
    )
    params: tuple[Any, ...] = (period_label, total_label, start_d, end_d)

    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
        client_flag=CLIENT.FOUND_ROWS,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            raw_rows = cur.fetchall()
    except Exception as e:
        return [], str(e)
    finally:
        conn.close()

    rows_out: list[dict[str, Any]] = []
    for row in raw_rows:
        rows_out.append({k: _json_safe_mysql_value(v) for k, v in row.items()})
    return rows_out, None


def _cardata_query_store_visit_range_legacy_table(
    cfg: dict[str, Any], start_d: date, end_d: date
) -> tuple[list[dict[str, Any]], str | None]:
    """
    访问人数：在 store_visit_stat（可配置）上按日期区间聚合。
    若配置 store_visit_dimension_column（如门店），则按维度 GROUP BY 取 TOP；
    若不配置维度，则整表 SUM 为一行，门店列显示 store_visit_total_label（默认「全店合计」）。
    需在 database.cardata_custom_store_use_store_visit_table 中开启后使用。
    """
    db = cfg.get("database") or {}
    if (db.get("type") or "mysql").strip().lower() != "mysql":
        return [], "mysql_only"

    try:
        import pymysql
        from pymysql.constants import CLIENT
        from pymysql.cursors import DictCursor
    except ImportError:
        return [], "import_pymysql"

    try:
        table = _sql_ident_mysql(str(db.get("store_visit_table") or "store_visit_stat"))
        col_d = _sql_ident_mysql(str(db.get("store_visit_date_column") or "visit_date"))
        col_cnt = _sql_ident_mysql(str(db.get("store_visit_count_column") or "visit_count"))
    except ValueError as e:
        return [], str(e)

    dim_raw = (db.get("store_visit_dimension_column") or "").strip()
    total_label = str(db.get("store_visit_total_label") or "全店合计").strip() or "全店合计"

    mq = db.get("mysql") or {}
    host = str(mq.get("host") or "127.0.0.1")
    port = int(mq.get("port") or 3306)
    user = str(mq.get("user") or "root")
    password = str(mq.get("password") or "")
    database = str(mq.get("database") or "").strip()
    if not database:
        return [], "no_database"

    period_label = f"{start_d.isoformat()} ~ {end_d.isoformat()}"

    if dim_raw:
        try:
            col_dim = _sql_ident_mysql(dim_raw)
        except ValueError as e:
            return [], str(e)
        sql = (
            f"SELECT %s AS `统计周期`, `{col_dim}` AS `门店`, SUM(`{col_cnt}`) AS `访问人数` "
            f"FROM `{table}` WHERE `{col_d}` BETWEEN %s AND %s "
            f"GROUP BY `{col_dim}` "
            f"ORDER BY `访问人数` DESC "
            f"LIMIT 500"
        )
        params: tuple[Any, ...] = (period_label, start_d, end_d)
    else:
        sql = (
            f"SELECT %s AS `统计周期`, %s AS `门店`, SUM(`{col_cnt}`) AS `访问人数` "
            f"FROM `{table}` WHERE `{col_d}` BETWEEN %s AND %s"
        )
        params = (period_label, total_label, start_d, end_d)

    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
        client_flag=CLIENT.FOUND_ROWS,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            raw_rows = cur.fetchall()
    except Exception as e:
        return [], str(e)
    finally:
        conn.close()

    rows_out: list[dict[str, Any]] = []
    for row in raw_rows:
        rows_out.append({k: _json_safe_mysql_value(v) for k, v in row.items()})
    return rows_out, None


def _cardata_query_store_visit_range(
    cfg: dict[str, Any], start_d: date, end_d: date
) -> tuple[list[dict[str, Any]], str | None]:
    """
    自定义区间访问人数：默认从 vehicle_click_stat 按会员去重；
    若 database.cardata_custom_store_use_store_visit_table 为 true，则改用 store_visit_stat 及原聚合逻辑。
    """
    db = cfg.get("database") or {}
    if _cardata_truthy(db.get("cardata_custom_store_use_store_visit_table")):
        return _cardata_query_store_visit_range_legacy_table(cfg, start_d, end_d)
    return _cardata_query_store_visit_range_from_vehicle_clicks(cfg, start_d, end_d)


def _cors(resp):
    """允许其它端口 / 域名上的静态页调用本接口（如 VS Code Live Server）。"""
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return resp


def _cars_catalog_rows() -> tuple[list[dict[str, Any]], str | None]:
    """从 MySQL `cars` 表读取选车页所需字段（与 carpark 文件夹名 car_name 一致）；仅 `status` = 1 上架。"""
    cfg = load_config()
    db = cfg.get("database") or {}
    mq = db.get("mysql") or {}
    table_raw = (db.get("cars_table") or "cars").strip()
    if not re.match(r"^[A-Za-z0-9_]+$", table_raw):
        return [], "bad_cars_table"
    host = str(mq.get("host") or "").strip()
    database = str(mq.get("database") or "").strip()
    if not host or not database:
        return [], "no_database"
    try:
        import pymysql
        from pymysql.cursors import DictCursor
    except ImportError:
        return [], "import_pymysql"

    conn = pymysql.connect(
        host=host,
        port=int(mq.get("port") or 3306),
        user=str(mq.get("user") or "root"),
        password=str(mq.get("password") or ""),
        database=database,
        charset="utf8mb4",
        cursorclass=DictCursor,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT `id`, `car_name`, `brand`, `model`, `rent_price`, `category` "
                f"FROM `{table_raw}` WHERE `status` = 1 ORDER BY `brand` ASC, `id` ASC"
            )
            raw_rows = cur.fetchall()
    finally:
        conn.close()

    out: list[dict[str, Any]] = []
    for row in raw_rows or []:
        out.append(
            {
                "id": _json_safe_mysql_value(row.get("id")),
                "car_name": _json_safe_mysql_value(row.get("car_name")),
                "brand": _json_safe_mysql_value(row.get("brand")),
                "model": _json_safe_mysql_value(row.get("model")),
                "rent_price": _json_safe_mysql_value(row.get("rent_price")),
                "category": _json_safe_mysql_value(row.get("category")),
            }
        )
    return out, None


@app.route("/api/cars-catalog", methods=["GET", "OPTIONS"])
def api_cars_catalog():
    """选车页：从 `cars` 表拉取上架车辆（status=1），用于动态生成筛选与卡片（封面由前端统一用五菱宏光）。"""
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))
    rows, err = _cars_catalog_rows()
    if err:
        if err == "no_database":
            return (
                _cors(jsonify(ok=False, error="db_error", detail="未配置 database.mysql")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if err == "import_pymysql":
            return (
                _cors(jsonify(ok=False, error="db_error", detail="请安装 pymysql")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if err == "bad_cars_table":
            return _cors(jsonify(ok=False, error="bad_cars_table")), HTTPStatus.BAD_REQUEST
        return _cors(jsonify(ok=False, error="db_error", detail=err)), HTTPStatus.SERVICE_UNAVAILABLE
    return _cors(jsonify(ok=True, cars=rows))


def _get_ui_config_from_disk() -> dict:
    """
    每次请求读盘，获取 app_config.json 中的前端配置，修改配置后无需重启进程即可生效。
    """
    if not CONFIG_FILE.is_file():
        return {}
    try:
        with CONFIG_FILE.open(encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


@app.route("/api/site-ui", methods=["GET", "OPTIONS"])
def api_site_ui():
    """前端只读：站点 UI 开关及配置（来自 app_config.json，仅返回非敏感字段）。"""
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))
    
    cfg = _get_ui_config_from_disk()
    
    v = cfg.get("cta-section", True)
    cta = True
    if isinstance(v, bool):
        cta = v
    elif isinstance(v, (int, float)):
        cta = bool(v)
    elif isinstance(v, str):
        s = v.strip().lower()
        if s in ("0", "false", "no", "off"):
            cta = False

    pricing = cfg.get("pricing", {
        "day7": {"multiplier": 6.5, "divisor": 7},
        "day15": {"multiplier": 13, "divisor": 15},
        "day30": {"multiplier": 23, "divisor": 30}
    })

    return _cors(jsonify({"ok": True, "cta-section": cta, "pricing": pricing}))


def _cardata_view_http_response(
    cfg: dict[str, Any] | None,
    err: tuple[Any, int] | None,
    default_view: str,
    config_key: str,
) -> Any:
    """cardata 视图查询的统一错误处理与 JSON 返回。"""
    if err:
        return err[0], err[1]
    assert cfg is not None
    view_name = _resolve_cardata_view_name(cfg, default_view, config_key)
    rows, qerr = _cardata_query_view(cfg, view_name)
    if qerr:
        if qerr == "mysql_only":
            return (
                _cors(jsonify(ok=False, error="mysql_only")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if qerr == "import_pymysql":
            return (
                _cors(jsonify(ok=False, error="db_error", detail="请安装 pymysql")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if qerr == "no_database":
            return (
                _cors(jsonify(ok=False, error="db_error", detail="未配置 database.mysql.database")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if qerr.startswith("非法"):
            return _cors(jsonify(ok=False, error="invalid_view", detail=qerr)), HTTPStatus.BAD_REQUEST
        return (
            _cors(jsonify(ok=False, error="db_error", detail=qerr)),
            HTTPStatus.SERVICE_UNAVAILABLE,
        )
    return _cors(jsonify(ok=True, rows=rows))


@app.route("/api/cardata-auth", methods=["POST", "OPTIONS"])
def api_cardata_auth():
    """校验 cardata 后台口令（与 app_config.json 中 cardata_password 一致）。"""
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))
    _cfg, err = _cardata_gate()
    if err:
        return err[0], err[1]
    return _cors(jsonify(ok=True))


@app.route("/api/cardata-today-vehicle-clicks", methods=["POST", "OPTIONS"])
def api_cardata_today_vehicle_clicks():
    """今日车辆点击：vehicle_click_stat 中 click_date = CURDATE() 聚合（与自定义区间一致，不读 v_today_vehicle_click）。"""
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))
    cfg, err = _cardata_gate()
    if err:
        return err[0], err[1]
    rows, qerr = _cardata_query_vehicle_click_today(cfg)
    if qerr:
        if qerr == "mysql_only":
            return (
                _cors(jsonify(ok=False, error="mysql_only")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if qerr == "import_pymysql":
            return (
                _cors(jsonify(ok=False, error="db_error", detail="请安装 pymysql")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if qerr == "no_database":
            return (
                _cors(jsonify(ok=False, error="db_error", detail="未配置 database.mysql.database")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if qerr.startswith("非法"):
            return _cors(jsonify(ok=False, error="invalid_ident", detail=qerr)), HTTPStatus.BAD_REQUEST
        return (
            _cors(jsonify(ok=False, error="db_error", detail=qerr)),
            HTTPStatus.SERVICE_UNAVAILABLE,
        )
    return _cors(jsonify(ok=True, rows=rows))


@app.route("/api/cardata-week-vehicle-total", methods=["POST", "OPTIONS"])
def api_cardata_week_vehicle_total():
    """本周车辆累计点击（默认读视图 v_week_vehicle_total，可在配置 cardata_week_vehicle_view 覆盖）。"""
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))
    cfg, err = _cardata_gate()
    return _cardata_view_http_response(cfg, err, "v_week_vehicle_total", "cardata_week_vehicle_view")


@app.route("/api/cardata-month-vehicle-total", methods=["POST", "OPTIONS"])
def api_cardata_month_vehicle_total():
    """本月车辆累计点击（默认读视图 v_month_vehicle_total，可在配置 cardata_month_vehicle_view 覆盖）。"""
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))
    cfg, err = _cardata_gate()
    return _cardata_view_http_response(cfg, err, "v_month_vehicle_total", "cardata_month_vehicle_view")


@app.route("/api/cardata-custom-range", methods=["POST", "OPTIONS"])
def api_cardata_custom_range():
    """自定义起止日期，从 vehicle_click_stat 聚合查询（与表/列配置一致）。"""
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))
    cfg, err = _cardata_gate()
    if err:
        return err[0], err[1]

    payload = request.get_json(silent=True) or {}
    start_s = (payload.get("start_date") or "").strip()
    end_s = (payload.get("end_date") or "").strip()
    try:
        start_d = date.fromisoformat(start_s)
        end_d = date.fromisoformat(end_s)
    except ValueError:
        return (
            _cors(jsonify(ok=False, error="bad_date", detail="请使用 YYYY-MM-DD 格式日期")),
            HTTPStatus.BAD_REQUEST,
        )
    if start_d > end_d:
        return (
            _cors(jsonify(ok=False, error="bad_range", detail="开始日期不能晚于结束日期")),
            HTTPStatus.BAD_REQUEST,
        )
    if (end_d - start_d).days > _CARDATA_CUSTOM_RANGE_MAX_DAYS:
        return (
            _cors(
                jsonify(
                    ok=False,
                    error="range_too_long",
                    detail=f"日期区间最长 {_CARDATA_CUSTOM_RANGE_MAX_DAYS} 天",
                )
            ),
            HTTPStatus.BAD_REQUEST,
        )

    rows, qerr = _cardata_query_vehicle_click_range(cfg, start_d, end_d)
    if qerr:
        if qerr == "mysql_only":
            return (
                _cors(jsonify(ok=False, error="mysql_only")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if qerr == "import_pymysql":
            return (
                _cors(jsonify(ok=False, error="db_error", detail="请安装 pymysql")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if qerr == "no_database":
            return (
                _cors(jsonify(ok=False, error="db_error", detail="未配置 database.mysql.database")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if qerr.startswith("非法"):
            return _cors(jsonify(ok=False, error="invalid_ident", detail=qerr)), HTTPStatus.BAD_REQUEST
        return (
            _cors(jsonify(ok=False, error="db_error", detail=qerr)),
            HTTPStatus.SERVICE_UNAVAILABLE,
        )
    return _cors(jsonify(ok=True, rows=rows))


@app.route("/api/cardata-today-store-visit", methods=["POST", "OPTIONS"])
def api_cardata_today_store_visit():
    """今日访问人数（默认视图 view_today_visit_count：stat_date + visit_num，配置 cardata_today_store_visit_view）。"""
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))
    cfg, err = _cardata_gate()
    return _cardata_view_http_response(cfg, err, "view_today_visit_count", "cardata_today_store_visit_view")


@app.route("/api/cardata-week-store-visit", methods=["POST", "OPTIONS"])
def api_cardata_week_store_visit():
    """本周访问人数（默认视图 view_week_visit_count：stat_period + visit_num，配置 cardata_week_store_visit_view）。"""
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))
    cfg, err = _cardata_gate()
    return _cardata_view_http_response(cfg, err, "view_week_visit_count", "cardata_week_store_visit_view")


@app.route("/api/cardata-month-store-visit", methods=["POST", "OPTIONS"])
def api_cardata_month_store_visit():
    """本月访问人数（默认视图 view_month_visit_count：统计周期 + visit_num，配置 cardata_month_store_visit_view）。"""
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))
    cfg, err = _cardata_gate()
    return _cardata_view_http_response(cfg, err, "view_month_visit_count", "cardata_month_store_visit_view")


@app.route("/api/cardata-custom-range-store", methods=["POST", "OPTIONS"])
def api_cardata_custom_range_store():
    """自定义起止日期访问人数：默认 vehicle_click_stat 会员去重；可选改回 store_visit_stat（见配置说明）。"""
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))
    cfg, err = _cardata_gate()
    if err:
        return err[0], err[1]

    payload = request.get_json(silent=True) or {}
    start_s = (payload.get("start_date") or "").strip()
    end_s = (payload.get("end_date") or "").strip()
    try:
        start_d = date.fromisoformat(start_s)
        end_d = date.fromisoformat(end_s)
    except ValueError:
        return (
            _cors(jsonify(ok=False, error="bad_date", detail="请使用 YYYY-MM-DD 格式日期")),
            HTTPStatus.BAD_REQUEST,
        )
    if start_d > end_d:
        return (
            _cors(jsonify(ok=False, error="bad_range", detail="开始日期不能晚于结束日期")),
            HTTPStatus.BAD_REQUEST,
        )
    if (end_d - start_d).days > _CARDATA_CUSTOM_RANGE_MAX_DAYS:
        return (
            _cors(
                jsonify(
                    ok=False,
                    error="range_too_long",
                    detail=f"日期区间最长 {_CARDATA_CUSTOM_RANGE_MAX_DAYS} 天",
                )
            ),
            HTTPStatus.BAD_REQUEST,
        )

    rows, qerr = _cardata_query_store_visit_range(cfg, start_d, end_d)
    if qerr:
        if qerr == "mysql_only":
            return (
                _cors(jsonify(ok=False, error="mysql_only")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if qerr == "import_pymysql":
            return (
                _cors(jsonify(ok=False, error="db_error", detail="请安装 pymysql")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if qerr == "no_database":
            return (
                _cors(jsonify(ok=False, error="db_error", detail="未配置 database.mysql.database")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if qerr.startswith("非法"):
            return _cors(jsonify(ok=False, error="invalid_ident", detail=qerr)), HTTPStatus.BAD_REQUEST
        return (
            _cors(jsonify(ok=False, error="db_error", detail=qerr)),
            HTTPStatus.SERVICE_UNAVAILABLE,
        )
    return _cors(jsonify(ok=True, rows=rows))


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


@app.route("/api/wecom/checklist-send", methods=["POST", "OPTIONS"])
def api_wecom_checklist_send():
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))

    payload = request.get_json(silent=True) or {}
    user = str(payload.get("user") or "").strip() or "未登录用户"
    phone = str(payload.get("phone") or "").strip()
    lines = payload.get("lines")
    if not isinstance(lines, list) or not lines:
        return _cors(jsonify(ok=False, error="empty_checklist")), HTTPStatus.BAD_REQUEST

    normalized: list[str] = []
    for line in lines:
        s = str(line or "").strip()
        if s:
            normalized.append(s)
    if not normalized:
        return _cors(jsonify(ok=False, error="empty_checklist")), HTTPStatus.BAD_REQUEST

    try:
        cfg = load_config()
    except FileNotFoundError:
        return (
            _cors(jsonify(ok=False, error="config_missing", detail="未找到 app_config.json")),
            HTTPStatus.SERVICE_UNAVAILABLE,
        )
    webhook = str(cfg.get("wecom_checklist_webhook") or "").strip()
    if not webhook:
        return (
            _cors(
                jsonify(
                    ok=False,
                    error="not_configured",
                    detail="请在 app_config.json 中配置 wecom_checklist_webhook（企业微信群机器人 Webhook 完整地址）",
                )
            ),
            HTTPStatus.SERVICE_UNAVAILABLE,
        )

    content = "用户：{u}\n用户手机号：{p}\n车辆清单：\n- {rows}".format(
        u=user,
        p=(phone or "未填写"),
        rows="\n- ".join(normalized),
    )
    body = {
        "msgtype": "text",
        "text": {"content": content},
    }
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        webhook,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            text = resp.read().decode("utf-8", errors="replace")
        out = json.loads(text or "{}")
        if int(out.get("errcode", -1)) != 0:
            return (
                _cors(jsonify(ok=False, error="wecom_error", detail=out.get("errmsg") or "发送失败")),
                HTTPStatus.BAD_GATEWAY,
            )
    except urllib.error.URLError as e:
        return (
            _cors(jsonify(ok=False, error="network_error", detail=str(e))),
            HTTPStatus.BAD_GATEWAY,
        )
    except Exception as e:
        return (
            _cors(jsonify(ok=False, error="send_failed", detail=str(e))),
            HTTPStatus.BAD_GATEWAY,
        )
    return _cors(jsonify(ok=True))


@app.route("/api/ai-consult", methods=["POST", "OPTIONS"])
def api_ai_consult():
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))

    payload = request.get_json(silent=True) or {}
    msg = str(payload.get("message") or "").strip()
    car_name = str(payload.get("car_name") or "").strip()
    user = str(payload.get("user") or "").strip()
    if not msg:
        return _cors(jsonify(ok=False, error="empty_message")), HTTPStatus.BAD_REQUEST

    cfg = load_config()
    api_key = str(cfg.get("ZP_API_KEY") or "").strip()
    knowledge_id = str(
        cfg.get("ZP_KUN")
        or cfg.get("ZP_KNOWLEDGE_ID")
        or cfg.get("knowledge_id")
        or ""
    ).strip()
    if not api_key:
        return _cors(jsonify(ok=False, error="missing_api_key", detail="未配置 ZP_API_KEY")), HTTPStatus.SERVICE_UNAVAILABLE

    system_prompt = str(cfg.get("ai_system_prompt") or "").strip() or (
        "你是芒果超跑租车网站的客服助手。请用自然、简洁、礼貌的中文直接回答用户问题。"
        "禁止提及“文档/知识库/检索/未找到资料”等内部信息；"
        "门店的位置在：云南省昆明市西山区虹塔东路滇池卫城欣街坊B区8幢"
        "当信息不足时，直接回复：不好意思，我现在暂时回答不了这个问题，请您直接联系客服：13033333370、13033333610。"
    )

    body = {
        "model": "glm-4-flash",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": msg},
        ],
        "temperature": 0.5,
    }
    if knowledge_id:
        body["tools"] = [
            {
                "type": "retrieval",
                "retrieval": {
                    "knowledge_id": knowledge_id,
                },
            }
        ]
        body["tool_choice"] = "auto"

    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        BIGMODEL_CHAT_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            text = resp.read().decode("utf-8", errors="replace")
        out = json.loads(text or "{}")
        choices = out.get("choices") or []
        reply = ""
        if choices and isinstance(choices, list):
            msg_obj = choices[0].get("message") if isinstance(choices[0], dict) else {}
            if isinstance(msg_obj, dict):
                c = msg_obj.get("content")
                if isinstance(c, str):
                    reply = c.strip()
                elif isinstance(c, list):
                    parts = []
                    for part in c:
                        if isinstance(part, dict):
                            t = str(part.get("text") or "").strip()
                            if t:
                                parts.append(t)
                    reply = "\n".join(parts).strip()
        # Guardrail: strip provider-style retrieval wording so final copy is purely客服话术.
        raw_reply = reply
        reply = re.sub(r"(?i)抱歉[，,。]?\s*文档中[^\n。！？!?]*[。！？!?]?", "", reply).strip()
        reply = re.sub(r"(?i)文档中未找到[^\n。！？!?]*[。！？!?]?", "", reply).strip()
        reply = re.sub(r"(?i)知识库中未找到[^\n。！？!?]*[。！？!?]?", "", reply).strip()
        reply = re.sub(r"(?i)未找到[^\n。！？!?]*(文档|知识库)[^\n。！？!?]*[。！？!?]?", "", reply).strip()

        if not reply:
            user_msg_norm = (msg or "").strip().lower()
            if user_msg_norm in {"hi", "hello", "你好", "您好", "嗨", "哈喽"}:
                reply = "您好，欢迎来到芒果超跑租车，请问想了解车型、价格，还是门店信息？"
            else:
                reply = "收到，您可以告诉我具体想了解的车型、价格或门店信息，我来为您查询。"

        if not raw_reply and not reply:
            return (
                _cors(jsonify(ok=False, error="empty_reply", detail="模型未返回有效内容")),
                HTTPStatus.BAD_GATEWAY,
            )
        return _cors(jsonify(ok=True, reply=reply))
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = e.read().decode("utf-8", errors="replace")
        except Exception:
            detail = str(e)
        return _cors(jsonify(ok=False, error="provider_http_error", detail=detail)), HTTPStatus.BAD_GATEWAY
    except urllib.error.URLError as e:
        return _cors(jsonify(ok=False, error="network_error", detail=str(e))), HTTPStatus.BAD_GATEWAY
    except Exception as e:
        return _cors(jsonify(ok=False, error="ai_failed", detail=str(e))), HTTPStatus.BAD_GATEWAY


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


def _member_vehicle_clicks_summary_rows(member: str) -> tuple[list[dict[str, Any]], str | None]:
    """按会员汇总 vehicle_click_stat：品牌、车型、总点击次数。"""
    member = member.strip()
    if not member:
        return [], "empty_member"

    cfg = load_config()
    db = cfg.get("database") or {}
    if (db.get("type") or "mysql").strip().lower() != "mysql":
        return [], "mysql_only"

    try:
        import pymysql
        from pymysql.constants import CLIENT
        from pymysql.cursors import DictCursor
    except ImportError:
        return [], "import_pymysql"

    try:
        table = _sql_ident_mysql(str(db.get("vehicle_click_table") or "vehicle_click_stat"))
        col_m = _sql_ident_mysql(str(db.get("vehicle_click_member_column") or "member"))
        col_b = _sql_ident_mysql(str(db.get("vehicle_click_brand_column") or "brand"))
        col_model = _sql_ident_mysql(str(db.get("vehicle_click_model_column") or "model"))
        col_cnt = _sql_ident_mysql(str(db.get("vehicle_click_count_column") or "click_count"))
    except ValueError as e:
        return [], str(e)

    mq = db.get("mysql") or {}
    host = str(mq.get("host") or "127.0.0.1")
    port = int(mq.get("port") or 3306)
    user = str(mq.get("user") or "root")
    password = str(mq.get("password") or "")
    database = str(mq.get("database") or "").strip()
    if not database:
        return [], "no_database"

    sql = (
        f"SELECT `{col_b}` AS `brand`, `{col_model}` AS `model`, "
        f"SUM(`{col_cnt}`) AS `total_clicks` "
        f"FROM `{table}` WHERE `{col_m}` = %s "
        f"GROUP BY `{col_b}`, `{col_model}` "
        f"ORDER BY `total_clicks` DESC"
    )

    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
        client_flag=CLIENT.FOUND_ROWS,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(sql, (member,))
            raw_rows = cur.fetchall()
    except Exception as e:
        return [], str(e)
    finally:
        conn.close()

    out: list[dict[str, Any]] = []
    for row in raw_rows:
        out.append(
            {
                "brand": row.get("brand"),
                "model": row.get("model"),
                "total_clicks": _json_safe_mysql_value(row.get("total_clicks")),
            }
        )
    return out, None


def _member_max_click_car_row(member: str) -> tuple[str | None, str | None]:
    """
    查询视图 v_member_max_click_car（可配置）：该会员按 brand+model 汇总后点击最多的车辆展示名。
    返回 (car_name, err)；无记录时为 (None, None)。
    """
    member = member.strip()
    if not member:
        return None, "empty_member"

    cfg = load_config()
    db = cfg.get("database") or {}
    if (db.get("type") or "mysql").strip().lower() != "mysql":
        return None, "mysql_only"

    try:
        import pymysql
        from pymysql.constants import CLIENT
        from pymysql.cursors import DictCursor
    except ImportError:
        return None, "import_pymysql"

    try:
        view = _sql_ident_mysql(str(db.get("member_max_click_car_view") or "v_member_max_click_car"))
        col_member = _sql_ident_mysql(
            str(db.get("member_max_click_car_member_column") or "会员名称")
        )
        col_car = _sql_ident_mysql(
            str(db.get("member_max_click_car_name_column") or "点击次数最多的车")
        )
    except ValueError as e:
        return None, str(e)

    mq = db.get("mysql") or {}
    host = str(mq.get("host") or "127.0.0.1")
    port = int(mq.get("port") or 3306)
    user = str(mq.get("user") or "root")
    password = str(mq.get("password") or "")
    database = str(mq.get("database") or "").strip()
    if not database:
        return None, "no_database"

    sql = (
        f"SELECT `{col_car}` AS `top_car` FROM `{view}` "
        f"WHERE `{col_member}` = %s LIMIT 1"
    )

    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
        client_flag=CLIENT.FOUND_ROWS,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(sql, (member,))
            row = cur.fetchone()
    except Exception as e:
        return None, str(e)
    finally:
        conn.close()

    if not row:
        return None, None
    raw = row.get("top_car")
    if raw is None:
        return None, None
    name = str(raw).strip()
    return (name if name else None), None


def _yesterday_vehicle_click_top_rows(limit: int) -> tuple[list[dict[str, Any]], str | None]:
    """昨日全站车辆点击排行（视图 v_yesterday_vehicle_click），按点击次数降序取前 limit 条。"""
    try:
        lim = int(limit)
    except (TypeError, ValueError):
        lim = 4
    lim = max(1, min(lim, 50))

    cfg = load_config()
    db = cfg.get("database") or {}
    if (db.get("type") or "mysql").strip().lower() != "mysql":
        return [], "mysql_only"

    try:
        import pymysql
        from pymysql.constants import CLIENT
        from pymysql.cursors import DictCursor
    except ImportError:
        return [], "import_pymysql"

    try:
        view = _sql_ident_mysql(str(db.get("yesterday_vehicle_click_view") or "v_yesterday_vehicle_click"))
        col_vehicle = _sql_ident_mysql(
            str(db.get("yesterday_vehicle_click_vehicle_column") or "车辆")
        )
        col_cnt = _sql_ident_mysql(str(db.get("yesterday_vehicle_click_count_column") or "点击次数"))
    except ValueError as e:
        return [], str(e)

    mq = db.get("mysql") or {}
    host = str(mq.get("host") or "127.0.0.1")
    port = int(mq.get("port") or 3306)
    user = str(mq.get("user") or "root")
    password = str(mq.get("password") or "")
    database = str(mq.get("database") or "").strip()
    if not database:
        return [], "no_database"

    sql = (
        f"SELECT `{col_vehicle}` AS `vehicle`, `{col_cnt}` AS `total_clicks` "
        f"FROM `{view}` ORDER BY `{col_cnt}` DESC LIMIT %s"
    )

    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
        client_flag=CLIENT.FOUND_ROWS,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(sql, (lim,))
            raw_rows = cur.fetchall()
    except Exception as e:
        return [], str(e)
    finally:
        conn.close()

    out: list[dict[str, Any]] = []
    for row in raw_rows or []:
        out.append(
            {
                "vehicle": _json_safe_mysql_value(row.get("vehicle")),
                "total_clicks": _json_safe_mysql_value(row.get("total_clicks")),
            }
        )
    return out, None


@app.route("/api/yesterday-vehicle-click-top", methods=["POST", "OPTIONS"])
def api_yesterday_vehicle_click_top():
    """新用户 / 无个人点击：选车页「今日推荐」用昨日全站点击前 N 名（视图 v_yesterday_vehicle_click）。"""
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))
    payload = request.get_json(silent=True) or {}
    raw_limit = payload.get("limit", 4)
    try:
        limit = int(raw_limit)
    except (TypeError, ValueError):
        limit = 4
    rows, err = _yesterday_vehicle_click_top_rows(limit)
    if err:
        if err == "mysql_only":
            return _cors(jsonify(ok=False, error="mysql_only")), HTTPStatus.SERVICE_UNAVAILABLE
        if err == "import_pymysql":
            return (
                _cors(jsonify(ok=False, error="db_error", detail="请安装 pymysql")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if err == "no_database":
            return (
                _cors(jsonify(ok=False, error="db_error", detail="未配置 database.mysql.database")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        return _cors(jsonify(ok=False, error="db_error", detail=err)), HTTPStatus.SERVICE_UNAVAILABLE
    return _cors(jsonify(ok=True, rows=rows))


@app.route("/api/member-max-click-car", methods=["POST", "OPTIONS"])
def api_member_max_click_car():
    """选车页推荐：按视图返回该会员历史点击最多的车名（与 v_member_max_click_car 一致）。"""
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))
    payload = request.get_json(silent=True) or {}
    member = (payload.get("member") or "").strip()
    if not member:
        return _cors(jsonify(ok=False, error="missing_member")), HTTPStatus.BAD_REQUEST
    car_name, err = _member_max_click_car_row(member)
    if err:
        if err == "mysql_only":
            return _cors(jsonify(ok=False, error="mysql_only")), HTTPStatus.SERVICE_UNAVAILABLE
        if err == "import_pymysql":
            return (
                _cors(jsonify(ok=False, error="db_error", detail="请安装 pymysql")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if err == "no_database":
            return (
                _cors(jsonify(ok=False, error="db_error", detail="未配置 database.mysql.database")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if err == "empty_member":
            return _cors(jsonify(ok=False, error="missing_member")), HTTPStatus.BAD_REQUEST
        return _cors(jsonify(ok=False, error="db_error", detail=err)), HTTPStatus.SERVICE_UNAVAILABLE
    return _cors(jsonify(ok=True, car_name=car_name))


@app.route("/api/member-vehicle-clicks-summary", methods=["POST", "OPTIONS"])
def api_member_vehicle_clicks_summary():
    """选车页「今日推荐」：按会员汇总各车点击次数（无需 cardata 口令）。"""
    if request.method == "OPTIONS":
        return _cors(make_response("", HTTPStatus.NO_CONTENT))
    payload = request.get_json(silent=True) or {}
    member = (payload.get("member") or "").strip()
    if not member:
        return _cors(jsonify(ok=False, error="missing_member")), HTTPStatus.BAD_REQUEST
    rows, err = _member_vehicle_clicks_summary_rows(member)
    if err:
        if err == "mysql_only":
            return _cors(jsonify(ok=False, error="mysql_only")), HTTPStatus.SERVICE_UNAVAILABLE
        if err == "import_pymysql":
            return (
                _cors(jsonify(ok=False, error="db_error", detail="请安装 pymysql")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if err == "no_database":
            return (
                _cors(jsonify(ok=False, error="db_error", detail="未配置 database.mysql.database")),
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
        if err == "empty_member":
            return _cors(jsonify(ok=False, error="missing_member")), HTTPStatus.BAD_REQUEST
        return _cors(jsonify(ok=False, error="db_error", detail=err)), HTTPStatus.SERVICE_UNAVAILABLE
    return _cors(jsonify(ok=True, rows=rows))


@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


def _carpark_folder_key(name: str) -> str:
    """与前端 encodeURIComponent(car_name) 常见差异容错：去空白、NFKC，用于匹配 carpark 子目录名。"""
    s = unicodedata.normalize("NFKC", str(name or ""))
    return "".join(s.split())


def _resolve_carpark_detail_path(filename: str) -> Path | None:
    """
    请求 carpark/<车名>/car.html 时，若与磁盘目录名不完全一致（如库表为「坦克700」、文件夹为「坦克 700」），
    按去掉空白后的键匹配唯一子目录。
    """
    parts = filename.replace("\\", "/").split("/")
    if len(parts) != 3 or parts[0] != "carpark" or parts[2] != "car.html":
        return None
    carpark = ROOT / "carpark"
    if not carpark.is_dir():
        return None
    want = _carpark_folder_key(parts[1])
    if not want:
        return None
    matches: list[Path] = []
    try:
        for d in carpark.iterdir():
            if not d.is_dir():
                continue
            if _carpark_folder_key(d.name) == want:
                p = d / "car.html"
                if p.is_file():
                    matches.append(p)
    except OSError:
        return None
    if len(matches) == 1:
        return matches[0]
    return None


def _media_root() -> Path:
    """
    `/media-webp/<path:filename>` 静态资源根目录解析：
    优先 `media-webp`，兼容历史 `media` 目录。
    """
    candidates = [
        ROOT.parent / "media-webp",
        ROOT / "media-webp",
        ROOT.parent.parent / "media-webp",
        ROOT.parent / "media",          # 兼容旧目录
        ROOT / "media",                 # 兼容旧目录
        ROOT.parent.parent / "media",   # 兼容旧目录
    ]
    for p in candidates:
        if p.is_dir():
            return p
    return ROOT.parent / "media-webp"


@app.get("/media-webp/<path:filename>")
def serve_media(filename: str):
    media_dir = _media_root()
    return send_from_directory(media_dir, filename)


@app.get("/<path:filename>")
def static_files(filename: str):
    if ".." in filename or filename.startswith("/"):
        abort(404)
    target = ROOT / filename
    if target.is_file():
        return send_from_directory(ROOT, filename)
    alt = _resolve_carpark_detail_path(filename)
    if alt is not None:
        rel = alt.relative_to(ROOT)
        return send_from_directory(ROOT, rel.as_posix())
    abort(404)


if __name__ == "__main__":
    cfg = load_config()
    port = int(cfg.get("api_port") or 8765)
    host = str(cfg.get("api_host") or "0.0.0.0")
    debug = bool(cfg.get("debug"))
    app.run(host=host, port=port, debug=debug)
