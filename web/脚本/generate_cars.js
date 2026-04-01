const fs = require('fs');
const path = require('path');

// 车辆数据配置
const carsData = [
  {
    id: "ferrari-f8",
    folderName: "法拉利 F8（红色）",
    brand: "法拉利",
    name: "法拉利 F8",
    price: "2999",
    category: "超跑",
    speed: "2.9s",
    power: "720马力",
    engine: "V8 双涡轮增压",
    topSpeed: "340km/h",
    desc: "作为法拉利中置V8跑车的巅峰之作，F8 Tributo完美融合了极致性能与意式优雅。"
  }
  // 在这里继续添加其他车辆的数据
];

// 模板文件路径
const templatePath = path.join(__dirname, '../template.html');

function generateCars() {
  if (!fs.existsSync(templatePath)) {
    console.error('错误: 找不到模板文件 template.html。请先在项目根目录创建一个 template.html。');
    return;
  }

  const templateContent = fs.readFileSync(templatePath, 'utf8');

  carsData.forEach(car => {
    const carDir = path.join(__dirname, '../cars', car.folderName);
    
    // 如果文件夹不存在，则创建
    if (!fs.existsSync(carDir)) {
      fs.mkdirSync(carDir, { recursive: true });
      console.log(`创建文件夹: ${car.folderName}`);
    }

    // 替换模板中的占位符
    let htmlContent = templateContent
      .replace(/\{\{CAR_NAME\}\}/g, car.name)
      .replace(/\{\{CAR_BRAND\}\}/g, car.brand)
      .replace(/\{\{CAR_PRICE\}\}/g, car.price)
      .replace(/\{\{0_100_SPEED\}\}/g, car.speed)
      .replace(/\{\{CAR_POWER\}\}/g, car.power)
      .replace(/\{\{CAR_ENGINE\}\}/g, car.engine)
      .replace(/\{\{TOP_SPEED\}\}/g, car.topSpeed)
      .replace(/\{\{CAR_DESC\}\}/g, car.desc);

    // 写入新的 car.html
    const indexPath = path.join(carDir, 'car.html');
    fs.writeFileSync(indexPath, htmlContent, 'utf8');
    console.log(`生成成功: ${car.folderName}/car.html`);
  });

  console.log('所有车辆页面生成完毕！');
}

generateCars();
