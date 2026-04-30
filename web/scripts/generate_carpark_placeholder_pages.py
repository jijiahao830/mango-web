#!/usr/bin/env python3
"""
为 carpark 下尚未创建 car.html 的车型目录生成详情页（排版与「兰博基尼 Huracán LP580-2」一致）。

默认从 MySQL 表 `cars` 读取与文件夹名一致的 `car_name`，填充品牌、型号、日租金、分类；
文案与性能参数优先按表 `category`（行政级轿车 / 豪华SUV / 超跑 等），无记录时按车名启发式推断。
图片统一引用 ./封面.jpg（及 webp），请后续放入素材。

依赖：与 member_api 相同，在 web/app_config.json 的 database.mysql 中配置连接；表结构见用户 SQL。

用法（在 web 目录下）：
  python3 scripts/generate_carpark_placeholder_pages.py

新车入库后（cars.car_name 与文件夹名须完全一致）：
  python3 scripts/generate_carpark_placeholder_pages.py --ensure-names "宾利飞驰" "坦克 700"

可选：
  python3 scripts/generate_carpark_placeholder_pages.py --dry-run
  python3 scripts/generate_carpark_placeholder_pages.py --no-db   # 不连库，租金占位 888
  python3 scripts/generate_carpark_placeholder_pages.py --force          # 仅重写带占位标记的页
  python3 scripts/generate_carpark_placeholder_pages.py --force-any      # 强制重写任意已有 car.html（慎用）
"""
from __future__ import annotations

import argparse
import html
import json
import re
import shutil
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent
CARPARK = WEB / "carpark"
CONFIG_PATH = WEB / "app_config.json"
TEMPLATE_DIR = CARPARK / "兰博基尼 Huracán LP580-2"
SHARED_ASSET_PREFIX = "../兰博基尼%20Huracán%20LP580-2/"  # 展览图、引擎声（避免 96 份重复拷贝）


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def split_hero(name: str) -> tuple[str, str]:
    """标题两行：优先「×× 款」后换行，否则「首词 / 其余」。"""
    name = name.strip()
    m = re.match(r"^(\d{2,4}\s*款)\s*(.+)$", name)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    parts = name.split()
    if len(parts) <= 1:
        return name, ""
    if len(parts) == 2:
        return parts[0], parts[1]
    return parts[0], " ".join(parts[1:])


def load_app_config() -> dict:
    if not CONFIG_PATH.is_file():
        return {}
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def fetch_cars_by_name(config: dict) -> dict[str, dict]:
    """car_name -> 行 dict（car_name, brand, model, rent_price, category）。"""
    db = config.get("database") or {}
    mq = db.get("mysql") or {}
    if not mq.get("host") or not mq.get("database"):
        return {}
    try:
        import pymysql
        from pymysql.cursors import DictCursor
    except ImportError as e:
        raise RuntimeError("请安装 pymysql：pip install pymysql") from e

    table = (db.get("cars_table") or "cars").strip()
    if not re.match(r"^[A-Za-z0-9_]+$", table):
        raise ValueError("database.cars_table 只能包含字母数字下划线")

    conn = pymysql.connect(
        host=mq["host"],
        port=int(mq.get("port") or 3306),
        user=mq["user"],
        password=mq.get("password") or "",
        database=mq["database"],
        charset="utf8mb4",
        cursorclass=DictCursor,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT car_name, brand, model, rent_price, category FROM `{table}` "
                f"WHERE `status` = 1"
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    out: dict[str, dict] = {}
    for r in rows:
        cn = (r.get("car_name") or "").strip()
        if cn:
            out[cn] = r
    return out


def profile_from_category(category: str) -> dict:
    """按数据库 category 字段映射到与 infer_profile 相同结构的 p。"""
    c = (category or "").strip()
    c_norm = c.replace(" ", "").lower()
    key: str | None = None
    for zh, code in [
        ("行政级轿车", "exec"),
        ("豪华SUV", "lux_suv"),
        ("豪华suv", "lux_suv"),
        ("超跑", "supercar"),
        ("性能车", "performance"),
        ("新能源", "ev"),
        ("商务车", "van"),
        ("轿车", "sedan"),
        ("越野车", "suv_off"),
        ("皮卡", "pickup"),
    ]:
        if c == zh or c_norm == zh.replace(" ", "").lower():
            key = code
            break
    if key is None:
        key = "default"

    if key == "exec":
        return {
            "kind": "lux_sedan",
            "s0": "5.5s",
            "vmax": "250km/h",
            "hp": "350马力级",
            "eng": "3.0T / 高功率涡轮",
            "spec_eng": "涡轮增压 / 48V 轻混",
            "spec_pw": "—",
            "spec_torque": "—",
            "spec_gear": "8AT / 9AT",
            "spec_0100": "—",
            "spec_top": "电子限速 250km/h",
            "spec_drive": "后驱 / 四驱",
            "spec_susp": "多连杆 / 空气悬挂",
            "dim_line": "行政级轴距",
            "dim_wheel": "—",
            "dim_mass": "—",
        }
    if key == "lux_suv":
        return {
            "kind": "lux_suv",
            "s0": "5.0s",
            "vmax": "240km/h",
            "hp": "400马力级",
            "eng": "3.0T / V8 涡轮",
            "spec_eng": "涡轮增压",
            "spec_pw": "—",
            "spec_torque": "—",
            "spec_gear": "8AT / 9AT",
            "spec_0100": "—",
            "spec_top": "—",
            "spec_drive": "全时四驱",
            "spec_susp": "空气悬挂",
            "dim_line": "中大型豪华 SUV",
            "dim_wheel": "—",
            "dim_mass": "—",
        }
    if key == "supercar":
        return {
            "kind": "supercar",
            "s0": "3.2s",
            "vmax": "330km/h",
            "hp": "600马力级",
            "eng": "高性能动力单元",
            "spec_eng": "大排量 / 涡轮增压或高转自吸",
            "spec_pw": "约 500–800 马力",
            "spec_torque": "—",
            "spec_gear": "双离合 / 序列式",
            "spec_0100": "约 3 秒内级",
            "spec_top": "300km/h+ 级",
            "spec_drive": "中置 / 后置",
            "spec_susp": "运动型悬挂",
            "dim_line": "典型超跑尺寸",
            "dim_wheel": "—",
            "dim_mass": "以轻量化为导向",
        }
    if key == "performance":
        return {
            "kind": "performance",
            "s0": "4.0s",
            "vmax": "280km/h",
            "hp": "450马力级",
            "eng": "高功率涡轮 / 自吸",
            "spec_eng": "—",
            "spec_pw": "—",
            "spec_torque": "—",
            "spec_gear": "双离合 / 8AT",
            "spec_0100": "—",
            "spec_top": "—",
            "spec_drive": "后驱 / 四驱",
            "spec_susp": "运动悬挂",
            "dim_line": "—",
            "dim_wheel": "—",
            "dim_mass": "—",
        }
    if key == "ev":
        return {
            "kind": "ev",
            "s0": "4.5s",
            "vmax": "220km/h",
            "hp": "400kW 级",
            "eng": "纯电驱动",
            "spec_eng": "永磁同步电机 / 双电机",
            "spec_pw": "—",
            "spec_torque": "瞬时大扭矩",
            "spec_gear": "单速减速器",
            "spec_0100": "—",
            "spec_top": "—",
            "spec_drive": "四驱 / 后驱",
            "spec_susp": "多连杆 / 空气悬挂",
            "dim_line": "—",
            "dim_wheel": "—",
            "dim_mass": "含电池组",
        }
    if key == "van":
        return {
            "kind": "van",
            "s0": "8.5s",
            "vmax": "180km/h",
            "hp": "250马力级",
            "eng": "2.0T / 混动",
            "spec_eng": "涡轮增压 / 混动",
            "spec_pw": "—",
            "spec_torque": "—",
            "spec_gear": "自动 / E-CVT",
            "spec_0100": "—",
            "spec_top": "—",
            "spec_drive": "前驱 / 四驱",
            "spec_susp": "舒适取向",
            "dim_line": "全尺寸座舱",
            "dim_wheel": "—",
            "dim_mass": "—",
        }
    if key == "sedan":
        return {
            "kind": "sedan",
            "s0": "7.5s",
            "vmax": "220km/h",
            "hp": "200马力级",
            "eng": "涡轮增压",
            "spec_eng": "—",
            "spec_pw": "—",
            "spec_torque": "—",
            "spec_gear": "双离合 / AT",
            "spec_0100": "—",
            "spec_top": "—",
            "spec_drive": "前驱 / 后驱",
            "spec_susp": "独立悬挂",
            "dim_line": "标准三厢轿车",
            "dim_wheel": "—",
            "dim_mass": "—",
        }
    if key == "suv_off":
        return {
            "kind": "suv_off",
            "s0": "6.0s",
            "vmax": "210km/h",
            "hp": "400马力级",
            "eng": "V6 / V8 / 混动",
            "spec_eng": "大排量涡轮 / 自吸",
            "spec_pw": "—",
            "spec_torque": "—",
            "spec_gear": "8AT / 9AT",
            "spec_0100": "—",
            "spec_top": "—",
            "spec_drive": "四驱为主",
            "spec_susp": "越野 / 空气悬挂",
            "dim_line": "非承载 / 高离地间隙",
            "dim_wheel": "—",
            "dim_mass": "—",
        }
    if key == "pickup":
        return {
            "kind": "pickup",
            "s0": "6.0s",
            "vmax": "180km/h",
            "hp": "400马力级",
            "eng": "V6 / V8 涡轮",
            "spec_eng": "—",
            "spec_pw": "—",
            "spec_torque": "高扭矩",
            "spec_gear": "8AT / 10AT",
            "spec_0100": "—",
            "spec_top": "—",
            "spec_drive": "四驱",
            "spec_susp": "非承载式",
            "dim_line": "皮卡货舱 + 乘员舱",
            "dim_wheel": "—",
            "dim_mass": "—",
        }
    return {
        "kind": "default",
        "s0": "6.5s",
        "vmax": "230km/h",
        "hp": "300马力级",
        "eng": "涡轮增压 / 自吸",
        "spec_eng": "—",
        "spec_pw": "—",
        "spec_torque": "—",
        "spec_gear": "自动变速",
        "spec_0100": "—",
        "spec_top": "—",
        "spec_drive": "前驱 / 后驱 / 四驱",
        "spec_susp": "独立悬挂",
        "dim_line": "—",
        "dim_wheel": "—",
        "dim_mass": "—",
    }


def infer_profile_from_db(category: str | None, name: str) -> dict:
    c = (category or "").strip()
    if c:
        return profile_from_category(c)
    return infer_profile(name)


def infer_profile(name: str) -> dict:
    n = name
    if any(
        k in n
        for k in (
            "法拉利",
            "兰博基尼",
            "迈凯伦",
            "911",
            "992",
            "R8",
            "GT-R",
            "GTR",
            "SF90",
            "488",
            "458",
            "296",
            "F8",
            "大牛",
            "Urus",
        )
    ):
        return {
            "kind": "supercar",
            "s0": "3.2s",
            "vmax": "330km/h",
            "hp": "600马力级",
            "eng": "高性能动力单元",
            "spec_eng": "大排量 / 涡轮增压或高转自吸",
            "spec_pw": "约 500–800 马力",
            "spec_torque": "—",
            "spec_gear": "双离合 / 序列式",
            "spec_0100": "约 3 秒内级",
            "spec_top": "300km/h+ 级",
            "spec_drive": "中置 / 后置",
            "spec_susp": "运动型悬挂",
            "dim_line": "典型超跑尺寸",
            "dim_wheel": "—",
            "dim_mass": "以轻量化为导向",
        }
    if any(k in n for k in ("埃尔法", "威尔法", "GL8", "威霆", "迈巴赫", "梦想家", "腾势", "M8", "D9", "考斯特", "房车", "MEGA", "商务")):
        return {
            "kind": "van",
            "s0": "8.5s",
            "vmax": "180km/h",
            "hp": "250马力级",
            "eng": "2.0T / 混动",
            "spec_eng": "涡轮增压 / 混动",
            "spec_pw": "—",
            "spec_torque": "—",
            "spec_gear": "自动 / E-CVT",
            "spec_0100": "—",
            "spec_top": "—",
            "spec_drive": "前驱 / 四驱",
            "spec_susp": "舒适取向",
            "dim_line": "全尺寸座舱",
            "dim_wheel": "—",
            "dim_mass": "—",
        }
    if any(k in n for k in ("坦克", "普拉多", "酷路泽", "卫士", "揽胜", "陆巡", "越野", "猛禽", "霸王龙", "皮卡", "F-150", "G63", "G500", "G350", "G级", "库里南")):
        return {
            "kind": "suv_off",
            "s0": "6.0s",
            "vmax": "210km/h",
            "hp": "400马力级",
            "eng": "V6 / V8 / 混动",
            "spec_eng": "大排量涡轮 / 自吸",
            "spec_pw": "—",
            "spec_torque": "—",
            "spec_gear": "8AT / 9AT",
            "spec_0100": "—",
            "spec_top": "—",
            "spec_drive": "四驱为主",
            "spec_susp": "空气悬挂 / 越野悬挂",
            "dim_line": "全尺寸 SUV / 越野",
            "dim_wheel": "—",
            "dim_mass": "—",
        }
    if any(k in n for k in ("特斯拉", "理想", "小米", "问界", "岚图", "路特斯 ELETRE", "Taycan", "EQS", "EQ", "纯电", "电动")):
        return {
            "kind": "ev",
            "s0": "4.5s",
            "vmax": "220km/h",
            "hp": "400kW 级",
            "eng": "纯电驱动",
            "spec_eng": "永磁同步电机 / 双电机",
            "spec_pw": "—",
            "spec_torque": "瞬时大扭矩",
            "spec_gear": "单速减速器",
            "spec_0100": "—",
            "spec_top": "—",
            "spec_drive": "四驱 / 后驱",
            "spec_susp": "多连杆 / 空气悬挂",
            "dim_line": "—",
            "dim_wheel": "—",
            "dim_mass": "含电池组",
        }
    if any(k in n for k in ("C63", "AMG GT", "宝马 M2", "宝马 M3", "宝马 M4", "宝马 M5", "奥迪 RS", "黑翼")):
        return {
            "kind": "performance",
            "s0": "4.0s",
            "vmax": "280km/h",
            "hp": "450马力级",
            "eng": "高性能涡轮 / V8",
            "spec_eng": "大排量涡轮 / 高功率调校",
            "spec_pw": "—",
            "spec_torque": "—",
            "spec_gear": "双离合 / 9AT",
            "spec_0100": "—",
            "spec_top": "—",
            "spec_drive": "后驱 / 四驱",
            "spec_susp": "运动悬挂",
            "dim_line": "轿跑 / 性能轿车",
            "dim_wheel": "—",
            "dim_mass": "—",
        }
    if any(k in n for k in ("奔驰 S", "迈巴赫", "古思特", "幻影", "慕尚", "A8", "帕拉梅拉", "奥迪 A6", "宝马 7", "宾利", "总裁")):
        return {
            "kind": "lux_sedan",
            "s0": "5.5s",
            "vmax": "250km/h",
            "hp": "350马力级",
            "eng": "3.0T / 4.0T V8",
            "spec_eng": "涡轮增压 / 48V 轻混",
            "spec_pw": "—",
            "spec_torque": "—",
            "spec_gear": "8AT / 9AT",
            "spec_0100": "—",
            "spec_top": "电子限速 250km/h",
            "spec_drive": "后驱 / 四驱",
            "spec_susp": "空气悬挂",
            "dim_line": "行政级轴距",
            "dim_wheel": "—",
            "dim_mass": "—",
        }
    return {
        "kind": "default",
        "s0": "6.5s",
        "vmax": "230km/h",
        "hp": "300马力级",
        "eng": "涡轮增压 / 自吸",
        "spec_eng": "—",
        "spec_pw": "—",
        "spec_torque": "—",
        "spec_gear": "自动变速",
        "spec_0100": "—",
        "spec_top": "—",
        "spec_drive": "前驱 / 后驱 / 四驱",
        "spec_susp": "独立悬挂",
        "dim_line": "—",
        "dim_wheel": "—",
        "dim_mass": "—",
    }


def feature_copy(name: str, p: dict) -> tuple[tuple[str, str], tuple[str, str], tuple[str, str]]:
    k = p["kind"]
    if k == "supercar":
        return (
            ("雕塑感造型", f"{name} 拥有极具辨识度的超跑比例与侵略性线条，静止时亦充满张力。芒果超跑实车整备，适合拍摄与展示。"),
            ("动力与声浪", "高性能动力单元带来凌厉加速与标志性声浪体验。建议预约到店看车与试驾。"),
            ("座舱氛围", "运动桶椅、Alcantara 与碳纤维细节营造竞技氛围；人机布局强调驾驶专注度。"),
        )
    if k == "van":
        return (
            ("奢适空间", f"{name} 侧重后排乘坐体验，宽裕腿部空间与舒适座椅，适合商务接待与家庭长途。"),
            ("静谧与配置", "双侧电滑门、独立空调与多媒体配置，让旅途更从容。"),
            ("灵活场景", "接机、会议转场、团队出行一车搞定，芒果超跑支持送车上门。"),
        )
    if k in ("suv_off",):
        return (
            ("气场与通过性", f"{name} 高坐姿与全地形能力，兼顾公路巡航与轻度越野场景。"),
            ("动力储备", "大排量或高扭矩输出，高速超车与满载爬坡更有底气。"),
            ("全场景出行", "自驾穿越、露营、摄影跟车——空间与视野兼备。"),
        )
    if k == "ev":
        return (
            ("智能电动体验", f"{name} 以电驱瞬时扭矩与静谧行驶为特点，城市通勤与长途皆可兼顾。"),
            ("续航与补能", "支持快充/家充策略。"),
            ("科技座舱", "大屏互联、辅助驾驶与 OTA 能力因车型而异，欢迎预约体验。"),
        )
    if k == "lux_sedan":
        return (
            ("行政级气场", f"{name} 以修长车身与精致内饰呈现尊贵质感，适合商务与重要场合。"),
            ("舒适驾乘", "空气悬挂与隔音工程，让行程更平稳安静。"),
            ("细节工艺", "真皮、金属与木饰搭配，灯光与座椅调节带来仪式感。"),
        )
    if k == "lux_suv":
        return (
            ("旗舰 SUV 气场", f"{name} 高坐姿与宽体车身带来强大公路存在感，宜商宜家。"),
            ("四驱与舒适", "全时四驱配合空气悬挂，长途与雨雪路面更从容。"),
            ("奢享座舱", "真皮与科技配置堆叠，后排与载物空间兼顾。"),
        )
    if k == "performance":
        return (
            ("凌厉动态", f"{name} 强调弯道与加速反馈，转向与底盘调校偏运动取向。"),
            ("动力响应", "高功率输出与运动排气声浪，公路与赛道日皆可驾驭（以法规与实车为准）。"),
            ("驾驶氛围", "运动座椅与包裹感内饰，激发驾驶欲望。"),
        )
    if k == "sedan":
        return (
            ("均衡实用", f"{name} 适合日常通勤与家庭出行，油耗与空间表现均衡。"),
            ("驾乘舒适", "独立悬挂滤震，城市代步轻松惬意。"),
            ("配置丰富", "科技与安全配置因年款而异，欢迎预约看车。"),
        )
    if k == "pickup":
        return (
            ("多功能属性", f"{name} 兼顾乘员舱与货厢，越野、露营与载物场景皆可胜任。"),
            ("高扭矩输出", "低速四驱与大扭矩，适合非铺装路面与拖挂需求。"),
            ("个性风格", "硬派造型与高离地间隙，户外摄影与自驾同样出片。"),
        )
    return (
        ("外观设计", f"{name} 线条流畅、辨识度高，适合城市巡游与影像记录。"),
        ("动力匹配", "动力与底盘调校兼顾日常易驾与高速稳定。"),
        ("内饰与体验", "座舱布局与科技配置因年款与选装不同，建议到店实车感受。"),
    )


def scenario_block(name: str, p: dict) -> tuple[str, str, list[str]]:
    k = p["kind"]
    if k == "supercar":
        title = "摆展 / 影像"
        desc = f"将 {name} 置于活动入口或秀场主视觉区，超跑比例与漆面光影极易出片，为品牌与活动拉升格调。"
        feats = [
            "✓ 高辨识度造型，吸睛引流",
            "✓ 适合时尚 / 汽车 / 科技类活动",
            "✓ 支持静态展示与车队拍摄",
            "✓ 芒果超跑可提供现场协调建议",
        ]
    elif k == "van":
        title = "商务接待"
        desc = f"{name} 适合机场接送、贵宾接待与团队出行，后排体验优先，让每一次抵达都体面从容。"
        feats = ["✓ 宽裕乘坐空间", "✓ 静音与舒适取向", "✓ 多用途场景覆盖", "✓ 可预约司机与路线"]
    elif k == "lux_suv":
        title = "商务自驾"
        desc = f"{name} 适合高端接待与家庭长途，公路舒适性与气场兼备。"
        feats = ["✓ 四驱安心", "✓ 空间宽裕", "✓ 宜商宜家", "✓ 送车上门"]
    elif k == "performance":
        title = "跑山 / 周末驾控"
        desc = f"用 {name} 开启一段注重驾驶乐趣的旅程，山路与环线皆宜（请遵守交规与安全驾驶）。"
        feats = ["✓ 运动化调校", "✓ 动力储备充沛", "✓ 适合结伴自驾", "✓ 保险与手续协助"]
    elif k == "sedan":
        title = "日常通勤"
        desc = f"{name} 适合城市代步与短途出行，轻松好开、停车灵活。"
        feats = ["✓ 租期灵活", "✓ 油耗友好", "✓ 送车便捷", "✓ 客服响应"]
    elif k == "pickup":
        title = "户外 / 露营"
        desc = f"{name} 适合露营装备装载与郊野道路，摄影与自驾同样出彩。"
        feats = ["✓ 货厢实用", "✓ 高离地间隙", "✓ 四驱可选", "✓ 保险齐全"]
    else:
        title = "自驾出游"
        desc = f"驾驶 {name} 城市巡航或周末短途，芒果超跑提供保险与送车服务，让旅程更省心。"
        feats = ["✓ 灵活租期", "✓ 送车上门", "✓ 保险与手续协助", "✓ 客服全程响应"]
    return title, desc, feats


def hero_lines(folder_name: str, row: dict | None) -> tuple[str, str]:
    if row:
        b = str(row.get("brand") or "").strip()
        m = str(row.get("model") or "").strip()
        if b and m:
            return b, m
    return split_hero(folder_name)


def build_html(folder_name: str, row: dict | None = None) -> str:
    display_name = (
        str(row.get("car_name")).strip()
        if row and row.get("car_name")
        else folder_name.strip()
    )
    cat = row.get("category") if row else None
    p = infer_profile_from_db(str(cat) if cat is not None else None, folder_name)
    l1, l2 = hero_lines(folder_name, row)
    f1, f2, f3 = feature_copy(display_name, p)
    scen_title, scen_desc, scen_feats = scenario_block(display_name, p)
    hero_html = (
        f'<h1 class="hero-title">\n        {esc(l1)}<br>\n        <span class="hero-title-highlight">{esc(l2)}</span>\n      </h1>'
        if l2
        else f'<h1 class="hero-title">\n        <span class="hero-title-highlight">{esc(l1)}</span>\n      </h1>'
    )

    def li_rows(items: list[str]) -> str:
        return "\n".join(f"            <li>{esc(x)}</li>" for x in items)

    cta = f"准备好体验 {display_name} 了吗？"
    if row and row.get("rent_price") is not None:
        try:
            price = str(int(row["rent_price"]))
        except (TypeError, ValueError):
            price = "888"
    else:
        price = "888"

    db_comment = ""
    if row:
        db_comment = (
            f"\n  <!-- cars 表: brand={esc(str(row.get('brand') or ''))} "
            f"model={esc(str(row.get('model') or ''))} "
            f"category={esc(str(row.get('category') or ''))} "
            f"rent_price={price} -->"
        )

    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/png" href="../../logo/logo2.png">

  <title>{esc(display_name)} · 芒果超跑</title>
  <link rel="stylesheet" href="./car.css">
  <link rel="stylesheet" href="../detail-other-models.css">
  <link rel="stylesheet" href="../similar-price-cars.css">
  <link rel="stylesheet" href="../scenario-showcase.css">
</head>
<body data-daily-price="{price}" data-car-display-name="{esc(display_name)}"><!-- GENERATED_CARPARK_PLACEHOLDER -->{db_comment}

  <header class="detail-header">
    <div class="header-left-btn">
      <a href="../../car.html#carGrid" class="back-btn">← 返回车库</a>
    </div>
    <div class="header-center-nav">
      <div class="dropdown-container">
        <span class="dropdown-trigger">其他车型 <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg></span>
        <div class="dropdown-menu">
          <div class="dropdown-menu-inner"></div>
          <div class="dropdown-grid">
            <!-- 可在此添加同品牌车型链接 -->
          </div>
        </div>
      </div>
    </div>
    <div class="header-right-logo">
      <a href="../../car.html">
        <img src="../../logo/logo2.png" alt="芒果超跑" class="header-right-logo-img">
      </a>
    </div>
  </header>

  <section class="hero-detail">
    <div class="hero-bg-overlay"></div>
    <div class="hero-content-wrapper">
      {hero_html}
    </div>
    <div class="hero-image-main">
      <picture>
        <source srcset="./封面.webp" type="image/webp">
        <img src="./封面.jpg" alt="{esc(display_name)}">
      </picture>
    </div>
  </section>

  <section class="stats-section">
    <div class="container">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">⚡</div>
          <div class="stat-value">{esc(p["s0"])}</div>
          <div class="stat-label">0-100km/h</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏁</div>
          <div class="stat-value">{esc(p["vmax"])}</div>
          <div class="stat-label">最高时速</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🐎</div>
          <div class="stat-value">{esc(p["hp"])}</div>
          <div class="stat-label">最大功率</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🔧</div>
          <div class="stat-value">{esc(p["eng"])}</div>
          <div class="stat-label">发动机/动力</div>
        </div>
      </div>
    </div>
  </section>

  <section class="features-section">
    <div class="container">
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-image">
            <picture>
              <source srcset="./封面.webp" type="image/webp">
              <img src="./封面.jpg" alt="{esc(f1[0])}">
            </picture>
          </div>
          <div class="feature-content">
            <h3 class="feature-title">{esc(f1[0])}</h3>
            <p class="feature-desc">{esc(f1[1])}</p>
          </div>
        </div>
        <div class="feature-card feature-card-reverse">
          <div class="feature-image">
            <picture>
              <source srcset="./封面.webp" type="image/webp">
              <img src="./封面.jpg" alt="{esc(f2[0])}">
            </picture>
          </div>
          <div class="feature-content">
            <h3 class="feature-title">{esc(f2[0])}</h3>
            <p class="feature-desc">{esc(f2[1])}</p>
          </div>
        </div>
        <div class="feature-card">
          <div class="feature-image">
            <picture>
              <source srcset="./封面.webp" type="image/webp">
              <img src="./封面.jpg" alt="{esc(f3[0])}">
            </picture>
          </div>
          <div class="feature-content">
            <h3 class="feature-title">{esc(f3[0])}</h3>
            <p class="feature-desc">{esc(f3[1])}</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="specs-section">
    <div class="container">
      <h2 class="section-title">技术规格</h2>
      <div class="specs-grid">
        <div class="spec-group">
          <h3 class="spec-group-title">动力系统</h3>
          <div class="spec-item">
            <span class="spec-key">发动机</span>
            <span class="spec-value">{esc(p["spec_eng"])}</span>
          </div>
          <div class="spec-item">
            <span class="spec-key">最大功率</span>
            <span class="spec-value">{esc(p["spec_pw"])}</span>
          </div>
          <div class="spec-item">
            <span class="spec-key">最大扭矩</span>
            <span class="spec-value">{esc(p["spec_torque"])}</span>
          </div>
          <div class="spec-item">
            <span class="spec-key">变速箱</span>
            <span class="spec-value">{esc(p["spec_gear"])}</span>
          </div>
        </div>
        <div class="spec-group">
          <h3 class="spec-group-title">性能表现</h3>
          <div class="spec-item">
            <span class="spec-key">0-100km/h</span>
            <span class="spec-value">{esc(p["spec_0100"])}</span>
          </div>
          <div class="spec-item">
            <span class="spec-key">最高时速</span>
            <span class="spec-value">{esc(p["spec_top"])}</span>
          </div>
          <div class="spec-item">
            <span class="spec-key">驱动方式</span>
            <span class="spec-value">{esc(p["spec_drive"])}</span>
          </div>
          <div class="spec-item">
            <span class="spec-key">悬挂系统</span>
            <span class="spec-value">{esc(p["spec_susp"])}</span>
          </div>
        </div>
        <div class="spec-group">
          <h3 class="spec-group-title">车身尺寸</h3>
          <div class="spec-item">
            <span class="spec-key">长×宽×高</span>
            <span class="spec-value">{esc(p["dim_line"])}</span>
          </div>
          <div class="spec-item">
            <span class="spec-key">轴距</span>
            <span class="spec-value">{esc(p["dim_wheel"])}</span>
          </div>
          <div class="spec-item">
            <span class="spec-key">整备质量</span>
            <span class="spec-value">{esc(p["dim_mass"])}</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="gallery-section">
    <div class="container">
      <h2 class="section-title">实车图赏</h2>
      <div class="gallery-main">
        <div class="gallery-featured">
          <picture id="featuredPicture">
            <source id="featuredSource" srcset="./封面.webp" type="image/webp">
            <img src="./封面.jpg" alt="{esc(display_name)} 实车图赏" class="featured-image" id="featuredImage">
          </picture>
          <button class="gallery-arrow gallery-arrow-prev" id="prevBtn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button class="gallery-arrow gallery-arrow-next" id="nextBtn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
        <div class="gallery-thumbnails">
          <div class="thumbnail-item active" data-image="./封面.jpg">
            <picture>
              <source srcset="./封面.webp" type="image/webp">
              <img src="./封面.jpg" alt="{esc(display_name)} 细节">
            </picture>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="services-section">
    <div class="container">
      <h2 class="section-title">尊享服务 · 无忧出行</h2>
      <div class="services-grid">
        <div class="service-card">
          <div class="service-icon">👨‍✈️</div>
          <h3 class="service-title">专属管家</h3>
          <p class="service-desc">24小时私人管家一对一服务，管家全程陪同看车选车</p>
        </div>
        <div class="service-card">
          <div class="service-icon">🏎️</div>
          <h3 class="service-title">全城送车</h3>
          <p class="service-desc">免费上门送车，让您随时随地，安心便捷取车</p>
        </div>
        <div class="service-card">
          <div class="service-icon">🛡️</div>
          <h3 class="service-title">千万保险</h3>
          <p class="service-desc">全额保险保障，可有效降低，安心保障</p>
        </div>
        <div class="service-card">
          <div class="service-icon">🔒</div>
          <h3 class="service-title">隐私保护</h3>
          <p class="service-desc">严格保密客户信息，助你安心自在享受</p>
        </div>
      </div>
    </div>
  </section>

  <section class="scenario-showcase-section">
    <div class="container">
      <h2 class="section-title">经典使用场景</h2>
      <div class="scenario-showcase">
        <div class="scenario-showcase-image">
          <picture>
            <source srcset="{SHARED_ASSET_PREFIX}展览.webp" type="image/webp">
            <img src="{SHARED_ASSET_PREFIX}展览.png" alt="经典使用场景">
          </picture>
        </div>
        <div class="scenario-showcase-content">
          <h3 class="scenario-showcase-title">{esc(scen_title)}</h3>
          <p class="scenario-showcase-desc">{esc(scen_desc)}</p>
          <ul class="scenario-features">
{li_rows(scen_feats)}
          </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="cta-section">
    <div class="container">
      <div class="cta-content">
        <h2 class="cta-title">{esc(cta)}</h2>
        <div class="ignition-system">
          <div class="ignition-housing">
            <div class="ignition-cover" id="ignitionCover">
              <div class="cover-face cover-front">
                <img src="../../logo/点火.png" alt="点火盖" class="cover-img">
              </div>
              <div class="cover-face cover-back">
                <img src="../../logo/点火.png" alt="点火盖" class="cover-img">
              </div>
            </div>
            <button class="ignition-btn" id="ignitionBtn">
              <div class="ignition-btn-inner">
                <span class="btn-text-start">START</span>
                <span class="btn-text-engine">ENGINE</span>
                <span class="btn-text-stop">STOP</span>
              </div>
            </button>
          </div>
          <p class="ignition-hint">点击点火，聆听引擎声浪</p>
        </div>
        <audio id="engine-audio" src="{SHARED_ASSET_PREFIX}engine.mp3" preload="auto"></audio>
      </div>
    </div>
  </section>

  <section class="similar-cars-section" id="similarCarsSection">
    <div class="container">
      <h2 class="similar-cars-title">同价位其他车</h2>
      <p class="similar-cars-subtitle">加载中…</p>
      <div class="similar-cars-row-outer">
        <div class="similar-cars-carousel" id="similarCarsGrid">
        </div>
      </div>
    </div>
  </section>

  <script>
    document.addEventListener('DOMContentLoaded', function() {{
      var body = document.body;
      var currentPrice = parseInt(body.getAttribute('data-daily-price'), 10);
      var currentCarName = (body.getAttribute('data-car-display-name') || '').trim();
      var similarCarsGrid = document.getElementById('similarCarsGrid');
      var similarCarsSection = document.getElementById('similarCarsSection');
      if (!similarCarsGrid || !similarCarsSection) return;
      if (!currentPrice || isNaN(currentPrice) || !currentCarName) return;
      function formatPriceThousands(num) {{
        return String(num).replace(/\\B(?=(\\d{{3}})+(?!\\d))/g, ',');
      }}
      function updateSimilarRowLayout() {{
        var row = similarCarsGrid;
        if (!row || !row.children.length) return;
        row.classList.remove('is-centered');
        requestAnimationFrame(function () {{
          var styles = window.getComputedStyle(row);
          var gap = parseFloat(styles.columnGap || styles.gap) || 20;
          var total = 0;
          var i;
          for (i = 0; i < row.children.length; i++) {{
            total += row.children[i].getBoundingClientRect().width;
          }}
          if (row.children.length > 1) total += gap * (row.children.length - 1);
          if (total <= row.clientWidth + 2) {{
            row.classList.add('is-centered');
          }}
        }});
      }}
      var layoutResizeTimer;
      window.addEventListener('resize', function () {{
        clearTimeout(layoutResizeTimer);
        layoutResizeTimer = setTimeout(updateSimilarRowLayout, 120);
      }});
      function appendSimilarCarCard(link) {{
        var originalHref = link.getAttribute('href');
        if (originalHref && originalHref.startsWith('./carpark/')) {{
          link.setAttribute('href', originalHref.replace('./carpark/', '../'));
        }}
        link.querySelectorAll('source').forEach(function (source) {{
          var srcset = source.getAttribute('srcset');
          if (srcset && srcset.indexOf('./carpark/') !== -1) {{
            source.setAttribute('srcset', srcset.replace(/\\.\\/carpark\\//g, '../'));
          }}
        }});
        link.querySelectorAll('img').forEach(function (img) {{
          var src = img.getAttribute('src');
          if (src && src.indexOf('./carpark/') !== -1) {{
            img.setAttribute('src', src.replace(/\\.\\/carpark\\//g, '../'));
          }}
        }});
        if (!link.querySelector('.car-info')) return;
        similarCarsGrid.appendChild(link.cloneNode(true));
      }}
      function collectSamePriceLinks(doc) {{
        var out = [];
        var seenHref = {{}};
        doc.querySelectorAll('.car-card-link').forEach(function (link) {{
          if (link.closest('#recommendSection')) return;
          if (link.closest('#comingSoonSection')) return;
          var priceElem = link.querySelector('.car-price');
          var nameElem = link.querySelector('.car-name');
          if (!priceElem || !nameElem) return;
          var price = parseInt(priceElem.textContent.replace(/[^0-9]/g, ''), 10);
          var name = nameElem.textContent.trim();
          if (name === currentCarName) return;
          if (price !== currentPrice) return;
          var href = (link.getAttribute('href') || '').trim();
          if (!href || seenHref[href]) return;
          seenHref[href] = true;
          out.push(link);
        }});
        return out;
      }}
      function resolveCarListUrl() {{
        var path = location.pathname;
        var m = path.match(/^(.*)\\/carpark\\/[^/]+\\/car\\.html$/);
        if (m) {{
          var base = m[1] || '';
          return new URL(base + '/car.html', location.origin).href;
        }}
        return new URL('../../car.html', location.href).href;
      }}
      function fetchCarListHtml() {{
        var urls = [resolveCarListUrl(), new URL('../../car.html', location.href).href];
        var seen = {{}};
        urls = urls.filter(function (u) {{
          if (seen[u]) return false;
          seen[u] = true;
          return true;
        }});
        function tryFetch(i) {{
          if (i >= urls.length) {{
            return Promise.reject(new Error('car list fetch failed'));
          }}
          return fetch(urls[i], {{ credentials: 'same-origin' }})
            .then(function (r) {{
              if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + urls[i]);
              return r.text();
            }})
            .catch(function () {{
              return tryFetch(i + 1);
            }});
        }}
        return tryFetch(0);
      }}
      fetchCarListHtml()
        .then(function (html) {{
          var doc = new DOMParser().parseFromString(html, 'text/html');
          if (!doc.querySelector('.car-card-link')) {{
            console.warn('[同价位] 已拉取页面但未找到 .car-card-link，请确认根目录 car.html 是否为选车页。');
            return;
          }}
          collectSamePriceLinks(doc).forEach(function (link) {{
            appendSimilarCarCard(link);
          }});
          var subEl = document.querySelector('.similar-cars-subtitle');
          var n = similarCarsGrid.children.length;
          if (subEl && n > 0) {{
            var priceStr = formatPriceThousands(currentPrice);
            subEl.innerHTML =
              '共 <strong>' +
              n +
              '</strong> 辆 · 日租 <strong>¥' +
              priceStr +
              '/天</strong> 与您所选车型相同；车多时可左右滑动浏览';
          }}
          if (n > 0) {{
            similarCarsSection.style.display = 'block';
            updateSimilarRowLayout();
            setTimeout(updateSimilarRowLayout, 50);
            window.addEventListener('load', updateSimilarRowLayout, {{ once: true }});
          }}
        }})
        .catch(function () {{
          if (location.protocol === 'file:') {{
            console.warn(
              '[同价位] 用 file:// 打开时浏览器会拦截 fetch。请在项目根目录启动 HTTP 服务后通过 http:// 访问。'
            );
            return;
          }}
          console.warn('[同价位] 无法加载车库 car.html');
        }});
    }});
  </script>

  <div class="detail-fab-actions" id="detailFabActions" aria-hidden="true">
    <button type="button" class="btn-primary btn-lg detail-fab-btn">立即预约</button>
    <button type="button" class="btn-ghost btn-lg detail-fab-btn">咨询客服</button>
  </div>

  <footer class="detail-footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-brand">芒果超跑</div>
        <div class="footer-links">
          <a href="#">关于我们</a>
          <a href="#">服务条款</a>
          <a href="#">隐私政策</a>
          <a href="#">联系我们</a>
        </div>
        <div class="footer-copy">© 2026 昆明芒果汽车服务有限公司 版权所有</div>
      </div>
    </div>
  </footer>

  <script src="../detail-other-models.js"></script>
  <script src="../detail-rent-sync.js"></script>
  <script src="./car.js"></script>
  <script src="../detail-fab.js"></script>
  <script src="../similar-price-cars.js"></script>
  <script src="../vehicle-click.js"></script>
</body>
</html>
"""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument(
        "--no-db",
        action="store_true",
        help="不连接 MySQL，租金占位 888，文案仅按车名启发式生成",
    )
    ap.add_argument(
        "--force",
        action="store_true",
        help="已存在且带 GENERATED_CARPARK_PLACEHOLDER 的 car.html 会按表重写",
    )
    ap.add_argument(
        "--force-any",
        action="store_true",
        help="忽略占位标记，强制重写该目录下已有 car.html（会覆盖手改页面，慎用）",
    )
    ap.add_argument(
        "--ensure-names",
        nargs="*",
        metavar="CAR_NAME",
        default=[],
        help="与 cars.car_name 完全一致的名称：若 carpark 下尚无该目录则创建，再生成 car.html（便于新车入库后一键建站）",
    )
    args = ap.parse_args()

    if not TEMPLATE_DIR.is_dir():
        raise SystemExit(f"缺少模板目录: {TEMPLATE_DIR}")

    css_src = TEMPLATE_DIR / "car.css"
    js_src = TEMPLATE_DIR / "car.js"
    if not css_src.is_file() or not js_src.is_file():
        raise SystemExit("模板 car.css / car.js 不存在")

    cars_map: dict[str, dict] = {}
    if not args.no_db:
        try:
            cfg = load_app_config()
            cars_map = fetch_cars_by_name(cfg)
            print(f"已从数据库 cars 表加载 {len(cars_map)} 条记录（按 car_name 匹配文件夹名）")
        except Exception as e:
            print(f"警告：无法读取 cars 表（{e}），将使用占位租金与启发式文案。可使用 --no-db 跳过连接。")
            cars_map = {}

    ensure = [x.strip() for x in (args.ensure_names or []) if x.strip()]
    for name in ensure:
        d = CARPARK / name
        if d.is_dir():
            continue
        if args.dry_run:
            print(f"  [dry-run] 将创建目录: {name}")
        else:
            d.mkdir(parents=True)
            print(f"  已创建目录: {name}")

    missing: list[Path] = []
    for p in sorted(CARPARK.iterdir()):
        if not p.is_dir():
            continue
        if p.name.startswith("."):
            continue
        html_path = p / "car.html"
        if html_path.is_file():
            if not args.force and not args.force_any:
                continue
            if not args.force_any:
                try:
                    head = html_path.read_text(encoding="utf-8")[:8000]
                except OSError:
                    continue
                if "GENERATED_CARPARK_PLACEHOLDER" not in head:
                    print(f"  跳过（无占位标记，加 --force-any 可强制）: {p.name}")
                    continue
        missing.append(p)

    if ensure:
        want = set(ensure)
        missing = [p for p in missing if p.name in want]
        not_found = sorted(want - {p.name for p in missing})
        if not_found:
            print(
                "提示：以下名称不在待处理列表（可能已有 car.html 且未加 --force，或目录名与 --ensure-names 不一致）："
                + ", ".join(not_found)
            )

    if args.force and not args.force_any:
        print(
            "注意：--force 仅覆盖带 GENERATED_CARPARK_PLACEHOLDER 的占位页；"
            "早期生成无标记的页面请用 --force-any 或删 car.html 后重跑。"
        )
    if args.force_any:
        print("警告：--force-any 将覆盖已有 car.html（含手改），请确认已备份。")

    print(f"待处理: {len(missing)} 个目录")
    no_db_row: list[str] = []
    for d in missing:
        out_html = d / "car.html"
        row = cars_map.get(d.name) if cars_map else None
        if cars_map and not row:
            no_db_row.append(d.name)
        if args.dry_run:
            tag = " [无表记录]" if cars_map and not row else ""
            print(f"  [dry-run] {out_html}{tag}")
            continue
        out_html.write_text(build_html(d.name, row), encoding="utf-8")
        shutil.copy2(css_src, d / "car.css")
        shutil.copy2(js_src, d / "car.js")
        print(f"  OK {d.name}")

    if no_db_row:
        print(
            f"提示：其中 {len(no_db_row)} 个文件夹在 cars 表无对应 car_name，"
            "已用租金 888 与车名启发式文案；请补全表或重新运行。"
        )
    print("完成。")


if __name__ == "__main__":
    main()
