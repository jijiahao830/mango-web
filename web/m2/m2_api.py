#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
m2 专用轻量接口：
- /api/cars-catalog
- /api/site-ui
- /api/activity
- /api/activity-dates

默认将请求转发到第一版 member_api（upstream），
用于 m2 在本地 file:// 预览时也能稳定取到数据。
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import urllib.error
import urllib.request
from http import HTTPStatus
from typing import Any, Dict, Tuple

from flask import Flask, jsonify, make_response, request


BASE_DIR = pathlib.Path(__file__).resolve().parents[1]
APP_CONFIG = BASE_DIR / "app_config.json"


def read_app_config() -> Dict[str, Any]:
    try:
        with APP_CONFIG.open("r", encoding="utf-8") as f:
            obj = json.load(f)
            return obj if isinstance(obj, dict) else {}
    except Exception:
        return {}


def default_upstream_from_config() -> str:
    cfg = read_app_config()
    port = int(cfg.get("api_port") or 8765)
    host = "127.0.0.1"
    return f"http://{host}:{port}"


def cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    resp.headers["Access-Control-Max-Age"] = "86400"
    return resp


def pass_options():
    if request.method == "OPTIONS":
        return cors(make_response("", 204))
    return None


def fetch_json(url: str, timeout: float = 8.0) -> Tuple[int, Dict[str, Any]]:
    req = urllib.request.Request(url, method="GET", headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            status = int(getattr(r, "status", 200))
            raw = r.read()
            try:
                data = json.loads(raw.decode("utf-8", errors="replace"))
            except Exception:
                data = {"ok": False, "error": "invalid_json", "detail": "上游返回非 JSON"}
            if not isinstance(data, dict):
                data = {"ok": False, "error": "invalid_payload", "detail": "上游 JSON 不是对象"}
            return status, data
    except urllib.error.HTTPError as e:
        try:
            raw = e.read()
            data = json.loads(raw.decode("utf-8", errors="replace"))
            if not isinstance(data, dict):
                data = {"ok": False, "error": "upstream_http_error", "status": int(e.code)}
        except Exception:
            data = {"ok": False, "error": "upstream_http_error", "status": int(e.code)}
        return int(e.code), data
    except Exception as e:
        return int(HTTPStatus.BAD_GATEWAY), {"ok": False, "error": "upstream_unreachable", "detail": str(e)}


def create_app(upstream_base: str) -> Flask:
    app = Flask(__name__)

    @app.after_request
    def _after(resp):
        return cors(resp)

    @app.route("/health", methods=["GET", "OPTIONS"])
    def health():
        pre = pass_options()
        if pre is not None:
            return pre
        return cors(jsonify(ok=True, service="m2_api", upstream=upstream_base))

    @app.route("/api/cars-catalog", methods=["GET", "OPTIONS"])
    def api_cars_catalog():
        pre = pass_options()
        if pre is not None:
            return pre
        status, payload = fetch_json(f"{upstream_base}/api/cars-catalog")
        return cors(make_response(jsonify(payload), status))

    @app.route("/api/site-ui", methods=["GET", "OPTIONS"])
    def api_site_ui():
        pre = pass_options()
        if pre is not None:
            return pre
        status, payload = fetch_json(f"{upstream_base}/api/site-ui")
        return cors(make_response(jsonify(payload), status))

    @app.route("/api/activity", methods=["GET", "OPTIONS"])
    def api_activity():
        pre = pass_options()
        if pre is not None:
            return pre
        qs = request.query_string.decode("utf-8") if request.query_string else ""
        url = f"{upstream_base}/api/activity"
        if qs:
            url += "?" + qs
        status, payload = fetch_json(url)
        return cors(make_response(jsonify(payload), status))

    @app.route("/api/activity-dates", methods=["GET", "OPTIONS"])
    def api_activity_dates():
        pre = pass_options()
        if pre is not None:
            return pre
        qs = request.query_string.decode("utf-8") if request.query_string else ""
        url = f"{upstream_base}/api/activity-dates"
        if qs:
            url += "?" + qs
        status, payload = fetch_json(url)
        return cors(make_response(jsonify(payload), status))

    return app


def main() -> None:
    cfg = read_app_config()
    parser = argparse.ArgumentParser(description="m2 lightweight api gateway")
    parser.add_argument("--host", default=str(cfg.get("m2_api_host") or "0.0.0.0"))
    parser.add_argument("--port", type=int, default=int(cfg.get("m2_api_port") or 8787))
    parser.add_argument("--upstream", default=os.environ.get("M2_UPSTREAM") or default_upstream_from_config())
    args = parser.parse_args()

    app = create_app(str(args.upstream).rstrip("/"))
    app.run(host=args.host, port=args.port, debug=False)


if __name__ == "__main__":
    main()

