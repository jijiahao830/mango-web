"""
按「carpark 子目录名 + carpark_vehicle_stats.json」为每辆车生成三组 features 文案。
不使用粗分类通用尾句填充；少数需人工卖点的车型放在 MANUAL_FEATURES。
"""
from __future__ import annotations

import json
import re
from pathlib import Path

_STATS_PATH = Path(__file__).with_name("carpark_vehicle_stats.json")
_STATS_CACHE: dict[str, list[str]] | None = None

# 人工审定：统计表无法表达的卖点（键 = 子目录名）
MANUAL_FEATURES: dict[str, tuple[list[str], list[str]]] = {
    "兰博基尼 570-4": (
        ["碳纤维赛道化外观", "5.2L V10 高转声浪", "场景化出行"],
        [
            "这台橙色 Gallardo LP570-4 采用大量碳纤维材料：后视镜、尾翼到车内扩散器，既显著减轻车重，又塑造极具侵略性的赛道化外观，展现纯正赛车血统。",
            "自然吸气 V10 高转响应直接、排气辨识度极高；公路驾驶请预留安全车距，遵守限速与噪声管理规定，激烈驾驶建议在合法封闭场地体验。",
            "适合婚摄、活动静展与粉丝体验日；年款与选装以交付实车为准。预约前可向芒果超跑确认档期、保险与随车物品，再安排看车与取车。",
        ],
    ),
}


def load_stats() -> dict[str, list[str]]:
    global _STATS_CACHE
    if _STATS_CACHE is None:
        _STATS_CACHE = json.loads(_STATS_PATH.read_text(encoding="utf-8"))
    return _STATS_CACHE


def get_stats_row(folder: str) -> tuple[str, str, str, str]:
    raw = load_stats()[folder]
    return raw[0], raw[1], raw[2], raw[3]


def _perf_clause(acc: str, vmax: str, ps: str) -> str:
    if acc == "—":
        return f"动力水平约 {ps}，参考极速 {vmax}；请以实车与路况为准，预留安全车距。"
    return f"参考零百约 {acc}、约 {ps}、极速 {vmax}；公路请控速控距，激烈驾驶宜封闭场地。"


def _tail_scene(kind: str) -> str:
    if kind == "super":
        return "适合婚摄、品牌活动与重要日程；具体年款与选装以交付实车为准，可预约芒果超跑看车。"
    if kind == "luxury_sedan":
        return "宜接机、商务接待与家庭长途；后排功能与内饰成色建议到店实车确认。"
    if kind == "suv":
        return "适合自驾、露营与摄影外拍；满载与行李架等以实车与合同为准。"
    if kind == "mpv":
        return "宜团队接待、机场往返与亲子长途；座位数与保险条款请提前与门店确认。"
    if kind == "ev":
        return "城市通勤与高速巡航皆宜；续航与补能因驾驶风格而异，长途请提前规划。"
    return "租期与随车物品可与芒果超跑提前沟通，便于安排交付与取还车。"


def _ferrari(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "SF90" in name:
        t = ["敞篷插混旗舰", "千匹级动力分配", "顶格仪式感出车"]
        d1 = f"{name} 为敞篷插混超跑，{eng}，系统综合约 {ps}，车身空力与扩散器强调下压力与散热。"
        d2 = f"{_perf_clause(acc, vmax, ps)} 电机与涡轮衔接快，制动与轮胎温度需留意。"
        d3 = _tail_scene("super")
    elif "296" in name:
        t = ["中后置 V6 混动", "紧凑车身与空力", "公路与封闭体验"]
        d1 = f"{name} 采用 {eng}，约 {ps}，短轴距与侧进气让弯道响应更直接。"
        d2 = f"{_perf_clause(acc, vmax, ps)} 建议先熟悉电子稳定与制动点。"
        d3 = _tail_scene("super")
    elif "458" in name:
        t = ["自然吸气 V8 经典", "高转线性输出", "收藏级跃马"]
        d1 = f"{name} 搭载 {eng}，约 {ps}，自吸声浪层次丰富，车身比例经典耐看。"
        d2 = f"{_perf_clause(acc, vmax, ps)} 轮胎与制动在激烈驾驶中负荷高。"
        d3 = _tail_scene("super")
    elif "488" in name or "F8" in name:
        open_air = "Spider" in name or "敞篷" in name
        t = [
            "双涡轮 V8 中段爆发",
            "敞篷巡游姿态" if open_air else "GTB 硬顶线条",
            "影像与活动出镜",
        ]
        d1 = f"{name} 使用 {eng}，约 {ps}，进气与扰流为冷却与下压力服务。"
        d2 = f"{_perf_clause(acc, vmax, ps)} 涡轮起压后推背感强，注意跟车距离。"
        d3 = _tail_scene("super")
    else:
        t = ["意式超跑比例", "油门与换挡节奏", "婚摄与展示"]
        d1 = f"{name} 搭载 {eng}，约 {ps}，进气与尾灯辨识度高，静态与动态都上镜。"
        d2 = f"{_perf_clause(acc, vmax, ps)}"
        d3 = _tail_scene("super")
    return t, [d1, d2, d3]


def _lambo(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "Urus" in name:
        t = ["超跑家族 SUV 线条", "V8 双涡轮扭矩", "个性公路存在感"]
        d1 = f"{name} 将楔形战斗感做成高坐姿 SUV，{eng} 约 {ps}，排气与轮毂视觉侵略性强。"
        d2 = f"{_perf_clause(acc, vmax, ps)} 车宽与盲区需适应市区会车。"
        d3 = _tail_scene("suv")
    elif "Huracán" in name or "LP580" in name or "LP610" in name:
        rwd = "580" in name or "LP580" in name
        t = [
            "楔形切割车身",
            "后驱滑移乐趣" if rwd else "四驱起步抓地",
            "超跑场景化用车",
        ]
        d1 = f"{name} 配 {eng} 约 {ps}，低趴姿态与进气口辨识度高。"
        d2 = (
            f"{_perf_clause(acc, vmax, ps)} 后驱版本尾巴更活，控油需细腻。"
            if rwd
            else f"{_perf_clause(acc, vmax, ps)} 四驱起步稳，雨天亦更有信心。"
        )
        d3 = _tail_scene("super")
    elif "LP750" in name or "SV" in name:
        t = ["V12 极限空力套件", "赛道取向尾翼与扩散", "收藏级大牛"]
        d1 = f"{name} 搭载 {eng}，约 {ps}，碳纤维套件与尾翼强调下压力。"
        d2 = f"{_perf_clause(acc, vmax, ps)} 动力释放非常直接，制动系统温度需关注。"
        d3 = _tail_scene("super")
    else:
        t = ["纵向 V12 旗舰", "剪刀门仪式感", "顶格声浪辨识"]
        d1 = f"{name} 使用 {eng}，约 {ps}，车门与进气造型极具符号感。"
        d2 = f"{_perf_clause(acc, vmax, ps)}"
        d3 = _tail_scene("super")
    return t, [d1, d2, d3]


def _mclaren(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "540" in name:
        t = ["入门迈凯伦姿态", "3.8T 双涡轮响应", "轻量驾控入门"]
        d1 = f"{name} 约 {ps}，{eng}，车身线条强调驾驶者中心与空力效率。"
    elif "720" in name:
        t = ["720PS 级动力", "碳纤维单体壳哲学", "极限公路性能"]
        d1 = f"{name} 输出约 {ps}，{eng}，悬架与转向沟通感极强。"
    elif "GT" in name:
        t = ["GT 长途取向", "前备厢实用", "舒适与性能折中"]
        d1 = f"{name} 在迈凯伦家族中更偏日常与储物，{eng} 约 {ps}，巡航质感更好。"
    else:
        t = ["蝴蝶门与座舱布局", "双涡轮高转性格", "体验日影像创作"]
        d1 = f"{name} 搭载 {eng}，约 {ps}，视野开扬利于判断车宽。"
    d2 = f"{_perf_clause(acc, vmax, ps)} 制动与轮胎易达高温，请循序渐进。"
    d3 = _tail_scene("super")
    return t, [d1, d2, d3]


def _r8(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    t = ["中置 V10 自吸", "quattro 弯道稳定", "日常可开的超跑"]
    d1 = f"{name} 采用 {eng}，约 {ps}，自然吸气高转声浪辨识度高。"
    d2 = f"{_perf_clause(acc, vmax, ps)} 四驱提升雨天与出弯信心。"
    d3 = _tail_scene("super")
    return t, [d1, d2, d3]


def _gtr(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    t = ["战神四驱图腾", "双涡轮暴力加速", "日系性能符号"]
    d1 = f"{name} 搭载 {eng}，约 {ps}，车身宽、视野需适应市区会车。"
    d2 = f"{_perf_clause(acc, vmax, ps)} 弹射与四驱策略让加速体感极强。"
    d3 = "适合性能主题活动与封闭体验；改装与车况影响保险，请书面确认。"
    return t, [d1, d2, d3]


def _rolls(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "幻影" in name:
        t = ["殿堂级轴距与气场", "后排尊崇空间", "静音与魔毯滤震"]
        d1 = f"{name} 搭载 {eng}，约 {ps}，车身比例与镀铬细节为顶级接待而生。"
    elif "库里南" in name or name == "库里南":
        bb = "BB" in name
        t = [
            "全地形豪华 SUV" + (" Black Badge 暗色美学" if bb else ""),
            "V12 双涡轮从容",
            "商务与家庭长途",
        ]
        d1 = f"{name} 使用 {eng}，约 {ps}，高坐姿与对开门仪式感兼具{'，BB 版风格更张扬' if bb else ''}。"
    else:
        t = ["古思特优雅比例", "V12 线性质感", "私密长途出行"]
        d1 = f"{name} 配 {eng}，约 {ps}，内饰木饰与星光顶因年款而异。"
    d2 = f"参考零百约 {acc}，高速巡航稳定，车内交谈省力；{vmax} 为工况参考。"
    d3 = _tail_scene("luxury_sedan")
    return t, [d1, d2, d3]


def _bentley(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "慕尚" in name:
        t = ["英伦旗舰轿车", "6.75 级从容扭矩", "后排尊崇"]
    elif "添越" in name:
        t = ["超豪华 SUV 工艺", "W12/V8 储备浑厚", "公路巡航质感"]
    else:
        t = ["四门轿跑线条", "W12/V8 再加速", "跨省差旅气质"]
    d1 = f"{name} 搭载 {eng}，约 {ps}，内饰缝线木饰体现手工取向。"
    d2 = f"{_perf_clause(acc, vmax, ps)} 底盘偏舒适，高速超车仍从容。"
    d3 = _tail_scene("luxury_sedan")
    return t, [d1, d2, d3]


def _maybach(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    t = ["迈巴赫后排尊崇", "静谧与悬挂滤震", "行政级接待"]
    d1 = f"{name} 使用 {eng}，约 {ps}，加长轴距带来腿部与座椅调节空间。"
    d2 = f"{_perf_clause(acc, vmax, ps)} 隔音优先，适合洽谈与休息并行。"
    d3 = _tail_scene("luxury_sedan")
    return t, [d1, d2, d3]


def _panamera(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "GTS" in name or "4.0T V8" in eng:
        t = ["V8 帕拉梅拉性能", "四驱起步与弯道", "豪华四门轿跑"]
    elif "4S" in name:
        t = ["4S 高功率调校", "2.9T 双涡轮爆发", "运动豪华兼顾"]
    else:
        t = ["保时捷四门轿跑", "2.9T 双涡轮线性", "长途与驾驶乐趣"]
    d1 = f"{name} 搭载 {eng}，约 {ps}，低重心与转向沟通是家族基因。"
    d2 = f"{_perf_clause(acc, vmax, ps)} 制动与轮胎在激烈驾驶中负荷高。"
    d3 = "宜商务自驾与拍摄跟车；尾翼与选装以实车为准。"
    return t, [d1, d2, d3]


def _porsche(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "992" in name or "保时捷 992" in name:
        if "Targa" in name:
            t = ["Targa 防滚架造型", "敞篷与硬顶兼顾", "911 家族中置后驱基因"]
            extra = "可开合顶篷带来独特巡游体验，"
        elif "红内" in name:
            t = ["992 宽体经典比例", "红色座舱氛围", "3.0T 水平对置双涡轮"]
            extra = "红色内饰强化运动豪华氛围，"
        elif "黑内" in name:
            t = ["992 宽体经典比例", "深色内饰座舱", "3.0T 水平对置双涡轮"]
            extra = "深色内饰更低调耐看，"
        else:
            t = ["911 家族低重心", "水平对置双涡轮", "精准转向与制动"]
            extra = ""
        d1 = f"{name} 搭载 {eng}，约 {ps}，{extra}圆灯与宽体肩线辨识度极高。"
        d2 = f"{_perf_clause(acc, vmax, ps)}"
        d3 = "适合跑山与公路巡游；轮胎与制动片状态建议取车前确认。"
        return t, [d1, d2, d3]
    if "Taycan" in name:
        t = ["纯电保时捷驾控", "低重心与动能回收", "静谧城市通勤"]
        d1 = f"{name} 为 {eng}，约 {ps}，加速线性、车内更安静。"
        d2 = f"参考极速 {vmax}；长途请关注续航与补能节奏。"
        d3 = _tail_scene("ev")
        return t, [d1, d2, d3]
    t = ["豪华运动 SUV", "公路操控与舒适", "多场景家庭与商务"]
    d1 = f"{name} 使用 {eng}，约 {ps}，卡宴系列兼顾通过性与公路贴地感。"
    d2 = f"{_perf_clause(acc, vmax, ps)}"
    d3 = _tail_scene("suv")
    return t, [d1, d2, d3]


def _land_rover(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "卫士" in name:
        if "5.0" in name or "V8" in eng:
            t = ["卫士 V8 声浪", "硬派越野几何", "全地形能力"]
        else:
            t = ["卫士 110 方盒子", "3.0T 轻混顺滑", "露营与穿越"]
        d1 = f"{name} 配 {eng}，约 {ps}，短前后悬与离地间隙利于复杂路况。"
    elif "揽胜" in name:
        if "5.0" in name or ("V8" in eng and "机械增压" in eng):
            t = ["揽胜 V8 机械增压", "头等舱滤震", "公路存在感"]
        elif "七座" in name or "加长" in name or "创世" in name or "盛世" in name or "行政" in name:
            t = ["加长轴距空间", "Terrain Response 全地形", "商务与家庭长途"]
        else:
            t = ["揽胜气场与静谧", "机械增压/涡轮顺滑", "高坐姿视野"]
        d1 = f"{name} 搭载 {eng}，约 {ps}，悬挂兼顾舒适与轻度越野。"
    else:
        t = ["路虎全地形基因", "高坐姿视野", "豪华越野平衡"]
        d1 = f"{name} 使用 {eng}，约 {ps}。"
    d2 = f"{_perf_clause(acc, vmax, ps)} 车高与车长需留意地库限高。"
    d3 = _tail_scene("suv")
    return t, [d1, d2, d3]


def _aston(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "DBX" in name:
        t = ["英伦超豪华 SUV", "V8 双涡轮线性", "绅士运动气质"]
    else:
        t = ["DB11 GT 优雅线条", "V8 巡航质感", "长途与巡游"]
    d1 = f"{name} 搭载 {eng}，约 {ps}，格栅与尾灯辨识度高。"
    d2 = f"{_perf_clause(acc, vmax, ps)}"
    d3 = "宜形象展示与纪念日出行；选装以实车为准。"
    return t, [d1, d2, d3]


def _lotus(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "ELETRE" in name:
        t = ["纯电 Hyper SUV", "905PS 级加速", "路特斯驾控基因"]
        d1 = f"{name} 为 {eng}，约 {ps}，低重心与空力套件强调下压力。"
        d2 = f"{_perf_clause(acc, vmax, ps)}"
        d3 = _tail_scene("ev")
    else:
        t = ["中置跑车布局", "V6 机械增压线性", "纯粹驾驶乐趣"]
        d1 = f"{name} 使用 {eng}，约 {ps}，车身紧凑利于判断弯道轨迹。"
        d2 = f"{_perf_clause(acc, vmax, ps)} 转向与路感直接，需循序渐进。"
        d3 = _tail_scene("super")
    return t, [d1, d2, d3]


def _mercedes_g(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "G900" in name or "宽体" in name:
        t = ["宽体套件视觉冲击", "G 级三把锁基因", "顶格公路存在感"]
    elif "4x4" in name:
        t = ["门式桥超高离地", "越野几何极限", "收藏级大 G"]
    elif "G63" in name or "AMG G63" in name:
        t = ["AMG V8 煮水声浪", "三把锁与动力", "城市与越野双场景"]
    elif "G350" in name and "柴油" in eng:
        t = ["柴油扭矩续航", "方盒子符号", "长途穿越实用"]
    elif "G350" in name:
        t = ["2.0T 入门大 G", "硬派造型与视野", "个性代步"]
    else:
        t = ["V8 双涡轮大 G", "三把锁攀爬能力", "豪华硬派结合"]
    d1 = f"{name} 配 {eng}，约 {ps}，高离地需注意地库限高。"
    d2 = f"{_perf_clause(acc, vmax, ps)}"
    d3 = _tail_scene("suv")
    return t, [d1, d2, d3]


def _mercedes_amg_car(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "AMG GT" in name:
        t = ["长鼻头 GT 跑车", "V8 双涡轮爆发", "赛道与公路"]
    else:
        t = ["AMG V8 性能轿车", "后驱/四驱抓地", "日常可用的性能"]
    d1 = f"{name} 搭载 {eng}，约 {ps}，宽体与散热开口服务性能。"
    d2 = f"{_perf_clause(acc, vmax, ps)}"
    d3 = "激烈驾驶请留意轮胎与制动温度；合法上路优先。"
    return t, [d1, d2, d3]


def _bmw_m(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "M5" in name:
        t = ["四门 V8 雷霆", "625PS 级输出", "豪华性能轿车"]
    elif "M4" in name or "M3" in name:
        t = ["S58 直六高转", "宽体与空力套件", "赛道化公路性能"]
    elif "M2" in name:
        t = ["紧凑双门性能", "短轴距灵活", "驾驶乐趣优先"]
    else:
        t = ["M Power 调校", "涡轮高功率", "驾驶者优先"]
    d1 = f"{name} 使用 {eng}，约 {ps}，悬架与转向偏运动沟通。"
    d2 = f"{_perf_clause(acc, vmax, ps)}"
    d3 = "适合体验日与合法公路驾驶；车宽与离地需注意。"
    return t, [d1, d2, d3]


def _bmw_sedan(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "7 系" in name:
        t = ["旗舰后排空间", "魔毯舒适取向", "商务尊崇"]
    elif "X5" in name:
        t = ["公路豪华 SUV", "直六顺滑", "家庭与长途"]
    else:
        t = ["驾驶者中心座舱", "48V 轻混顺滑", "均衡豪华"]
    d1 = f"{name} 配 {eng}，约 {ps}，人机工学与互联因年款而异。"
    d2 = f"{_perf_clause(acc, vmax, ps)}"
    d3 = _tail_scene("luxury_sedan")
    return t, [d1, d2, d3]


def _audi_sedan(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "A8" in name:
        t = ["旗舰 quattro 稳重", "后排尊崇", "灯光科技"]
    elif "A7" in name:
        t = ["溜背轿跑线条", "无框车门气质", "均衡动力"]
    elif "A3" in name:
        t = ["紧凑豪华入门", "灵活市区代步", "省油动力"]
    else:
        t = ["虚拟座舱科技", "quattro 抓地", "公务与家庭"]
    d1 = f"{name} 使用 {eng}，约 {ps}，灯光与内饰因配置而异。"
    d2 = f"{_perf_clause(acc, vmax, ps)}"
    d3 = "宜公务与家庭长途；具体选装建议实车核对。"
    return t, [d1, d2, d3]


def _mercedes_sedan(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "S400" in name or "S400L" in name:
        t = ["S 级旗舰智能", "后排尊崇", "L6 轻混顺滑"]
    elif "S350" in name:
        t = ["经典 S 级舒适", "V6 从容", "商务长途"]
    elif "E300" in name or "奔驰 E" in name or "款奔驰 E" in name:
        t = ["行政立标气质", "2.0T 高功轻混", "舒适通勤"]
    elif "C260" in name:
        t = ["C 级豪华入门", "1.5T 轻混省油", "年轻代步"]
    else:
        t = ["奔驰豪华座舱", "舒适悬挂滤震", "多场景出行"]
    d1 = f"{name} 搭载 {eng}，约 {ps}，内饰与屏幕因年款不同。"
    d2 = f"{_perf_clause(acc, vmax, ps)}"
    d3 = _tail_scene("luxury_sedan")
    return t, [d1, d2, d3]


def _ev(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "小米" in name:
        t = ["国产性能电驱", "双电机四驱", "智能座舱"]
    elif "特斯拉" in name:
        t = ["纯电狂暴加速", "极简座舱交互", "OTA 常用常新"]
    elif "理想" in name:
        if "MEGA" in name:
            t = ["纯电 MPV 空间", "低风阻造型", "家庭长途"]
        else:
            t = ["增程无焦虑", "六座家庭空间", "外放电露营"]
    elif "问界" in name:
        t = ["增程/电驱可选", "智能座舱", "全尺寸舒适"]
    else:
        t = ["新能源动力平顺", "静谧行驶", "智能辅助因年款而异"]
    d1 = f"{name} 为 {eng}，约 {ps}，电机扭矩释放快、车内更安静。"
    d2 = f"参考零百 {acc}、极速 {vmax}；续航与能耗因驾驶风格与气温而异。"
    d3 = _tail_scene("ev")
    return t, [d1, d2, d3]


def _mpv(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "埃尔法" in name:
        t = ["中排航空座椅", "侧滑门尊贵感", "明星同款接待"]
    elif "GL8" in name:
        t = ["七座商务经典", "高速巡航稳定", "团队出行"]
    elif "考斯特" in name:
        t = ["中巴团队运力", "改装内饰空间", "会务与接待"]
    elif "威霆" in name:
        t = ["大空间侧滑门", "改装潜力高", "团队接驳"]
    elif "M8" in name or "传祺" in name:
        t = ["国产豪华 MPV", "二排舒适", "性价比接待"]
    elif "梦想家" in name:
        t = ["插混 MPV 续航", "空悬滤震", "家庭与商务"]
    else:
        t = ["宽适乘坐布局", "侧滑门上下车", "家庭与团队"]
    d1 = f"{name} 使用 {eng}，约 {ps}，中后排为体验核心。"
    d2 = f"参考极速 {vmax}；满载时加速与制动距离与空载不同。"
    d3 = _tail_scene("mpv")
    return t, [d1, d2, d3]


def _pickup(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "霸王龙" in name:
        t = ["6.2L 机增巨兽", "702PS 级扭矩", "美式皮卡顶格"]
    else:
        t = ["猛禽高通过性", "3.5T 双涡轮", "越野与载物"]
    d1 = f"{name} 配 {eng}，约 {ps}，高坐姿与非铺装通过性强。"
    d2 = f"{_perf_clause(acc, vmax, ps)} 车宽与停车需提前规划。"
    d3 = "适合户外、摄影外拍与装备运输；限行与货斗法规请遵守。"
    return t, [d1, d2, d3]


def _offroad_cn(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "坦克" in name:
        t = ["硬派越野造型", "非铺装通过能力", "国产豪华越野"]
    elif "普拉多" in name:
        t = ["可靠混动四驱", "长途穿越口碑", "七座实用"]
    else:
        t = ["酷路泽家族气场", "大排量涡轮/混动", "全地形巡航"]
    d1 = f"{name} 使用 {eng}，约 {ps}，高离地利于沟坎通过。"
    d2 = f"{_perf_clause(acc, vmax, ps)}"
    d3 = _tail_scene("suv")
    return t, [d1, d2, d3]


def _maserati(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    if "总裁" in name:
        t = ["意式四门 GT", "声浪与豪华并存", "长途巡航"]
    elif "吉博力" in name:
        t = ["紧凑轿跑线条", "排气辨识度高", "个性代步"]
    else:
        t = ["Levante SUV 姿态", "V6 双涡轮", "品牌辨识度"]
    d1 = f"{name} 搭载 {eng}，约 {ps}，声浪调校情绪饱满。"
    d2 = f"{_perf_clause(acc, vmax, ps)}"
    d3 = "宜商务形象与私人庆典；选装以实车为准。"
    return t, [d1, d2, d3]


def _default(name: str, acc: str, vmax: str, ps: str, eng: str) -> tuple[list[str], list[str]]:
    t = [f"{name} 动力与性格", "公路驾驶体验", "预约与交付"]
    d1 = f"{name} 搭载 {eng}，约 {ps}，具体配置与年款以交付实车为准。"
    d2 = f"{_perf_clause(acc, vmax, ps)}"
    d3 = "芒果超跑支持预约看车，租期与随车物品可提前沟通。"
    return t, [d1, d2, d3]


def three_features_for_folder(folder: str) -> tuple[list[str], list[str]]:
    """主入口：返回三组 title 与 desc（不含 fit_desc 填充）。"""
    if folder in MANUAL_FEATURES:
        t, d = MANUAL_FEATURES[folder]
        return list(t), list(d)

    acc, vmax, ps, eng = get_stats_row(folder)
    n = folder

    if "法拉利" in n:
        return _ferrari(n, acc, vmax, ps, eng)
    if "兰博基尼" in n:
        return _lambo(n, acc, vmax, ps, eng)
    if "迈凯伦" in n:
        return _mclaren(n, acc, vmax, ps, eng)
    if n == "奥迪 R8":
        return _r8(n, acc, vmax, ps, eng)
    if re.search(r"GTR|GT-R|战神", n):
        return _gtr(n, acc, vmax, ps, eng)
    if "劳斯莱斯" in n or "幻影" in n or "古思特" in n or "古斯特" in n or n == "库里南":
        return _rolls(n, acc, vmax, ps, eng)
    if "宾利" in n:
        return _bentley(n, acc, vmax, ps, eng)
    if "迈巴赫" in n or "威霆迈巴赫" in n:
        return _maybach(n, acc, vmax, ps, eng)
    if "帕拉梅拉" in n:
        return _panamera(n, acc, vmax, ps, eng)
    if "保时捷" in n:
        return _porsche(n, acc, vmax, ps, eng)
    if "路虎" in n:
        return _land_rover(n, acc, vmax, ps, eng)
    if "阿斯顿" in n:
        return _aston(n, acc, vmax, ps, eng)
    if "路特斯" in n:
        return _lotus(n, acc, vmax, ps, eng)
    if re.search(r"奔驰 G|AMG G63|G900|G500|G350", n):
        return _mercedes_g(n, acc, vmax, ps, eng)
    if "AMG GT" in n or "C63" in n:
        return _mercedes_amg_car(n, acc, vmax, ps, eng)
    if re.search(r"宝马 M[0-9]", n):
        return _bmw_m(n, acc, vmax, ps, eng)
    if "岚图梦想家" in n or "腾势 D9" in n:
        return _mpv(n, acc, vmax, ps, eng)
    if re.search(r"特斯拉|小米 SU7|理想 |问界|岚图", n) or "ELETRE" in n:
        return _ev(n, acc, vmax, ps, eng)
    if re.search(
        r"埃尔法|别克 GL8|奔驰威霆|威霆迈巴赫|考斯特|传祺 M8|梦想家",
        n,
    ):
        return _mpv(n, acc, vmax, ps, eng)
    if "猛禽" in n or "霸王龙" in n:
        return _pickup(n, acc, vmax, ps, eng)
    if re.search(r"坦克|普拉多|酷路泽", n):
        return _offroad_cn(n, acc, vmax, ps, eng)
    if "玛莎拉蒂" in n:
        return _maserati(n, acc, vmax, ps, eng)
    if "宝马" in n:
        return _bmw_sedan(n, acc, vmax, ps, eng)
    if "奔驰" in n:
        return _mercedes_sedan(n, acc, vmax, ps, eng)
    if "奥迪" in n:
        return _audi_sedan(n, acc, vmax, ps, eng)
    if "福特" in n:
        return _pickup(n, acc, vmax, ps, eng)
    return _default(n, acc, vmax, ps, eng)
