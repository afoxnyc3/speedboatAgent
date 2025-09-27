#!/bin/bash

# Emergency Rollback Script for Demo Day
# This script provides quick rollback capabilities during demo emergencies

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/.demo-backups"
LOG_FILE="$PROJECT_ROOT/emergency-rollback.log"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

log() {
    local message="$1"
    local color="${2:-$NC}"
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] $message${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    log "❌ ERROR: $1" "$RED"
}

log_success() {
    log "✅ SUCCESS: $1" "$GREEN"
}

log_warning() {
    log "⚠️  WARNING: $1" "$YELLOW"
}

log_info() {
    log "ℹ️  INFO: $1" "$BLUE"
}

# Function to check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository"
        exit 1
    fi
}

# Function to backup current state
backup_current_state() {
    local backup_name="emergency-backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"

    log_info "Creating backup of current state..."

    # Create backup directory
    mkdir -p "$backup_path"

    # Save current git info
    git log --oneline -5 > "$backup_path/current-commits.txt"
    git status --porcelain > "$backup_path/git-status.txt"
    git branch -a > "$backup_path/branches.txt"

    # Save current environment variables (if .env.local exists)
    if [ -f "$PROJECT_ROOT/.env.local" ]; then
        cp "$PROJECT_ROOT/.env.local" "$backup_path/env.local.backup"
    fi

    # Save current package.json
    cp "$PROJECT_ROOT/package.json" "$backup_path/package.json.backup"

    # Save vercel deployment info
    if command -v vercel >/dev/null 2>&1; then
        vercel deployments list --limit 5 > "$backup_path/vercel-deployments.txt" 2>/dev/null || true
    fi

    echo "$backup_name" > "$BACKUP_DIR/latest-backup.txt"

    log_success "Backup created at: $backup_path"
    return 0
}

# Function to rollback to previous git commit
rollback_git() {
    local commits_back="${1:-1}"

    log_info "Rolling back $commits_back commit(s)..."

    # Create emergency branch first
    local emergency_branch="emergency-rollback-$(date +%s)"
    git checkout -b "$emergency_branch"

    # Reset to previous commit
    git reset --hard "HEAD~$commits_back"

    log_success "Rolled back $commits_back commit(s) on branch: $emergency_branch"

    # Show current commit
    log_info "Current commit: $(git log --oneline -1)"
}

# Function to rollback Vercel deployment
rollback_vercel() {
    if ! command -v vercel >/dev/null 2>&1; then
        log_error "Vercel CLI not found. Install with: npm i -g vercel"
        return 1
    fi

    log_info "Fetching recent Vercel deployments..."

    # Get recent deployments
    local deployments=$(vercel deployments list --limit 10 --format json 2>/dev/null)

    if [ -z "$deployments" ]; then
        log_error "Could not fetch Vercel deployments"
        return 1
    fi

    # Show recent deployments
    echo -e "\n${CYAN}Recent deployments:${NC}"
    vercel deployments list --limit 5

    echo -e "\n${YELLOW}Enter the deployment URL to rollback to (or press Enter to cancel):${NC}"
    read -r deployment_url

    if [ -z "$deployment_url" ]; then
        log_warning "Rollback cancelled"
        return 0
    fi

    log_info "Rolling back to: $deployment_url"

    if vercel rollback "$deployment_url"; then
        log_success "Vercel rollback completed successfully"

        # Wait a moment and verify
        sleep 5
        log_info "Verifying rollback..."
        local current_deployment=$(vercel deployments list --limit 1 --format json 2>/dev/null)
        log_info "Current deployment should now be: $deployment_url"
    else
        log_error "Vercel rollback failed"
        return 1
    fi
}

# Function to restore previous environment configuration
rollback_environment() {
    local backup_name="$1"

    if [ -z "$backup_name" ]; then
        # Use latest backup
        if [ -f "$BACKUP_DIR/latest-backup.txt" ]; then
            backup_name=$(cat "$BACKUP_DIR/latest-backup.txt")
        else
            log_error "No backup specified and no latest backup found"
            return 1
        fi
    fi

    local backup_path="$BACKUP_DIR/$backup_name"

    if [ ! -d "$backup_path" ]; then
        log_error "Backup not found: $backup_path"
        return 1
    fi

    log_info "Restoring environment from backup: $backup_name"

    # Restore .env.local if it exists in backup
    if [ -f "$backup_path/env.local.backup" ]; then
        cp "$backup_path/env.local.backup" "$PROJECT_ROOT/.env.local"
        log_success "Environment variables restored"
    fi

    # Restore package.json if it exists in backup
    if [ -f "$backup_path/package.json.backup" ]; then
        cp "$backup_path/package.json.backup" "$PROJECT_ROOT/package.json"
        log_success "package.json restored"
    fi
}

# Function to deploy emergency fix
deploy_emergency_fix() {
    log_info "Deploying emergency fix..."

    # Build and deploy
    if npm run build; then
        log_success "Build completed successfully"

        if vercel --prod; then
            log_success "Emergency deployment completed"
        else
            log_error "Emergency deployment failed"
            return 1
        fi
    else
        log_error "Build failed"
        return 1
    fi
}

# Function to clear all caches
clear_caches() {
    log_info "Clearing all caches..."

    # Clear Redis cache if possible
    if [ -n "$UPSTASH_REDIS_URL" ]; then
        if command -v redis-cli >/dev/null 2>&1; then
            redis-cli -u "$UPSTASH_REDIS_URL" flushall && log_success "Redis cache cleared"
        fi
    fi

    # Clear Next.js build cache
    rm -rf "$PROJECT_ROOT/.next" && log_success "Next.js cache cleared"

    # Clear node_modules and reinstall (aggressive cache clear)
    echo -e "\n${YELLOW}Perform aggressive cache clear (remove node_modules)? [y/N]:${NC}"
    read -r aggressive_clear

    if [[ "$aggressive_clear" =~ ^[Yy]$ ]]; then
        rm -rf "$PROJECT_ROOT/node_modules"
        npm install
        log_success "Node modules reinstalled"
    fi
}

# Function to run health checks
health_check() {
    log_info "Running health checks..."

    # Check if app is responding
    local app_url="${VERCEL_URL:-http://localhost:3000}"

    if curl -f "$app_url/api/health" -m 10 >/dev/null 2>&1; then
        log_success "Application health check passed"
    else
        log_warning "Application health check failed"
    fi

    # Check Weaviate if configured
    if [ -n "$WEAVIATE_HOST" ]; then
        if curl -f "$WEAVIATE_HOST/v1/.well-known/ready" -m 10 >/dev/null 2>&1; then
            log_success "Weaviate health check passed"
        else
            log_warning "Weaviate health check failed"
        fi
    fi

    # Check Redis if configured
    if [ -n "$UPSTASH_REDIS_URL" ] && command -v redis-cli >/dev/null 2>&1; then
        if redis-cli -u "$UPSTASH_REDIS_URL" ping >/dev/null 2>&1; then
            log_success "Redis health check passed"
        else
            log_warning "Redis health check failed"
        fi
    fi
}

# Function to show system status
show_status() {
    echo -e "\n${MAGENTA}=== SYSTEM STATUS ===${NC}"

    # Git status
    echo -e "\n${CYAN}Git Status:${NC}"
    git status --short
    echo "Current branch: $(git branch --show-current)"
    echo "Current commit: $(git log --oneline -1)"

    # Vercel status
    if command -v vercel >/dev/null 2>&1; then
        echo -e "\n${CYAN}Vercel Status:${NC}"
        vercel deployments list --limit 3
    fi

    # Recent backups
    echo -e "\n${CYAN}Available Backups:${NC}"
    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR" | grep "emergency-backup"
    else
        echo "No backups found"
    fi

    # Health checks
    echo -e "\n${CYAN}Health Checks:${NC}"
    health_check
}

# Function to show help
show_help() {
    echo -e "\n${MAGENTA}Emergency Rollback Script${NC}"
    echo -e "Usage: $0 [COMMAND]"
    echo -e "\nCommands:"
    echo -e "  ${GREEN}backup${NC}              Create backup of current state"
    echo -e "  ${GREEN}rollback-git [N]${NC}    Rollback N commits (default: 1)"
    echo -e "  ${GREEN}rollback-vercel${NC}     Rollback Vercel deployment"
    echo -e "  ${GREEN}rollback-env [NAME]${NC} Restore environment from backup"
    echo -e "  ${GREEN}deploy${NC}              Deploy emergency fix"
    echo -e "  ${GREEN}clear-cache${NC}         Clear all caches"
    echo -e "  ${GREEN}health${NC}              Run health checks"
    echo -e "  ${GREEN}status${NC}              Show system status"
    echo -e "  ${GREEN}full-rollback${NC}       Complete rollback (git + vercel + env)"
    echo -e "  ${GREEN}help${NC}                Show this help message"
    echo -e "\nExamples:"
    echo -e "  $0 backup                    # Create backup before changes"
    echo -e "  $0 rollback-git 2            # Rollback 2 commits"
    echo -e "  $0 full-rollback             # Complete emergency rollback"
    echo -e "  $0 clear-cache && $0 deploy  # Clear cache and redeploy"
}

# Main script logic
main() {
    local command="${1:-help}"

    # Initialize log
    log_info "Emergency rollback script started" "$MAGENTA"
    log_info "Command: $command"
    log_info "Working directory: $PROJECT_ROOT"

    # Check prerequisites
    check_git_repo

    case "$command" in
        "backup")
            backup_current_state
            ;;
        "rollback-git")
            backup_current_state
            rollback_git "$2"
            ;;
        "rollback-vercel")
            rollback_vercel
            ;;
        "rollback-env")
            rollback_environment "$2"
            ;;
        "deploy")
            deploy_emergency_fix
            ;;
        "clear-cache")
            clear_caches
            ;;
        "health")
            health_check
            ;;
        "status")
            show_status
            ;;
        "full-rollback")
            log_info "Starting full emergency rollback..." "$MAGENTA"
            backup_current_state
            rollback_git 1
            rollback_vercel
            clear_caches
            deploy_emergency_fix
            health_check
            log_success "Full rollback completed!" "$GREEN"
            ;;
        "help"|*)
            show_help
            ;;
    esac

    log_info "Emergency rollback script completed"
}

# Run main function with all arguments
main "$@"