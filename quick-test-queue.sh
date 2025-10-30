#!/bin/bash

# Quick test script for queue system after Docker starts

echo "🚀 Quick Queue System Test"
echo "=========================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd /Users/evgenijsikunov/projects/beton-crm/beton-crm

# 1. Start services
echo -e "\n${YELLOW}1. Starting services...${NC}"
./scripts/start.sh

# Wait for services
echo "Waiting 30 seconds for services to stabilize..."
sleep 30

# 2. Run migration
echo -e "\n${YELLOW}2. Running migration for scheduled_submissions table...${NC}"
docker compose exec backend npm run migration:run

# 3. Check worker logs
echo -e "\n${YELLOW}3. Checking if worker and scheduler started...${NC}"
docker compose logs backend --tail=100 | grep -E "Воркер очереди заявок запущен|Планировщик запланированных заявок запущен" || echo "Worker/Scheduler may not have started"

# 4. Quick API test
echo -e "\n${YELLOW}4. Creating test periodic submissions...${NC}"

# Get auth token
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "crm@betonexpress.pro",
    "password": "admin123"
  }' | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Failed to get auth token${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Got auth token${NC}"

# Create test periodic submissions
TODAY=$(date +%Y-%m-%d)
TOMORROW=$(date -v+1d +%Y-%m-%d 2>/dev/null || date -d "+1 day" +%Y-%m-%d)

echo "Creating 2-day test period..."
RESPONSE=$(curl -s -X POST http://localhost:5001/api/submissions/period \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"formId\": \"00000000-0000-0000-0000-000000000001\",
    \"formData\": {
      \"field_1750311865385\": \"$TODAY\",
      \"field_1750311865386\": \"10:00\",
      \"field_1750311865387\": \"Test Company\",
      \"field_1750311865388\": \"50\",
      \"field_1750311865389\": \"Test Address\"
    },
    \"periodConfig\": {
      \"startDate\": \"$TODAY\",
      \"endDate\": \"$TOMORROW\",
      \"dateFieldName\": \"field_1750311865385\",
      \"time\": \"10:00\",
      \"timeFieldName\": \"field_1750311865386\"
    },
    \"assignedToId\": \"00000000-0000-0000-0000-000000000001\",
    \"priority\": \"high\"
  }")

echo "Response:"
echo $RESPONSE | python3 -m json.tool 2>/dev/null || echo $RESPONSE

# 5. Check queue status
echo -e "\n${YELLOW}5. Checking Redis queue...${NC}"
docker compose exec backend redis-cli -p 6396 LLEN bull:submission-queue:wait

# 6. Check database
echo -e "\n${YELLOW}6. Checking scheduled submissions in database...${NC}"
docker compose exec postgres psql -U postgres -d beton_crm -c "SELECT COUNT(*) as total, status FROM scheduled_submissions GROUP BY status;"

# 7. Monitor logs
echo -e "\n${YELLOW}7. Recent queue activity logs...${NC}"
docker compose logs backend --tail=30 | grep -E "QUEUE|SCHEDULER|PERIOD_SERVICE|Задача"

echo -e "\n${GREEN}✅ Test complete!${NC}"
echo -e "\nUseful commands:"
echo "  - Monitor queue: docker compose logs backend -f | grep QUEUE"
echo "  - Check scheduled: docker compose exec postgres psql -U postgres -d beton_crm -c 'SELECT * FROM scheduled_submissions;'"
echo "  - Redis queue size: docker compose exec backend redis-cli -p 6396 LLEN bull:submission-queue:wait"