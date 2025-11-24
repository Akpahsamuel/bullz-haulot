#!/bin/bash

# Bullz Bid Matching Automation Setup Script

echo "🚀 Setting up Bullz Bid Matching Automation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 Creating .env file...${NC}"
    cat > .env << EOF
# Private key for automated bid matching service
MATCH_SIGNER_PRIVATE_KEY=your_private_key_here

# Network configuration
NETWORK=devnet

# Automation settings
MATCH_CHECK_INTERVAL=5000
MATCH_COMPLETION_CHECK_INTERVAL=1000
EOF
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${BLUE}ℹ️  .env file already exists${NC}"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ is required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Check if tsx is available
if ! command -v npx tsx &> /dev/null; then
    echo -e "${YELLOW}📦 Installing tsx globally...${NC}"
    npm install -g tsx
fi

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Display next steps
echo -e "\n${BLUE}🔧 Next Steps:${NC}"
echo -e "1. ${YELLOW}Update your .env file with your private key${NC}"
echo -e "2. ${YELLOW}Create a Match Signer Capability using the admin cap${NC}"
echo -e "3. ${YELLOW}Run 'npm run automation' to start the service${NC}"
echo -e "\n${BLUE}💡 The system will automatically find your Match Signer Capability in your wallet${NC}"

echo -e "\n${BLUE}📋 Create Match Signer Capability Command:${NC}"
echo -e "${GREEN}sui client call \\${NC}"
echo -e "${GREEN}  --package 0x9d099100b7b1426060eb648867bf853da2ea3fc5332c1f38647324e96dd36e65 \\${NC}"
echo -e "${GREEN}  --module match_signer \\${NC}"
echo -e "${GREEN}  --function create_match_signer \\${NC}"
echo -e "${GREEN}  --args \\${NC}"
echo -e "${GREEN}    0xb8d34d2ba99d4bf5c0288ddcb6ab77b71ad692a7abf8d91ea8de77e55b80e887 \\${NC}"
echo -e "${GREEN}    0x62c5482ccb14f9fd70969dd1d2e093ffafb26f357679af7be733ed4af89be41c \\${NC}"
echo -e "${GREEN}    [YOUR_AUTOMATION_SERVICE_ADDRESS] \\${NC}"
echo -e "${GREEN}    0x6 \\${NC}"
echo -e "${GREEN}  --gas-budget 100000000${NC}"

echo -e "\n${BLUE}📖 For detailed instructions, see: BID_MATCHING_AUTOMATION_README.md${NC}"
echo -e "${GREEN}🎉 Setup complete!${NC}" 