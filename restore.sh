#!/bin/bash
# Supabase 数据恢复脚本
# 用法: bash restore.sh <备份文件路径>
# 例如: bash restore.sh backups/supabase_backup_20260905_120000.json

set -e

if [ -z "$1" ]; then
  echo "❌ 请指定备份文件路径"
  echo "用法: bash restore.sh <备份文件路径>"
  echo "例如: bash restore.sh backups/supabase_backup_20260905_120000.json"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ 备份文件不存在: $BACKUP_FILE"
  exit 1
fi

# 从 .env 读取配置
SUPABASE_URL=$(grep 'VITE_SUPABASE_URL' .env | cut -d= -f2 | tr -d '"')
SUPABASE_ANON_KEY=$(grep 'VITE_SUPABASE_ANON_KEY' .env | cut -d= -f2 | tr -d '"')

ROOM_ID="llyyds"

echo "⚠️  即将恢复数据到 Supabase"
echo "   备份文件: $BACKUP_FILE"
echo "   项目: $SUPABASE_URL"
echo ""
read -p "确定要恢复吗？这将覆盖现有数据 (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "已取消"
  exit 0
fi

# 读取备份数据
RECORDS=$(python3 -c "
import json, sys
with open('$BACKUP_FILE') as f:
    data = json.load(f)
for item in data:
    coll = item.get('collection', '')
    data_str = json.dumps(item.get('data', {}))
    # 转义用于 shell
    print(coll + '\t' + data_str.replace('\\\\', '\\\\\\\\').replace('\"', '\\\\\"'))
" 2>/dev/null)

if [ -z "$RECORDS" ]; then
  echo "❌ 备份文件解析失败或为空"
  exit 1
fi

TOTAL=$(echo "$RECORDS" | wc -l | tr -d ' ')
echo ""
echo "📥 开始恢复 $TOTAL 条记录..."

SUCCESS=0
FAIL=0

while IFS=$'\t' read -r COLL DATA; do
  [ -z "$COLL" ] && continue

  # 先查询是否已存在
  EXISTING=$(curl -s -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    "${SUPABASE_URL}/rest/v1/room_data?room_id=eq.${ROOM_ID}&collection=eq.${COLL}&select=id")

  if [ "$EXISTING" = "[]" ]; then
    # 插入新记录
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST \
      -H "apikey: $SUPABASE_ANON_KEY" \
      -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"room_id\":\"${ROOM_ID}\",\"collection\":\"${COLL}\",\"data\":${DATA}}" \
      "${SUPABASE_URL}/rest/v1/room_data")
  else
    # 更新已有记录
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X PATCH \
      -H "apikey: $SUPABASE_ANON_KEY" \
      -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"data\":${DATA}}" \
      "${SUPABASE_URL}/rest/v1/room_data?room_id=eq.${ROOM_ID}&collection=eq.${COLL}")
  fi

  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo "   ✅ $COLL"
    ((SUCCESS++))
  else
    echo "   ❌ $COLL (HTTP $HTTP_CODE)"
    ((FAIL++))
  fi
done <<< "$RECORDS"

echo ""
echo "✅ 恢复完成！成功: $SUCCESS, 失败: $FAIL"
