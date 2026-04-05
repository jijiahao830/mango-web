# 车辆数据与自动化脚本使用说明

为了方便后续批量添加和管理 300+ 辆车，我为您准备了这两个基础脚本。

## 1. 批量生成新车页面 (`generate_cars.js`)

**用途**：根据一个标准的模板，快速生成几十上百个新车的 `index.html` 页面，省去手动复制粘贴的繁琐工作。

**使用步骤**：
1. 在项目根目录复制一个你最满意的车辆 `index.html`，重命名为 `template.html`。
2. 打开 `template.html`，把里面需要变化的数据（如车名、价格、马力等）替换成占位符，例如：`{{CAR_NAME}}`、`{{CAR_PRICE}}`。
3. 打开 `generate_cars.js`，在 `carsData` 数组中录入你要添加的新车数据。
4. 在终端运行：`node 脚本/generate_cars.js`。

## 2. 批量修改现有页面 (`batch_update_html.js`)

**用途**：当你发现所有 300 辆车的页面都需要修改某个通用部分（比如：换一个客服电话、修改一个按钮颜色、替换一个共同的文案）时使用。

**使用步骤**：
1. 打开 `batch_update_html.js`。
2. 找到代码中的 `// content = content.replace(/旧文案/g, '新文案');` 部分。
3. 填入你要替换的内容。
4. 在终端运行：`node 脚本/batch_update_html.js`。

## 3. 如何修改首页车辆分类标签

如果您需要修改或新增首页的车辆分类筛选标签，**不需要修改 JS 代码**，只需修改 `index.html` 即可。

**操作步骤**：
1. 打开根目录的 `index.html`。
2. 找到 `<div class="category-buttons">`（大约在第 83 行左右）。
3. **添加或修改分类按钮**：
   - 复制或修改其中的 `<button>` 标签。
   - `data-category="分类名"` 是用于程序筛选的唯一标识。
   - 标签内的文字是显示给用户看的，例如：
     `<button class="category-btn" data-category="敞篷车">敞篷车</button>`
4. **给车辆打上对应的标签**：
   - 在 `index.html` 往下找到你要归类的车辆卡片（`<div class="car-card">`）。
   - 将卡片的 `data-category` 属性改为你刚刚设置的分类名：
     `<div class="car-card" data-category="敞篷车">`
   - （可选）如果你想修改卡片左上角显示的角标文字，修改内部的 `.car-badge` 元素即可：
     `<div class="car-badge card-badge-overlay">敞篷车</div>`

完成以上修改后，保存文件刷新页面，分类筛选功能就会自动生效。

## 4. 如何修改首页的“经典使用场景”卡片

和车辆分类一样，修改或新增顶部的四张大图“使用场景”卡片（如商务、婚庆等），也只需修改 `index.html`，无需修改任何 JS 代码。

**操作步骤**：
1. 打开根目录的 `index.html`。
2. 找到 `<div class="scenario-row">`（大约在第 51 行左右）。
3. **修改现有场景**：
   - 每个场景由一个 `<a class="scenario-card">` 包裹。
   - `data-scenario="场景名"` 是程序筛选用的唯一标识（比如 `"business"`）。
   - 如果要改图片，修改内部的 `<img src="./time/商务/商务1.png">` 路径。
   - 修改显示的文字，只需更改 `<div class="scenario-name">商务</div>` 和 `<div class="scenario-name-hover">商务</div>` 里面的文本。
4. **给车辆打上场景标签**：
   - 找到你想在这个场景下显示的车辆卡片（`<div class="car-card">`）。
   - 在这辆车的卡片上，添加或修改 `data-scenario` 属性。
   - 例如，你想让某辆车在“商务”场景下显示，就写成：
     `<div class="car-card" data-category="豪华轿车" data-scenario="business">`
   - **注意**：一辆车可以同时拥有 `data-category` 和 `data-scenario`，这样它既能在按车型分类时显示，也能在按场景分类时显示。

完成以上修改后，保存并刷新页面，点击对应的场景卡片，下方就会自动筛选出带有该 `data-scenario` 标签的车辆。

> **提示**：运行脚本前请确保你已经安装了 Node.js 环境。在执行批量修改前，建议先备份 `carpark` 文件夹防丢失。
