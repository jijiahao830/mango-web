# mango-web
芒果租车网站

维护脚本与批量改详情页的说明见 **`web/scripts/README.md`**（请在仓库中保留 `web/scripts` 目录，避免重复造轮子）。

## 运行 `web/start.sh` 前：配置 `app_config.json`

`app_config.json` 含数据库与 API 端口等敏感信息，**默认不入库**（见 `web/.gitignore`）。在 **`web` 目录**（与 `start.sh`、`member_api.py` 同级）创建该文件。

```bash
cd web
cp app_config.example.json app_config.json
# 编辑 app_config.json：至少填写 database.mysql.database、mysql 账号密码；按需改 api_port、cardata_password
```

- **MySQL**：`database.type` 为 `mysql`，在 `database.mysql` 中填写 `host`、`port`、`user`、`password`、**`database`（库名，必填）**。需存在 `member` 表（或按配置改 `database.table` / 各列名），字段与登录逻辑见 `member_api.py` 注释。
- **仅本地/SQLite 测试**：可将 `database.type` 设为 `sqlite`，并配置 `sqlite_path`、`table` 等（见 `member_api.py` 中 `database.type == "sqlite"` 分支）。
- **端口**：`api_port` 默认 `8765`，`start.sh` 会读取该端口；云服务器需在安全组放行对应端口。

完成后执行：`./start.sh`
