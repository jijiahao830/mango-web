"""按车型与分类批量更新 car.html 内 scenario-showcase-section（婚庆/商务/摆展/自驾 等）。

依赖 web/no_webp_cars.txt 列出要处理的车文件夹名；可选 web/scripts/cars_scenarios_from_db.json 提供分类。
用法：在 web 目录执行  python3 scripts/update_scenarios.py
"""
import json
import random
import re
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent
CARPARK = WEB / "carpark"

random.seed(42)

def load_db_categories():
    path = WEB / "scripts" / "cars_scenarios_from_db.json"
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
        return {d["car_name"]: d["category"] for d in data}

def get_wedding_desc(car_name):
    descs = [
        f"在人生中最重要的时刻，让 {car_name} 成为婚车队伍的灵魂。其极具张力的线条与轰鸣声浪能瞬间聚焦全场目光，拉升婚礼整体格调。",
        f"作为婚庆影像拍摄的绝佳选择，{car_name} 自带的超跑气场与优雅身姿，能够完美融入每一个浪漫瞬间，留下最珍贵的回忆。",
        f"选择 {car_name} 作为主婚车，不仅是速度与激情的象征，更是对美好生活的极致向往，让您的婚礼排面十足，赚足眼球。",
        f"无论是在城市地标前合影，还是在前往婚礼现场的路上，{car_name} 都能以其独特的魅力成为最亮眼的风景线。"
    ]
    return random.choice(descs)

def get_business_desc(car_name):
    descs = [
        f"驾驶或乘坐 {car_name} 出席高端商务场合，其无与伦比的奢华气场与静谧尊崇的乘坐空间，让每一次接送都彰显非凡实力与品味。",
        f"作为顶级接待的标杆之作，{car_name} 为贵宾提供如同陆地头等舱般的体验，是商务洽谈与重要会议接送的理想座驾。",
        f"在商务接送中，{car_name} 凭借其考究的内饰与平稳的行驶质感，为您和您的客户打造一个私密、舒适且极具尊荣感的移动空间。",
        f"展现企业实力的最佳名片，{car_name} 宜商宜家的全能表现，让每一次商务出行都从容不迫，尽显成功者风范。"
    ]
    return random.choice(descs)

def get_exhibition_desc(car_name):
    descs = [
        f"将 {car_name} 用于品牌活动或商业摆展，其独特的车身设计与强大的气场将成为全场焦点，极大地提升活动档次与吸引力。",
        f"作为静态展示的艺术品，{car_name} 能够迅速汇聚人流，为您的商业发布会或高端品鉴会带来超乎想象的传播效果。",
        f"无论置于何种展区，{car_name} 自身携带的稀缺属性与极致美学，都能完美契合高端品牌的调性，成为不可替代的视觉中心。",
        f"凭借其出众的吸睛能力，{car_name} 是各类大型展览、庆典活动中不可或缺的重磅角色，助您轻松引爆活动现场氛围。"
    ]
    return random.choice(descs)

def get_selfdrive_desc(car_name):
    descs = [
        f"驾驶 {car_name} 穿梭于都市丛林或在周末驶向郊野，其出色的操控质感与智能科技配置将为您带来轻松愉悦的出行体验。",
        f"无论是日常的高品质代步，还是长途的自驾探索，{car_name} 都能以其可靠的性能与舒适的座舱，让每一次出发都充满期待。",
        f"享受属于自己的驾驶时光，{car_name} 将路感与舒适完美平衡，是您在繁忙生活之余，追寻诗与远方的最佳自驾伴侣。",
        f"从繁华街头到蜿蜒山路，{car_name} 出众的动态表现与前沿的科技配置，让自驾出游不仅是赶路，更是一场身心放松的享受。"
    ]
    return random.choice(descs)

def get_wedding_features():
    pools = [
        ["✓ 极致吸睛的超跑外观", "✓ 令人瞩目的流线车身", "✓ 极具张力的外观设计", "✓ 过目不忘的惊艳造型"],
        ["✓ 适合浪漫婚庆出车", "✓ 影视拍摄绝佳道具", "✓ 完美契合婚摄场景", "✓ 婚礼车队的核心担当"],
        ["✓ 轰鸣声浪自带气场", "✓ 点燃氛围的引擎咆哮", "✓ 高调拉风的出行体验", "✓ 彰显个性的排气声浪"],
        ["✓ 芒果超跑提供专业建议", "✓ 专属定制的跟车服务", "✓ 丰富的婚车调度经验", "✓ 确保重要时刻万无一失"]
    ]
    return [random.choice(p) for p in pools]

def get_business_features():
    pools = [
        ["✓ 殿堂级奢华与尊贵气场", "✓ 不怒自威的强大气场", "✓ 彰显实力的顶级座驾", "✓ 行政级豪华的标杆"],
        ["✓ 适合高端商务接待", "✓ 贵宾接送的完美选择", "✓ 商务洽谈的私密空间", "✓ 提升企业形象的利器"],
        ["✓ 极致静谧的后排体验", "✓ 陆地头等舱般的享受", "✓ 平稳舒适的乘坐质感", "✓ 考究细腻的内饰工艺"],
        ["✓ 可预约专属司机服务", "✓ 专业的商务接待礼仪", "✓ 省心省力的出行保障", "✓ 满足高规格接待需求"]
    ]
    return [random.choice(p) for p in pools]

def get_exhibition_features():
    pools = [
        ["✓ 极具视觉冲击力的外观", "✓ 堪称艺术的工业设计", "✓ 稀缺且吸睛的限量属性", "✓ 完美诠释极致美学"],
        ["✓ 适合商业摆展 / 发布会", "✓ 提升活动整体调性", "✓ 高端品鉴会的镇场之宝", "✓ 契合奢侈品牌的调性"],
        ["✓ 吸引客流与媒体的利器", "✓ 自带流量的话题制造者", "✓ 轻松引爆现场氛围", "✓ 极佳的拍照打卡背景"],
        ["✓ 灵活的场地适应能力", "✓ 提供专业的静态展示指导", "✓ 芒果超跑专属布展配合", "✓ 确保展示效果最大化"]
    ]
    return [random.choice(p) for p in pools]

def get_selfdrive_features():
    pools = [
        ["✓ 智能便捷的驾驶体验", "✓ 随心所欲的操控质感", "✓ 强劲充沛的动力储备", "✓ 兼顾舒适与运动的底盘"],
        ["✓ 适合自驾出游 / 都市代步", "✓ 周末探索郊野的良驹", "✓ 满足全场景出行的需求", "✓ 长途穿越的可靠伴侣"],
        ["✓ 极佳的性能与操控反馈", "✓ 丰富前沿的科技配置", "✓ 舒适宽敞的座舱空间", "✓ 优异的燃油/电能经济性"],
        ["✓ 优雅时尚的设计语言", "✓ 彰显个人品味的座驾", "✓ 享受纯粹驾驶乐趣", "✓ 释放生活压力的出口"]
    ]
    return [random.choice(p) for p in pools]

def determine_scenario(car_name, category):
    # 严格按照四大分类返回，不允许修改 title
    if any(k in car_name for k in ["法拉利", "兰博基尼", "迈凯伦", "保时捷 992", "保时捷 718", "奥迪 R8", "阿斯顿马丁"]):
        return {
            "title": "婚庆",
            "desc": get_wedding_desc(car_name),
            "features": get_wedding_features()
        }
    elif any(k in car_name for k in ["劳斯莱斯", "宾利", "迈巴赫", "埃尔法", "GL8", "威霆", "传祺", "考斯特", "总裁", "S级", "7系", "A8", "梦想家", "腾势"]):
        return {
            "title": "商务",
            "desc": get_business_desc(car_name),
            "features": get_business_features()
        }
    elif any(k in car_name for k in ["摆展", "展示"]):
        return {
            "title": "摆展",
            "desc": get_exhibition_desc(car_name),
            "features": get_exhibition_features()
        }
    elif any(k in car_name for k in ["奔驰 G", "卫士", "揽胜", "霸王龙", "猛禽", "坦克", "帕拉梅拉", "保时捷 Taycan", "理想", "特斯拉", "宝马 M", "AMG"]):
        return {
            "title": "自驾",
            "desc": get_selfdrive_desc(car_name),
            "features": get_selfdrive_features()
        }
    else:
        # Fallback to category based
        if category == "超跑":
            return {
                "title": "婚庆",
                "desc": get_wedding_desc(car_name),
                "features": get_wedding_features()
            }
        elif category in ["行政级轿车", "商务车"]:
            return {
                "title": "商务",
                "desc": get_business_desc(car_name),
                "features": get_business_features()
            }
        elif category in ["摆展", "展示", "商业"]:
            return {
                "title": "摆展",
                "desc": get_exhibition_desc(car_name),
                "features": get_exhibition_features()
            }
        else:
            return {
                "title": "自驾",
                "desc": get_selfdrive_desc(car_name),
                "features": get_selfdrive_features()
            }

def patch_scenario(html: str, car_name: str, category: str) -> str:
    scenario = determine_scenario(car_name, category)
    
    m = re.search(r'<section class="scenario-showcase-section">.*?</section>', html, re.S)
    if not m:
        return html
    block = m.group(0)

    block = re.sub(
        r'<h3 class="scenario-showcase-title">.*?</h3>',
        f'<h3 class="scenario-showcase-title">{scenario["title"]}</h3>',
        block
    )
    
    block = re.sub(
        r'<p class="scenario-showcase-desc">.*?</p>',
        f'<p class="scenario-showcase-desc">{scenario["desc"]}</p>',
        block
    )
    
    features_html = "\n".join([f"            <li>{f}</li>" for f in scenario["features"]])
    block = re.sub(
        r'<ul class="scenario-features">.*?</ul>',
        f'<ul class="scenario-features">\n{features_html}\n          </ul>',
        block,
        flags=re.S
    )
    
    return html[: m.start()] + block + html[m.end() :]

def main() -> int:
    n = 0
    categories = load_db_categories()
    
    no_webp_file = WEB / "no_webp_cars.txt"
    if not no_webp_file.exists():
        print("no_webp_cars.txt not found")
        return 1
        
    target_dirs = [line.strip() for line in no_webp_file.read_text(encoding="utf-8").splitlines() if line.strip()]
    
    for d in target_dirs:
        car_html = CARPARK / d / "car.html"
        if not car_html.exists():
            continue
            
        text = car_html.read_text(encoding="utf-8", errors="replace")
        
        category = categories.get(d)
        if not category:
            for k, v in categories.items():
                if k in d or d in k:
                    category = v
                    break
            if not category:
                category = "轿车"
                
        new_text = patch_scenario(text, d, category)
        
        if new_text != text:
            car_html.write_text(new_text, encoding="utf-8")
            n += 1
            
    print("updated", n, "car.html scenario sections based on category")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())