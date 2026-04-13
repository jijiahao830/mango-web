const fs = require('fs');
const path = require('path');

// 要执行替换操作的目录
const carsDir = path.join(__dirname, '../carpark');

// 遍历所有的子目录
function updateAllCars() {
  const folders = fs.readdirSync(carsDir);
  
  folders.forEach(folder => {
    const indexPath = path.join(carsDir, folder, 'car.html');
    
    // 如果存在 car.html 才处理
    if (fs.existsSync(indexPath)) {
      let content = fs.readFileSync(indexPath, 'utf8');
      
      // ==========================================
      // 在这里写你要批量替换的规则
      // ==========================================
      
      // 示例 1: 把旧的文案替换成新的
      // content = content.replace(/旧文案/g, '新文案');
      
      // 示例 2: 批量修改视频的背景颜色
      // content = content.replace(/background-color: #000;/g, 'background-color: transparent;');
      
      // 写回文件
      fs.writeFileSync(indexPath, content, 'utf8');
      console.log(`已更新: ${folder}/car.html`);
    }
  });
  
  console.log('批量更新完成！');
}

updateAllCars();
