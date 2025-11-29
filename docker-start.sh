#!/bin/bash

# AI Agent Platform - Docker Start Script
# Usage: ./docker-start.sh [dev|prod|full]

set -e

MODE=${1:-dev}
ENV_FILE=".env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting AI Agent Platform in ${MODE} mode${NC}"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}📝 Please edit .env file with your configuration and run again.${NC}"
    exit 1
fi

case $MODE in
    dev)
        echo -e "${GREEN}📦 Starting development environment (postgres + redis only)${NC}"
        docker-compose up -d postgres redis
        echo -e "${GREEN}✅ Database services started${NC}"
        echo ""
        echo "Run backend: cd backend && npm run dev"
        echo "Run frontend: npm run dev"
        ;;

    prod)
        echo -e "${GREEN}📦 Starting production environment (separate containers)${NC}"
        docker-compose up -d postgres redis backend frontend
        echo -e "${GREEN}✅ Production services started${NC}"
        echo ""
        echo "Frontend: http://localhost:3000"
        echo "Backend API: http://localhost:3001"
        ;;

    full)
        echo -e "${GREEN}📦 Starting full application (all-in-one container)${NC}"
        docker-compose --profile full up -d postgres redis app
        echo -e "${GREEN}✅ Full application started${NC}"
        echo ""
        echo "Application: http://localhost:3001"
        ;;

    stop)
        echo -e "${YELLOW}🛑 Stopping all services${NC}"
        docker-compose down
        echo -e "${GREEN}✅ All services stopped${NC}"
        ;;

    logs)
        docker-compose logs -f
        ;;

    *)
        echo "Usage: $0 [dev|prod|full|stop|logs]"
        echo ""
        echo "  dev   - Start only database services (for local development)"
        echo "  prod  - Start all services in separate containers"
        echo "  full  - Start all-in-one container"
        echo "  stop  - Stop all services"
        echo "  logs  - Follow logs from all services"
        exit 1
        ;;
esac
