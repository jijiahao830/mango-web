#!/usr/bin/env python3
"""
根据 scripts/carpark_vehicle_stats.json 与各车型公开技术参数，
生成 carpark_vehicle_technical_specs.json（供 apply_carpark_technical_specs.py 写入详情页）。

性能数字与 stats 四宫格对齐；扭矩/尺寸/变速箱等优先采用厂商/百科常见口径，年款差异以实车为准。
"""
from __future__ import annotations

import json
import re
from pathlib import Path

DIR = Path(__file__).resolve().parent
STATS_PATH = DIR / "carpark_vehicle_stats.json"
OUT_PATH = DIR / "carpark_vehicle_technical_specs.json"


def parse_ps(s: str) -> int:
    m = re.search(r"(\d+)", str(s))
    return int(m.group(1)) if m else 0


def fmt_power(ps: int, rpm_typical: str) -> str:
    return f"{ps}马力 @ {rpm_typical}"


# 文件夹名 -> (长×宽×高 mm, 轴距 mm, 整备质量 kg)
# 来源：厂商数据/汽车之家/百科常见值，同平台年款取代表值
DIMS: dict[str, tuple[str, str, str]] = {
    "兰博基尼 570-4": ("4386×1900×1165mm", "2560mm", "约1340kg"),
    "兰博基尼 Huracán LP580-2": ("4459×1924×1165mm", "2620mm", "约1389kg"),
    "兰博基尼 Huracán LP610-4": ("4459×1924×1165mm", "2620mm", "约1422kg"),
    "兰博基尼 Urus Performante": ("5137×2181×1618mm", "3003mm", "约2150kg"),
    "兰博基尼 LP750-4 SV": ("4835×2030×1136mm", "2700mm", "约1525kg"),
    "兰博基尼大牛": ("4780×2030×1136mm", "2700mm", "约1575kg"),
    "22 款帕拉梅拉": ("5049×1937×1423mm", "2950mm", "约1850–1920kg"),
    "22 款帕拉梅拉 4S": ("5049×1937×1423mm", "2950mm", "约1920kg"),
    "23 款帕拉梅拉 2.9T": ("5049×1937×1423mm", "2950mm", "约1895kg"),
    "帕拉梅拉 25 款": ("5052×1937×1423mm", "2950mm", "约1900kg"),
    "帕拉梅拉 GTS": ("5049×1937×1423mm", "2950mm", "约1995kg"),
    "保时捷 992 Targa": ("4535×1900×1281mm", "2450mm", "约1650kg"),
    "保时捷 992 红内": ("4519×1852×1299mm", "2450mm", "约1550kg"),
    "保时捷 992 黑内": ("4519×1852×1299mm", "2450mm", "约1550kg"),
    "保时捷 Taycan": ("4963×1966×1381mm", "2900mm", "约2140kg"),
    "保时捷卡宴": ("4931×1983×1696mm", "2895mm", "约2115kg"),
    "宾利飞驰": ("5316×1978×1483mm", "3194mm", "约2335kg"),
    "宾利添越 S": ("5125×1998×1728mm", "2995mm", "约2415kg"),
    "宾利慕尚": ("5575×1926×1521mm", "3266mm", "约2585kg"),
    "劳斯莱斯幻影": ("6092×1990×1650mm", "3772mm", "约2740kg"),
    "库里南": ("5341×2000×1837mm", "3295mm", "约2660kg"),
    "25 款劳斯莱斯库里南": ("5341×2000×1837mm", "3295mm", "约2660kg"),
    "劳斯莱斯库里南BB版": ("5341×2000×1837mm", "3295mm", "约2730kg"),
    "古思特一代": ("5620×1948×1550mm", "3465mm", "约2360kg"),
    "古思特二代": ("5715×1978×1571mm", "3465mm", "约2490kg"),
    "古斯特一代升级古二": ("5715×1978×1571mm", "3465mm", "约2490kg"),
    "24 款古思特加长": ("5990×2018×1570mm", "3465mm", "约2560kg"),
    "法拉利 296 GTB": ("4565×1958×1187mm", "2600mm", "约1470kg"),
    "法拉利 458 Italia": ("4527×1937×1213mm", "2650mm", "约1485kg"),
    "法拉利 488 GTB": ("4568×1952×1213mm", "2650mm", "约1545kg"),
    "法拉利 488 Spider": ("4568×1952×1211mm", "2650mm", "约1600kg"),
    "法拉利 F8 Tributo": ("4611×1979×1206mm", "2650mm", "约1570kg"),
    "法拉利 SF90 Spider": ("4704×1963×1191mm", "2650mm", "约1670kg"),
    "迈凯伦 540C": ("4530×2095×1202mm", "2670mm", "约1311kg"),
    "迈凯伦 720S P": ("4543×2230×1196mm", "2670mm", "约1419kg"),
    "迈凯伦 GT": ("4683×2045×1213mm", "2675mm", "约1530kg"),
    "奥迪 R8": ("4429×1940×1236mm", "2650mm", "约1665kg"),
    "日产 GTR": ("4710×1895×1370mm", "2780mm", "约1780kg"),
    "日产 GT-R R35 战神": ("4710×1895×1370mm", "2780mm", "约1780kg"),
    "小米 SU7 系列": ("4997×1963×1455mm", "3000mm", "约2205kg"),
    "特斯拉 Model X": ("5036×2070×1684mm", "2965mm", "约2352kg"),
    "特斯拉 Model Y": ("4750×1921×1624mm", "2890mm", "约1998kg"),
    "理想 L7": ("5050×1995×1750mm", "3005mm", "约2450kg"),
    "理想 L8": ("5080×1995×1800mm", "3005mm", "约2520kg"),
    "理想 L9": ("5218×1998×1800mm", "3105mm", "约2570kg"),
    "理想 MEGA": ("5350×1965×1850mm", "3300mm", "约2785kg"),
    "理想 ONE": ("5030×1960×1760mm", "2935mm", "约2300kg"),
    "问界 M9": ("5230×1999×1800mm", "3110mm", "约2650kg"),
    "腾势 D9": ("5250×1960×1920mm", "3110mm", "约2665kg"),
    "岚图梦想家": ("5315×1985×1820mm", "3200mm", "约2544kg"),
    "别克 GL8": ("5219×1878×1799mm", "3088mm", "约1970kg"),
    "丰田埃尔法": ("5005×1850×1950mm", "3000mm", "约2290kg"),
    "考斯特蒙娜丽莎": ("7005×2040×2760mm", "3935mm", "约3650kg"),
    "广汽传祺 M8": ("5212×1893×1823mm", "3070mm", "约2228kg"),
    "福特 F-150 猛禽": ("5930×2199×1992mm", "3708mm", "约2683kg"),
    "道奇霸王龙": ("5916×2234×2094mm", "3569mm", "约2883kg"),
    "路特斯 ELETRE": ("5105×2019×1630mm", "3019mm", "约2640kg"),
    "路特斯 Emira": ("4413×1895×1225mm", "2575mm", "约1440kg"),
    "坦克 300": ("4760×1930×1903mm", "2750mm", "约2150kg"),
    "坦克 500": ("5078×1934×1905mm", "2850mm", "约2530kg"),
    "坦克 700": ("5093×2061×1952mm", "3000mm", "约3110kg"),
    "丰田普拉多": ("4925×1980×1870mm", "2850mm", "约2450kg"),
    "丰田酷路泽5.7": ("5145×1980×1890mm", "2850mm", "约2630kg"),
    "路虎卫士 110 P400": ("5018×2008×1967mm", "3022mm", "约2400kg"),
    "路虎卫士 5.0T": ("5018×2008×1967mm", "3022mm", "约2550kg"),
    "22 款路虎揽胜创世加长": ("5252×2047×1870mm", "3197mm", "约2510kg"),
    "24 款路虎揽胜创世加长": ("5252×2047×1870mm", "3197mm", "约2510kg"),
    "17 款路虎揽胜 常规款": ("4999×1983×1867mm", "2922mm", "约2200kg"),
    "17 款路虎揽胜创世加长": ("5200×2073×1868mm", "3120mm", "约2360kg"),
    "路虎揽胜 5.0T V8": ("5252×2047×1870mm", "3197mm", "约2580kg"),
    "路虎揽胜 行政级 ／ 陆地头等舱": ("5252×2047×1870mm", "3197mm", "约2510kg"),
    "新款路虎揽胜 加长七座 ／ 盛世加长版": ("5252×2047×1870mm", "3197mm", "约2560kg"),
    "奔驰 AMG G63": ("4870×1984×1979mm", "2890mm", "约2560kg"),
    "奔驰 G500": ("4857×1931×1975mm", "2890mm", "约2225kg"),
    "奔驰 G500 4x4": ("4857×1931×2054mm", "2890mm", "约2860kg"),
    "奔驰 G350 汽油版": ("4857×1931×1962mm", "2890mm", "约2205kg"),
    "奔驰 G350D 柴油版": ("4857×1931×1962mm", "2890mm", "约2225kg"),
    "奔驰 G900 宽体套件版": ("4870×1984×1979mm", "2890mm", "约2650kg"),
    "奔驰 AMG GT": ("4544×2075×1287mm", "2630mm", "约1625kg"),
    "奔驰 C63 四门": ("4750×1877×1403mm", "2840mm", "约1745kg"),
    "奔驰 C63 Coupe": ("4686×1877×1391mm", "2840mm", "约1725kg"),
    "奔驰 S400L 全新款": ("5320×1921×1503mm", "3216mm", "约2070kg"),
    "奔驰 S350": ("5290×1921×1503mm", "3216mm", "约2020kg"),
    "宝马 M3": ("4804×1903×1447mm", "2857mm", "约1730kg"),
    "宝马 M4": ("4794×1903×1893mm", "2857mm", "约1725kg"),
    "宝马 M4 Competition": ("4794×1903×1893mm", "2857mm", "约1740kg"),
    "宝马 M4 曼岛绿": ("4794×1903×1893mm", "2857mm", "约1740kg"),
    "宝马 M5 雷霆版": ("4966×1903×1479mm", "2982mm", "约1960kg"),
    "宝马 M2 25 款": ("4580×1887×1403mm", "2741mm", "约1725kg"),
    "宝马 7 系": ("5391×1950×1548mm", "3215mm", "约2140kg"),
    "宝马 X5": ("4930×2004×1776mm", "2975mm", "约2240kg"),
    "宝马 530": ("5175×1900×1520mm", "3105mm", "约1705kg"),
    "宝马 530Li": ("5175×1900×1520mm", "3105mm", "约1710kg"),
    "全新宝马 5 系": ("5175×1900×1520mm", "3105mm", "约1820kg"),
    "奥迪 A8L": ("5320×1945×1488mm", "3128mm", "约2185kg"),
    "奥迪 A7": ("4976×1908×1412mm", "2926mm", "约1920kg"),
    "奥迪 A7L": ("5076×1908×1429mm", "3026mm", "约1920kg"),
    "奥迪 A6": ("5038×1886×1475mm", "3024mm", "约1810kg"),
    "24 款奥迪 A6": ("5038×1886×1475mm", "3024mm", "约1810kg"),
    "25 款奥迪 A6": ("5038×1886×1475mm", "3024mm", "约1810kg"),
    "奥迪 A3": ("4343×1815×1458mm", "2630mm", "约1400kg"),
    "玛莎拉蒂吉博力": ("4971×1945×1461mm", "2998mm", "约1810kg"),
    "玛莎拉蒂总裁": ("5262×1948×1481mm", "3171mm", "约1980kg"),
    "玛莎拉蒂莱万特": ("5003×1968×1679mm", "3004mm", "约2105kg"),
    "阿斯顿马丁 DB11 V8": ("4750×2060×1280mm", "2805mm", "约1870kg"),
    "阿斯顿马丁 DBX": ("5039×2220×1680mm", "3060mm", "约2245kg"),
    "18 款奔驰 S400": ("5255×1899×1494mm", "3165mm", "约2070kg"),
    "21 款迈巴赫 S480": ("5470×1921×1510mm", "3396mm", "约2270kg"),
    "22 款迈巴赫 S480": ("5470×1921×1510mm", "3396mm", "约2270kg"),
    "23 款迈巴赫 S480": ("5470×1921×1510mm", "3396mm", "约2270kg"),
    "24 款迈巴赫 S480": ("5470×1921×1510mm", "3396mm", "约2280kg"),
    "迈巴赫 S480 白外米内": ("5470×1921×1510mm", "3396mm", "约2270kg"),
    "20 款奔驰 E300L 行政立标": ("5078×1860×1480mm", "3079mm", "约1800kg"),
    "23 款奔驰 E300L 行政立标": ("5092×1880×1493mm", "3094mm", "约1880kg"),
    "25 款奔驰 E300L 豪华版": ("5092×1880×1493mm", "3094mm", "约1880kg"),
    "新款奔驰 E300 时尚版": ("5092×1880×1493mm", "3094mm", "约1880kg"),
    "奔驰 C260": ("4882×1820×1461mm", "2954mm", "约1740kg"),
    "奔驰威霆": ("5370×1928×1880mm", "3430mm", "约2320kg"),
    "威霆迈巴赫": ("5370×1928×1880mm", "3430mm", "约2400kg"),
}


def torque_line(name: str, eng: str, ps: int) -> str:
    e = eng.lower()
    if "V10 自吸" in eng or "5.2L V10" in eng:
        if ps >= 600:
            return "600N·m @ 6500rpm"
        if ps >= 570:
            return "540N·m @ 6500rpm"
        return "560N·m @ 6500rpm"
    if "V12 自吸" in eng or "6.5L V12" in eng:
        if ps >= 740:
            return "690N·m @ 5500rpm"
        return "720N·m @ 6750rpm"
    if "4.0T V8" in eng or "4.0T V8 双涡轮" in eng:
        return "770N·m @ 2000–4250rpm"
    if "6.75T V12" in eng or "6.75" in eng:
        return "850N·m @ 1600rpm"
    if "6.6T V12" in eng:
        return "780N·m @ 1500rpm"
    if "3.0T L6" in eng or "3.0T L6 + 48V" in eng:
        return "500N·m @ 1600–4500rpm"
    if "2.9T V6" in eng:
        if ps >= 440:
            return "550N·m @ 2000–5000rpm"
        return "450N·m @ 1800–5000rpm"
    if "2.0T L4" in eng:
        return "400N·m @ 1600–4500rpm"
    if "3.8T V6" in eng:
        return "652N·m @ 3300–5800rpm"
    if "3.9T V8" in eng:
        if ps >= 720:
            return "770N·m @ 3000rpm"
        return "760N·m @ 3000rpm"
    if "纯电" in eng or "双电机" in eng or "三电机" in eng:
        return "以实车电机标定为准"
    if "增程" in eng:
        return "以实车电机标定为准"
    if "插混" in eng or "DM-i" in eng:
        return "以实车混动标定为准"
    if "机械增压" in eng and "V8" in eng:
        return "880N·m @ 4000rpm"
    if "3.5T V6" in eng:
        return "691N·m @ 3000rpm"
    if "6.2L V8" in eng:
        return "881N·m @ 4000rpm"
    if "3.0T V6" in eng and "双涡轮" in eng and "玛莎" not in name:
        pass
    if "3.0T V6 双涡轮" in eng:
        return "500N·m @ 1750–5000rpm"
    return "—"


def gearbox_line(eng: str, name: str) -> str:
    if "纯电" in eng or "双电机" in eng or "三电机" in eng or "Plaid" in eng:
        return "单速减速器"
    if "ELETRE" in name or "Taycan" in name:
        return "两挡自动变速器"
    if "序列式" in name or "Gallardo" in name or "570" in name:
        return "6速 ISR 自动序列式"
    if "Huracán" in name or "Huracan" in name:
        return "7速双离合"
    if "法拉利" in name or "488" in name or "F8" in name or "458" in name:
        return "7速双离合"
    if "296" in name:
        return "8速双离合"
    if "SF90" in name:
        return "8速双离合"
    if "迈凯伦" in name:
        return "7速双离合"
    if "增程" in eng:
        return "电动车单速 + 1.5T 增程器"
    if "DM-i" in eng or "插混" in eng:
        return "E-CVT 电混专用"
    if "GTR" in name or "GT-R" in name:
        return "6速双离合"
    if "奥迪 R8" in name:
        return "7速双离合"
    if "AMG GT" in name and "63" not in name:
        return "7速双离合"
    if "奔驰" in name and "9AT" not in eng:
        if "C63" in name:
            return "9速 MCT"
        if "迈巴赫" in name or "S4" in name or "S " in name or "E300" in name:
            return "9速手自一体"
    if "迈巴赫" in name or "奔驰 S" in name or "E300L" in name:
        return "9速手自一体"
    if "宝马" in name and "M" in name:
        return "8速 M Steptronic"
    if "保时捷" in name and "帕拉梅拉" in name:
        return "8速 PDK"
    if "保时捷" in name:
        return "8速 PDK"
    if "路虎" in name or "揽胜" in name or "卫士" in name:
        return "8速手自一体"
    if "宾利" in name or "劳斯莱斯" in name or "库里南" in name or "古思特" in name or "古斯特" in name or "慕尚" in name:
        return "8速手自一体"
    if "奥迪 A" in name:
        return "7速 S tronic"
    return "8速手自一体"


def drive_line(name: str, eng: str) -> str:
    if "LP580" in name or "LP580-2" in name:
        return "中置后驱"
    if "后驱" in eng and "纯电" not in eng:
        return "中置后驱" if "兰博基尼" in name else "后置后驱"
    if "纯电 后驱" in eng:
        return "后置后驱"
    if "双电机四驱" in eng or "四驱" in eng or "4x4" in name or "AWD" in eng:
        if "SUV" in name or "Urus" in name or "添越" in name or "揽胜" in name:
            return "全时四驱"
        return "全时四驱"
    if "兰博基尼" in name and "610" in name:
        return "中置四驱"
    if "兰博基尼" in name and "570" in name:
        return "中置四驱"
    if "大牛" in name or "LP750" in name:
        return "中置四驱"
    if "法拉利" in name or "488" in name or "458" in name:
        return "中置后驱"
    if "296" in name:
        return "中置后驱 · 插电混动"
    if "SF90" in name:
        return "中置四驱 · 插电混动"
    if "迈凯伦" in name:
        return "中置后驱"
    if "GTR" in name or "GT-R" in name:
        return "前置四驱"
    if "奥迪 R8" in name:
        return "中置四驱"
    if "特斯拉" in name or "Model" in name:
        return "双电机全轮驱动"
    if "小米" in name:
        return "双电机四驱"
    if "理想" in name or "问界" in name:
        return "智能四驱"
    if "猛禽" in name or "霸王龙" in name:
        return "全时四驱"
    if "普拉多" in name or "酷路泽" in name or "坦克" in name:
        return "全时四驱 · 低速四驱"
    if "AMG G" in name or "G63" in name or "G500" in name or "G350" in name:
        return "全时四驱 · 三把差速锁"
    if "宝马" in name and "M" in name:
        return "前置四驱"
    return "前置后驱"


def susp_line(name: str) -> str:
    if "法拉利" in name or "兰博基尼" in name or "迈凯伦" in name:
        return "前后双叉臂 · 电磁减震"
    if "劳斯莱斯" in name or "宾利" in name or "迈巴赫" in name or "幻影" in name:
        return "前双叉臂 / 后多连杆 · 空气悬挂"
    if "揽胜" in name or "卫士" in name:
        return "前双叉臂 / 后多连杆 · 空气悬挂"
    if "保时捷" in name and "帕拉梅拉" in name:
        return "前双叉臂 / 后多连杆 · 空气悬挂 · PASM"
    if "保时捷" in name:
        return "前多连杆 / 后多连杆 · 空气悬挂"
    if "G63" in name or "G500" in name or "G350" in name or "G900" in name or "奔驰 G" in name:
        return "前后硬轴 · 整体桥 · 非承载式车身"
    return "前多连杆 / 后多连杆 · 自适应悬挂"


# 性能修正：与公开资料更一致（stats 仍用于四宫格，此处规格区用修正值）
PERF_FIX: dict[str, tuple[str, str]] = {
    "兰博基尼 570-4": ("3.4秒", "325km/h"),  # LP 570-4 Superleggera 常见公布值
}


def build_row(folder: str, stats: list[str]) -> dict[str, str]:
    acc, vmax, ps_s, eng = stats[0], stats[1], stats[2], stats[3]
    ps = parse_ps(ps_s)
    if folder in PERF_FIX:
        acc, vmax = PERF_FIX[folder]

    power_rpm = "8000rpm"
    if "涡轮" in eng or "T" in eng:
        power_rpm = "5500–6500rpm"
    if "纯电" in eng or "电机" in eng:
        power_rpm = "—"
    if power_rpm != "—":
        power_str = f"{ps}马力 @ {power_rpm}"
    else:
        power_str = str(ps_s).strip()

    dim = DIMS.get(folder, ("—", "—", "—"))
    return {
        "engine": eng,
        "max_power": power_str,
        "max_torque": torque_line(folder, eng, ps),
        "gearbox": gearbox_line(eng, folder),
        "accel": acc if acc != "—" else "—",
        "vmax": vmax,
        "drive": drive_line(folder, eng),
        "suspension": susp_line(folder),
        "dimensions": dim[0],
        "wheelbase": dim[1],
        "weight": dim[2],
    }


def main() -> None:
    stats = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    out: dict[str, dict[str, str]] = {}
    for folder, row in stats.items():
        if len(row) != 4:
            continue
        out[folder] = build_row(folder, row)
    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", OUT_PATH, "entries", len(out))


if __name__ == "__main__":
    main()
