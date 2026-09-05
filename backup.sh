#!/bin/bash
# Supabase 数据备份脚本
# 用法: bash backup.sh
# 会在 backups/ 目录下生成带时间戳的备份文件

set -e

# 从 .env 读取配置
if [ ! -f .env ]; then
  echo "❌ .env 文件不存在"
  exit 1
fi

SUPABASE_URL=$(grep 'VITE_SUPABASE_URL' .env | cut -d= -f2)
SUPABASE_ANON_KEY=$(grep 'VITE_SUPABASE_ANON_KEY' .env | cut -d= -f2)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "❌ 无法从 .env 读取 Supabase 配置"
  exit 1
fi

# 去除可能的引号
SUPABASE_URL=$(echo "$SUPABASE_URL" | tr -d '"')
SUPABASE_ANON_KEY=$(echo "$SUPABASE_ANON_KEY" | tr -d '"')

ROOM_ID="llyyds"
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="${BACKUP_DIR}/supabase_backup_${TIMESTAMP}.json"

mkdir -p "$BACKUP_DIR"

echo "📦 开始备份 Supabase 数据..."
echo "   项目: $SUPABASE_URL"
echo "   房间: $ROOM_ID"
echo "   输出: $OUTPUT_FILE"
echo ""

# 获取所有 room_data 记录（room_id = llyyds）
echo "⏳ 正在下载数据..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  "${SUPABASE_URL}/rest/v1/room_data?room_id=eq.${ROOM_ID}&select=collection,data,updated_at")

# 分离响应体和状态码
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ne 200 ]; then
  echo "❌ 请求失败，HTTP 状态码: $HTTP_CODE"
  echo "   响应: $BODY"
  echo ""
  echo "可能原因：项目已暂停，请先去 https://supabase.com/dashboard 恢复项目"
  exit 1
fi

# 检查是否为空数组
if [ "$BODY" = "[]" ]; then
  echo "⚠️  未找到任何数据，room_data 表为空"
  exit 1
fi

# 保存到文件（美化 JSON）
echo "$BODY" | python3 -m json.tool > "$OUTPUT_FILE" 2>/dev/null || echo "$BODY" > "$OUTPUT_FILE"

# 统计信息
COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
SIZE=$(wc -c < "$OUTPUT_FILE" | tr -d ' ')

echo ""
echo "✅ 备份完成！"
echo "   记录数: $COUNT 条"
echo "   文件大小: $((SIZE / 1024)) KB"
echo "   保存路径: $OUTPUT_FILE"

# 显示备份的集合列表
echo ""
echo "📋 已备份的集合:"
echo "$BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data:
    coll = item.get('collection', 'unknown')
    size = len(json.dumps(item.get('data', {})))
    print(f'   • {coll} ({size} bytes)')
" 2>/dev/null || true

echo ""
echo "💡 提示：请妥善保管 backups/ 目录，数据库出问题时可用于恢复"
