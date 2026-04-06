import json
import random

random.seed(12345)

def pad(text, target_min=70, target_max=85):
    if target_min <= len(text) <= target_max:
        return text
    if len(text) > target_max:
        return text[:target_max-1] + "。"
    
    pads = [
        "，体验极佳。",
        "，带来难忘享受。",
        "，绝对是完美座驾。",
        "，让出行成为极致的享受。",
        "，展现出非凡魅力与独特品味。",
        "，为您带来绝佳体验，让人爱不释手。",
        "，无论是日常代步还是长途旅行，都能为您带来绝佳的体验。",
        "，这台车将为您带来无与伦比的极致驾驶体验与尊崇享受，让您的每一次出行都成为一场难忘的旅程。"
    ]
    pads.sort(key=len)
    base_text = text[:-1] if text.endswith("。") else text
    for p in pads:
        if len(base_text) + len(p) >= target_min:
            res = base_text + p
            if len(res) > target_max:
                return res[:target_max-1] + "。"
            return res
    res = base_text + pads[-1]
    return res[:target_max-1] + "。"

def generate_ferrari(name, acc, vmax, ps, eng):
    titles = [["跃马赛道基因", "意式超跑美学", "红魔极致性能"], ["极致加速体验", "澎湃动力输出", "令人瞩目的极速"], ["尊享奢华座舱", "战斗驾驶氛围", "人车合一驾控"]]
    d1 = f"{name}搭载{eng}引擎，爆发出{ps}的惊人动力。流线型车身提供了卓越的空气动力学表现。"
    d2 = f"这台猛兽的零百加速仅需{acc}，最高时速可达{vmax}。无论是起步还是加速，都能提供如同赛车般的推背感。"
    d3 = f"进入{name}车内，战斗气息的座舱瞬间点燃热血。碳纤维与高级皮质提升了质感，随时掌控这台性能机器。"
    return [random.choice(t) for t in titles], [pad(d1), pad(d2), pad(d3)]

def generate_lambo(name, acc, vmax, ps, eng):
    titles = [["狂野蛮牛风范", "锋利几何线条", "极具侵略性外观"], ["极致零百加速", "令人血脉贲张", "纯粹超跑性能"], ["战斗机式座舱", "专属个性体验", "夺目吸睛利器"]]
    d1 = f"{name}采用楔形设计，{eng}引擎爆发出{ps}的动力。低趴姿态与极具侵略性的前脸，视觉压迫感十足。"
    d2 = f"它的百公里加速仅为{acc}，极限速度高达{vmax}。强大的驱动系统确保动力精准传递，提供血脉贲张的体验。"
    d3 = f"进入{name}车内，战斗机般的座舱氛围点燃激情。仪式感的启动按键与科技感仪表盘，让出行充满乐趣。"
    return [random.choice(t) for t in titles], [pad(d1), pad(d2), pad(d3)]

def generate_rolls(name, acc, vmax, ps, eng):
    titles = [["殿堂级奢华气场", "纯正英伦皇室风范", "无与伦比的尊崇"], ["魔毯般平稳驾乘", "静谧的私人空间", "从容不迫的性能"], ["专属高定内饰", "顶级商务接待", "手工打造的艺术"]]
    d1 = f"{name}以威严比例诠释极致奢华。搭载{eng}引擎提供{ps}充沛动力，标志性格栅让出行充满仪式感。"
    d2 = f"拥有{acc}的零百加速与{vmax}的极速，这台车将平顺性放在首位。魔毯悬架化解外界喧嚣，打造静谧空间。"
    d3 = f"{name}车内采用顶级真皮与木饰纯手工打造，细节尽显匠心。梦幻星空顶营造温馨氛围，是顶级商务接待首选。"
    return [random.choice(t) for t in titles], [pad(d1), pad(d2), pad(d3)]

def generate_porsche(name, acc, vmax, ps, eng):
    titles = [["斯图加特纯粹基因", "经典保时捷设计", "运动与豪华的平衡"], ["精准操控体验", "卓越的动态表现", "令人惊叹的加速"], ["全能出行伙伴", "豪华科技座舱", "兼顾日常与激情"]]
    d1 = f"{name}继承了保时捷运动基因，{eng}输出{ps}强悍马力。流畅线条与辨识度极高的家族前脸，令人过目不忘。"
    d2 = f"该车型零百加速仅需{acc}，最高车速达到{vmax}。得益于顶级的底盘调校与转向系统，弯道中保持极高稳定性。"
    d3 = f"{name}不仅性能出色，舒适座椅和互联系统同样适合日常通勤。人性化中控布局让驾驶者时刻保持专注。"
    return [random.choice(t) for t in titles], [pad(d1), pad(d2), pad(d3)]

def generate_mclaren(name, acc, vmax, ps, eng):
    titles = [["英伦赛道黑科技", "极致轻量化车身", "迈凯伦超跑哲学"], ["蝴蝶门炫酷登场", "空气动力学大师", "迅猛的加速表现"], ["人车合一的沟通", "硬核驾驶体验", "纯粹驾驶机器"]]
    d1 = f"{name}采用碳纤维单体壳，结合{eng}带来的{ps}动力，性能强悍。蝴蝶门设计充满仪式感，成为绝对焦点。"
    d2 = f"这台超跑零百加速仅{acc}，极速达{vmax}，加速体感震撼。车身风道与空力套件，在高速时提供强大下压力。"
    d3 = f"坐进{name}座舱，极简专注的驾驶氛围瞬间拉回道路。摒弃多余配置，将重心放在路感与转向精准度上。"
    return [random.choice(t) for t in titles], [pad(d1), pad(d2), pad(d3)]

def generate_mercedes(name, acc, vmax, ps, eng):
    titles = [["三叉星辉豪华典范", "梅赛德斯优雅气场", "德系尊贵工艺"], ["从容不迫的动力", "舒适静谧的巡航", "均衡的性能表现"], ["智能豪华驾驶舱", "行政级尊贵享受", "多场景出行首选"]]
    if "G" in name and "AMG" not in name: titles[0] = ["硬派越野图腾", "方盒子经典造型", "无畏全地形挑战"]
    elif "AMG" in name or "G63" in name or "G900" in name: titles[0] = ["AMG狂暴性能", "令人血脉贲张", "极致的性能图腾"]
    d1 = f"{name}完美诠释奔驰对豪华的理解，{eng}输出{ps}的动力。优雅大气造型与精致漆面，在任何场合都脱颖而出。"
    d2 = f"该车百公里加速{acc}，最高时速{vmax}，从容不迫。顶级底盘悬挂系统将路面颠簸化解于无形，驾乘极为舒适。"
    d3 = f"{name}内饰采用大尺寸中控，搭配华丽氛围灯。座椅支撑性极佳，丰富的配置让长时间乘坐也不会疲惫。"
    return [random.choice(t) for t in titles], [pad(d1), pad(d2), pad(d3)]

def generate_bmw(name, acc, vmax, ps, eng):
    titles = [["巴伐利亚运动灵魂", "纯粹驾驶乐趣", "动感双肾格栅"], ["精准灵动的操控", "强劲的加速实力", "随叫随到的动力"], ["智能豪华驾驶舱", "全能型运动座驾", "个性与实用的结合"]]
    if "M" in name and len(name) < 12: titles[0] = ["M Power赛道信仰", "极致性能怪兽", "武装到牙齿的套件"]
    d1 = f"{name}坚持以驾驶者为中心，{eng}引擎马力达到{ps}。凌厉线条与标志性双肾进气格栅，散发强烈运动气息。"
    d2 = f"这台杰作零百加速{acc}，最高时速{vmax}，动力随叫随到。完美的重量分配让它在弯道中拥有极高极限。"
    d3 = f"除了着迷的操控，{name}在科技与舒适性上毫不妥协。极具包裹性的运动座椅与互联系统，让旅途充满愉悦。"
    return [random.choice(t) for t in titles], [pad(d1), pad(d2), pad(d3)]

def generate_audi(name, acc, vmax, ps, eng):
    titles = [["奥迪科技美学", "突破科技启迪未来", "低调奢华的气质"], ["quattro四驱信仰", "稳健的加速表现", "全天候的从容"], ["虚拟座舱体验", "商务与家庭兼备", "高品质德系工艺"]]
    d1 = f"{name}展现了奥迪工业设计深厚造诣，{eng}拥有{ps}动力储备。锐利大灯与流畅轮廓相得益彰，契合精英审美。"
    d2 = f"该车零百加速时间{acc}，极速可达{vmax}，加速平稳线性。卓越的quattro四驱系统，面对恶劣路况依然从容。"
    d3 = f"{name}内饰采用虚拟座舱设计，高清屏幕交互极佳。宽敞舒适内部空间与考究用料，商务或出游都能完美胜任。"
    return [random.choice(t) for t in titles], [pad(d1), pad(d2), pad(d3)]

def generate_ev(name, acc, vmax, ps, eng):
    titles = [["前沿新能源科技", "未来出行新体验", "极简科技美学"], ["极致平顺的加速", "静谧如深海的座舱", "令人惊叹的电驱性能"], ["全方位智能互联", "移动的数字空间", "绿色环保出行优选"]]
    d1 = f"作为新能源时代的杰出代表，{name}采用{eng}系统，带来{ps}动力。极简未来感的外观设计，重新定义出行美学。"
    d2 = f"得益于电驱动特性，该车零百加速仅需{acc}，极速达{vmax}。动力毫无迟滞地倾泻而出，同时车内保持超乎想象安静。"
    d3 = f"{name}配备领先的智能辅助驾驶与丰富座舱娱乐功能。宽敞空间犹如移动数字客厅，为您提供轻松安全的体验。"
    return [random.choice(t) for t in titles], [pad(d1), pad(d2), pad(d3)]

def generate_mpv(name, acc, vmax, ps, eng):
    titles = [["顶级商务MPV", "陆地头等舱体验", "尊贵接待首选"], ["平稳舒适的旅程", "从容应对各种路况", "静谧安稳的行驶"], ["航空级独立座椅", "奢华宽敞的内部空间", "全能的多面手"]]
    d1 = f"{name}专为高端接待与多人出行而生，搭载{eng}动力输出{ps}马力。庞大车身造型，无论何处都展现强大尊崇气场。"
    d2 = f"平稳是MPV最大美德，零百加速{acc}，极速{vmax}。悬挂系统经过精心调校，有效过滤颠簸，确保后排贵宾绝对舒适。"
    d3 = f"{name}精髓在于奢华后排，配备按摩通风等功能的航空级座椅。宽敞腿部空间搭配高级音响，接送客户极佳。"
    return [random.choice(t) for t in titles], [pad(d1), pad(d2), pad(d3)]

def generate_offroad(name, acc, vmax, ps, eng):
    titles = [["硬派越野悍将", "征服全地形的利器", "粗犷霸气的外观"], ["卓越的通过性能", "无视地形的从容", "稳如泰山的底盘"], ["户外探险绝佳伴侣", "宽敞实用的装载空间", "诗和远方的门票"]]
    d1 = f"{name}天生为征服复杂路况存在，{eng}引擎拥有{ps}澎湃动力。高耸离地间隙与硬朗车身线条，都市或荒野尽显阳刚。"
    d2 = f"这台越野利器百公里加速{acc}，最高时速{vmax}。强大的四驱系统与非承载式车身，在泥泞沙石等非铺装路面如履平地。"
    d3 = f"无论是无人区露营还是穿越大好河山，{name}都提供坚实保障。宽敞空间舒适乘坐，轻松装下大量装备探索未知。"
    return [random.choice(t) for t in titles], [pad(d1), pad(d2), pad(d3)]

def generate_default(name, acc, vmax, ps, eng):
    titles = [["独具匠心的设计", "卓越的工程杰作", "豪华与个性的融合"], ["随心所欲的操控", "平顺畅快的加速", "值得信赖的性能"], ["舒适考究的内饰", "多用途出行良驹", "彰显非凡品味"]]
    d1 = f"{name}以独特设计语言脱颖而出，{eng}系统稳定输出{ps}的动力。流线型轮廓与精致细节，让它具有极高辨识度。"
    d2 = f"在日常驾驶或长途旅行中，该车零百加速时间为{acc}，最高车速达{vmax}。在动力输出与燃油经济性之间找到完美平衡。"
    d3 = f"步入{name}车内，精致用料与人性化按键布局让人倍感温馨。宽敞座舱环境与先进娱乐系统，是彰显品味的绝佳名片。"
    return [random.choice(t) for t in titles], [pad(d1), pad(d2), pad(d3)]

def generate_for_car(name, acc, vmax, ps, eng):
    if "法拉利" in name: return generate_ferrari(name, acc, vmax, ps, eng)
    if "兰博基尼" in name: return generate_lambo(name, acc, vmax, ps, eng)
    if "迈凯伦" in name: return generate_mclaren(name, acc, vmax, ps, eng)
    if "劳斯莱斯" in name or "幻影" in name or "古思特" in name or "古斯特" in name or "库里南" in name:
        return generate_rolls(name, acc, vmax, ps, eng)
    if "保时捷" in name or "帕拉梅拉" in name or "卡宴" in name or "Taycan" in name:
        return generate_porsche(name, acc, vmax, ps, eng)
    if "奔驰" in name or "迈巴赫" in name or "威霆" in name or "AMG" in name or "G500" in name or "G350" in name or "G900" in name or "C63" in name:
        if "威霆" in name: return generate_mpv(name, acc, vmax, ps, eng)
        return generate_mercedes(name, acc, vmax, ps, eng)
    if "宝马" in name: return generate_bmw(name, acc, vmax, ps, eng)
    if "奥迪" in name: return generate_audi(name, acc, vmax, ps, eng)
    if "特斯拉" in name or "理想" in name or "问界" in name or "小米" in name or "岚图" in name or "腾势" in name:
        return generate_ev(name, acc, vmax, ps, eng)
    if "埃尔法" in name or "GL8" in name or "传祺" in name or "考斯特" in name or "梦想家" in name:
        return generate_mpv(name, acc, vmax, ps, eng)
    if "坦克" in name or "普拉多" in name or "酷路泽" in name or "猛禽" in name or "霸王龙" in name or "卫士" in name or "揽胜" in name or "路虎" in name:
        return generate_offroad(name, acc, vmax, ps, eng)
    return generate_default(name, acc, vmax, ps, eng)

def main():
    stats_file = "/Users/jijiahao/Desktop/芒果/mango-web/web/scripts/carpark_vehicle_stats.json"
    with open(stats_file, "r", encoding="utf-8") as f:
        stats = json.load(f)
        
    out_dict = {}
    for car_name, data in stats.items():
        acc, vmax, ps, eng = data
        titles, descs = generate_for_car(car_name, acc, vmax, ps, eng)
        out_dict[car_name] = [titles, descs]
        
    out_file = "/Users/jijiahao/Desktop/芒果/mango-web/web/scripts/generated_features.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(out_dict, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
