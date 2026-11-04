# 账号与初始密码批量生成

## 1. 准备工号文件
使用 `employee_ids_template.csv` 作为模板，至少保留一列：

```csv
employee_no
10001
10002
10003
```

也支持 `.xlsx`（默认读取首个工作表）。

## 2. 执行脚本

```bash
python scripts/batch_generate_accounts.py -i scripts/employee_ids_template.csv -o scripts/output
```

可选参数：

- `--employee-column`：工号列名，默认 `employee_no`
- `--account-prefix`：账号前缀，默认 `gh_`
- `--password-length`：密码长度，默认 `8`（最小 8）

示例：

```bash
python scripts/batch_generate_accounts.py -i employees.xlsx -o output --employee-column staff_id --account-prefix guild_
```

## 3. 输出文件

- `accounts_for_import.csv`：用于系统导入（含 `force_reset_password=1`）
- `password_dispatch.csv`：用于账号密码分发

## 4. 安全建议（上线必做）

1. 首次登录强制改密。
2. 密码分发采用一次性、安全渠道。
3. 分发完成后清理明文密码文件。
