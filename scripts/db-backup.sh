#!/bin/bash

# 数据库备份和恢复脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 配置
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# 从 .env 读取数据库配置
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 解析 DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL 未配置${NC}"
    exit 1
fi

# 提取数据库信息
DB_URL=$DATABASE_URL
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo $DB_URL | sed -n 's/.*\/\/\([^:]*\).*/\1/p')

# 显示帮助
show_help() {
    echo "数据库备份和恢复工具"
    echo ""
    echo "用法:"
    echo "  $0 backup              - 备份数据库"
    echo "  $0 restore <file>      - 恢复数据库"
    echo "  $0 list                - 列出所有备份"
    echo "  $0 clean <days>        - 清理 N 天前的备份"
    echo ""
}

# 备份数据库
backup_database() {
    echo "🗄️  开始备份数据库..."
    
    # 创建备份目录
    mkdir -p $BACKUP_DIR
    
    # 备份文件名
    BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"
    
    # 执行备份
    echo "正在备份到: $BACKUP_FILE"
    pg_dump $DATABASE_URL > $BACKUP_FILE
    
    # 压缩备份
    gzip $BACKUP_FILE
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    # 显示备份信息
    BACKUP_SIZE=$(du -h $BACKUP_FILE | cut -f1)
    echo -e "${GREEN}✅ 备份完成${NC}"
    echo "文件: $BACKUP_FILE"
    echo "大小: $BACKUP_SIZE"
    echo ""
    
    # 显示备份内容统计
    echo "📊 备份统计:"
    gunzip -c $BACKUP_FILE | grep -E "^COPY" | awk '{print "  - " $2 ": " $NF " 条记录"}'
}

# 恢复数据库
restore_database() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        echo -e "${RED}❌ 请指定备份文件${NC}"
        echo "用法: $0 restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}❌ 备份文件不存在: $backup_file${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}⚠️  警告: 此操作将覆盖当前数据库！${NC}"
    read -p "确定要恢复数据库吗？(yes/no) " -r
    echo
    
    if [[ ! $REPLY =~ ^yes$ ]]; then
        echo "已取消"
        exit 0
    fi
    
    echo "🔄 开始恢复数据库..."
    
    # 解压并恢复
    if [[ $backup_file == *.gz ]]; then
        gunzip -c $backup_file | psql $DATABASE_URL
    else
        psql $DATABASE_URL < $backup_file
    fi
    
    echo -e "${GREEN}✅ 数据库恢复完成${NC}"
}

# 列出所有备份
list_backups() {
    echo "📋 备份列表:"
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR)" ]; then
        echo "  (无备份文件)"
        return
    fi
    
    ls -lh $BACKUP_DIR/*.sql.gz 2>/dev/null | awk '{
        size = $5
        file = $9
        gsub(/.*\//, "", file)
        printf "  %s  %s\n", size, file
    }' | sort -r
    
    echo ""
    echo "总计: $(ls $BACKUP_DIR/*.sql.gz 2>/dev/null | wc -l) 个备份"
}

# 清理旧备份
clean_backups() {
    local days=$1
    
    if [ -z "$days" ]; then
        echo -e "${RED}❌ 请指定天数${NC}"
        echo "用法: $0 clean <days>"
        exit 1
    fi
    
    echo "🧹 清理 $days 天前的备份..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "  (无备份目录)"
        return
    fi
    
    # 查找并删除旧备份
    find $BACKUP_DIR -name "*.sql.gz" -mtime +$days -delete
    
    echo -e "${GREEN}✅ 清理完成${NC}"
    list_backups
}

# 主逻辑
case "$1" in
    backup)
        backup_database
        ;;
    restore)
        restore_database "$2"
        ;;
    list)
        list_backups
        ;;
    clean)
        clean_backups "$2"
        ;;
    *)
        show_help
        exit 1
        ;;
esac
