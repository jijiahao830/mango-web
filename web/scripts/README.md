# web/scripts（站点维护脚本唯一目录）

这里的 Python / Node 脚本是**批量改详情页、生成数据、对齐首页与详情**的源码；**不要删除本目录**，也不要在别处另起一套同名逻辑，否则以后只能从零重写。

所有命令都在 **`web` 目录**下执行：`cd web`，再运行下表中的命令。

---

## 脚本一览

| 文件 | 作用 |
|------|------|
| `carpark_feature_copy.py` | 按车型名 + `carpark_vehicle_stats.json` 生成三组卖点文案（被 `generate_all_features.py` 调用，勿删） |
| `generate_all_features.py` | 生成 `generated_features.json` |
| `apply_carpark_features.py` | 把 `generated_features.json` 写入各车 `features-section` |
| `apply_carpark_vehicle_stats.py` | 用 `carpark_vehicle_stats.json` 更新 stats 四宫格 |
| `build_carpark_technical_specs.py` | 根据 stats 等生成 `carpark_vehicle_technical_specs.json` |
| `apply_carpark_technical_specs.py` | 把技术参 JSON 写入各车 `specs-section` |
| `apply_detail_other_models.py` | 统一详情顶栏 / 横幅图等非兰博基尼页样式 |
| `apply_detail_fab.py` | 统一右侧悬浮预约条（FAB） |
| `sync_detail_body_attrs.py` | 从根目录 `car.html` 同步 `data-daily-price` / `data-car-display-name` 到各详情页 |
| `gen_car_card_taglines.py` | 生成 `web/car_card_taglines.json`（选车卡片副标题） |
| `generate_carpark_placeholder_pages.py` | 为无 `car.html` 的车型目录生成占位详情（可连 MySQL `cars` 表） |
| `rebuild_gallery_unused.py` | 按规则重排「实车图赏」仅用未在全文其它处引用的图 |
| `update_scenarios.py` | 按规则更新「经典使用场景」区块（依赖 `no_webp_cars.txt`） |
| `generate_cars.js` | 用 `web/template.html` + 脚本内 `carsData` 批量生成 `carpark/<车>/car.html` |
| `batch_update_html.js` | 遍历所有 `carpark/*/car.html` 做自定义 `replace` |

---

## 数据文件（与脚本同目录）

| 文件 | 说明 |
|------|------|
| `carpark_vehicle_stats.json` | 各车四宫格原始数据；**手工或外部流程维护**，多支脚本读取 |
| `carpark_vehicle_technical_specs.json` | 一般由 `build_carpark_technical_specs.py` 生成后再 `apply` |
| `generated_features.json` | 由 `generate_all_features.py` 生成，再交给 `apply_carpark_features.py` |
| `cars_scenarios_from_db.json` | 可选；`update_scenarios.py` 用于补充分类 |

---

## 常用顺序（示例）

1. 改 stats 表数据 → `python3 scripts/build_carpark_technical_specs.py`（如需）→ `python3 scripts/apply_carpark_vehicle_stats.py` / `apply_carpark_technical_specs.py`  
2. 改卖点文案逻辑或 stats → `python3 scripts/generate_all_features.py` → `python3 scripts/apply_carpark_features.py`  
3. 首页与详情价格/车名对齐 → `python3 scripts/sync_detail_body_attrs.py`  
4. 卡片副标题 → `python3 scripts/gen_car_card_taglines.py`  

## Node（批量建页 / 全文替换）

```bash
cd web
node scripts/generate_cars.js
node scripts/batch_update_html.js
```

需本机已安装 Node.js；批量替换前建议备份 `carpark/`。

---

## 不在本目录的线上服务

`web/start.sh`、`web/member_api.py`、`web/requirements-member-api.txt` 仍在 **`web/`** 根目录，用于本地起会员 API，与静态批量脚本分开。

## 首页分类与场景卡片

仍直接编辑 **`web/index.html`**（`category-buttons`、`scenario-row`、`car-card` 的 `data-*`），无需改本目录脚本。
