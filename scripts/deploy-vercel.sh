#!/bin/bash

# Vercel Deployment Script
# This script handles the deployment to Vercel (staging and production)

set -e

echo "🚀 Starting Vercel Deployment Process"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI is not installed${NC}"
    echo "Please install it with: npm install -g vercel"
    exit 1
fi

echo -e "${GREEN}✅ Vercel CLI found${NC}"

# Function to check environment variables
check_env_vars() {
    local ENV_TYPE=$1
    echo ""
    echo "📋 Checking $ENV_TYPE environment variables..."

    MISSING_VARS=()

    # Required environment variables
    REQUIRED_VARS=(
        "OPENAI_API_KEY"
        "WEAVIATE_HOST"
        "WEAVIATE_API_KEY"
        "GITHUB_TOKEN"
        "GITHUB_WEBHOOK_SECRET"
        "MEM0_API_KEY"
        "FIRECRAWL_API_KEY"
        "UPSTASH_REDIS_URL"
        "UPSTASH_REDIS_TOKEN"
    )

    # Check if .env.local exists for reference
    if [ -f ".env.local" ]; then
        echo -e "${GREEN}✅ Found .env.local file${NC}"

        for VAR in "${REQUIRED_VARS[@]}"; do
            if ! grep -q "^$VAR=" .env.local; then
                MISSING_VARS+=($VAR)
            fi
        done

        if [ ${#MISSING_VARS[@]} -gt 0 ]; then
            echo -e "${YELLOW}⚠️  Missing variables in .env.local:${NC}"
            for VAR in "${MISSING_VARS[@]}"; do
                echo "   - $VAR"
            done
            echo ""
            echo "Please add these to your .env.local file before deployment"
            return 1
        else
            echo -e "${GREEN}✅ All required environment variables found${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  No .env.local file found${NC}"
        echo "Please create .env.local with required environment variables"
        echo "You can copy from .env.example: cp .env.example .env.local"
        return 1
    fi
}

# Function to run tests
run_tests() {
    echo ""
    echo "🧪 Running tests..."
    npm run test:ci

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ All tests passed${NC}"
    else
        echo -e "${RED}❌ Tests failed. Please fix before deploying${NC}"
        exit 1
    fi
}

# Function to build the project
build_project() {
    echo ""
    echo "🏗️  Building project..."
    npm run build

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Build successful${NC}"
    else
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    fi
}

# Main deployment flow
echo ""
echo "Which environment do you want to deploy to?"
echo "1) Staging (preview)"
echo "2) Production"
read -p "Enter choice [1-2]: " DEPLOY_CHOICE

case $DEPLOY_CHOICE in
    1)
        echo ""
        echo "📦 Deploying to STAGING..."

        # Check environment variables
        if ! check_env_vars "STAGING"; then
            exit 1
        fi

        # Run tests
        run_tests

        # Deploy to staging
        echo ""
        echo "🚀 Deploying to Vercel staging..."
        vercel --build-env NODE_ENV=production

        echo ""
        echo -e "${GREEN}✅ Staging deployment complete!${NC}"
        echo "Visit your staging URL to test the deployment"
        ;;

    2)
        echo ""
        echo "📦 Deploying to PRODUCTION..."
        echo -e "${YELLOW}⚠️  WARNING: This will deploy to production!${NC}"
        read -p "Are you sure? (yes/no): " CONFIRM

        if [ "$CONFIRM" != "yes" ]; then
            echo "Deployment cancelled"
            exit 0
        fi

        # Check environment variables
        if ! check_env_vars "PRODUCTION"; then
            exit 1
        fi

        # Run tests
        run_tests

        # Build project
        build_project

        # Deploy to production
        echo ""
        echo "🚀 Deploying to Vercel production..."
        vercel --prod --build-env NODE_ENV=production

        echo ""
        echo -e "${GREEN}✅ Production deployment complete!${NC}"
        echo "Your app is now live!"
        ;;

    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "======================================"
echo "📝 Post-Deployment Checklist:"
echo "  ✓ Check the deployed URL"
echo "  ✓ Test core functionality"
echo "  ✓ Monitor error tracking (Sentry)"
echo "  ✓ Check performance metrics"
echo "  ✓ Update documentation with production URL"
echo "======================================"