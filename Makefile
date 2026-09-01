# ==============================================================================
# reactjs-express-scaffold Monorepo Makefile
# ==============================================================================
# Orchestration commands for the reactjs-express-scaffold monorepo.
# This Makefile wraps npm scripts from apps/web and apps/server — each app
# manages its own dependencies and lockfile independently; this file never
# touches a root package.json/node_modules.
#
# Usage:
#   make help     - Show all available commands
#   make install  - Install dependencies for all apps
#   make dev      - Start both web and server in development mode
#   make build    - Build both apps for production
#
# ==============================================================================

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

# App directories (relative to this Makefile at project root)
WEB_DIR := apps/web
SERVER_DIR := apps/server

# Colors for terminal output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m
BOLD := \033[1m

# Default target
.DEFAULT_GOAL := help

# Declare all phony targets (commands, not files)
.PHONY: help install install-web install-server \
        dev dev-web dev-server \
        build build-web build-server \
        start start-web start-server start-all \
        lint lint-web lint-server format format-web format-server \
        clean clean-web clean-server \
        check status

# ------------------------------------------------------------------------------
# Help
# ------------------------------------------------------------------------------

##@ General

help: ## Show this help message
	@echo ""
	@echo "$(BOLD)reactjs-express-scaffold Monorepo$(RESET)"
	@echo "$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf ""} \
		/^[a-zA-Z_-]+:.*?##/ { printf "  $(CYAN)%-18s$(RESET) %s\n", $$1, $$2 } \
		/^##@/ { printf "\n$(BOLD)%s$(RESET)\n", substr($$0, 5) }' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(YELLOW)Examples:$(RESET)"
	@echo "  make install    # Install all dependencies"
	@echo "  make dev        # Start both web and server"
	@echo "  make dev-web    # Start only the web frontend"
	@echo "  make build      # Build both apps"
	@echo ""

# ------------------------------------------------------------------------------
# Installation
# ------------------------------------------------------------------------------

##@ Installation

install: install-web install-server ## Install dependencies for all apps
	@echo "$(GREEN)✓ All dependencies installed$(RESET)"

install-web: ## Install web app dependencies
	@echo "$(CYAN)Installing web dependencies...$(RESET)"
	@cd $(WEB_DIR) && npm install
	@echo "$(GREEN)✓ Web dependencies installed$(RESET)"

install-server: ## Install server app dependencies
	@echo "$(CYAN)Installing server dependencies...$(RESET)"
	@cd $(SERVER_DIR) && npm install
	@echo "$(GREEN)✓ Server dependencies installed$(RESET)"

# ------------------------------------------------------------------------------
# Development
# ------------------------------------------------------------------------------

##@ Development

dev: ## Start both web and server in development mode (concurrent)
	@echo "$(CYAN)Starting development servers...$(RESET)"
	@echo "$(YELLOW)Web:$(RESET)    http://localhost:5173"
	@echo "$(YELLOW)Server:$(RESET) http://localhost:3000"
	@echo "$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@cd $(SERVER_DIR) && npm run dev & \
	 cd $(WEB_DIR) && npm run dev & \
	 wait

dev-web: ## Start only the web frontend (development)
	@echo "$(CYAN)Starting web development server...$(RESET)"
	@cd $(WEB_DIR) && npm run dev

dev-server: ## Start only the server backend (development)
	@echo "$(CYAN)Starting server development...$(RESET)"
	@cd $(SERVER_DIR) && npm run dev

# ------------------------------------------------------------------------------
# Build
# ------------------------------------------------------------------------------

##@ Build

build: build-server build-web ## Build both apps for production
	@echo "$(GREEN)✓ All apps built$(RESET)"

build-web: ## Build web app for production
	@echo "$(CYAN)Building web app...$(RESET)"
	@cd $(WEB_DIR) && npm run build
	@echo "$(GREEN)✓ Web app built$(RESET)"

build-server: ## Build server app for production
	@echo "$(CYAN)Building server app...$(RESET)"
	@cd $(SERVER_DIR) && npm run build
	@echo "$(GREEN)✓ Server app built$(RESET)"

# ------------------------------------------------------------------------------
# Production
# ------------------------------------------------------------------------------

##@ Production

start: start-server ## Alias for start-server (requires build first)

start-web: ## Start web app in production mode (requires build first)
	@echo "$(CYAN)Starting production web server...$(RESET)"
	@cd $(WEB_DIR) && npm run start

start-server: ## Start server app in production mode (requires build first)
	@echo "$(CYAN)Starting production server...$(RESET)"
	@cd $(SERVER_DIR) && npm run start

start-all: ## Start both web and server in production mode (concurrent)
	@echo "$(CYAN)Starting production servers...$(RESET)"
	@cd $(SERVER_DIR) && npm run start & \
	 cd $(WEB_DIR) && npm run start & \
	 wait

# ------------------------------------------------------------------------------
# Code Quality
# ------------------------------------------------------------------------------

##@ Code Quality

lint: lint-web lint-server ## Run linting on all apps
	@echo "$(GREEN)✓ All linting complete$(RESET)"

lint-web: ## Run ESLint on web app
	@echo "$(CYAN)Linting web app...$(RESET)"
	@cd $(WEB_DIR) && npm run lint

lint-server: ## Run ESLint on server app
	@echo "$(CYAN)Linting server app...$(RESET)"
	@cd $(SERVER_DIR) && npm run lint

format: format-web format-server ## Format code in all apps with Prettier
	@echo "$(GREEN)✓ All apps formatted$(RESET)"

format-web: ## Format web code with Prettier
	@echo "$(CYAN)Formatting web code...$(RESET)"
	@cd $(WEB_DIR) && npm run format
	@echo "$(GREEN)✓ Web code formatted$(RESET)"

format-server: ## Format server code with Prettier
	@echo "$(CYAN)Formatting server code...$(RESET)"
	@cd $(SERVER_DIR) && npm run format
	@echo "$(GREEN)✓ Server code formatted$(RESET)"

# ------------------------------------------------------------------------------
# Maintenance
# ------------------------------------------------------------------------------

##@ Maintenance

clean: clean-web clean-server ## Clean all build artifacts and dependencies
	@echo "$(GREEN)✓ All apps cleaned$(RESET)"

clean-web: ## Clean web build artifacts and node_modules
	@echo "$(CYAN)Cleaning web app...$(RESET)"
	@rm -rf $(WEB_DIR)/dist
	@rm -rf $(WEB_DIR)/node_modules
	@echo "$(GREEN)✓ Web app cleaned$(RESET)"

clean-server: ## Clean server build artifacts and node_modules
	@echo "$(CYAN)Cleaning server app...$(RESET)"
	@rm -rf $(SERVER_DIR)/dist
	@rm -rf $(SERVER_DIR)/node_modules
	@echo "$(GREEN)✓ Server app cleaned$(RESET)"

# ------------------------------------------------------------------------------
# Diagnostics
# ------------------------------------------------------------------------------

##@ Diagnostics

check: ## Check if required tools are installed
	@echo "$(CYAN)Checking required tools...$(RESET)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)✗ Node.js is not installed$(RESET)"; exit 1; }
	@echo "$(GREEN)✓ Node.js:$(RESET) $$(node --version)"
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)✗ npm is not installed$(RESET)"; exit 1; }
	@echo "$(GREEN)✓ npm:$(RESET)     $$(npm --version)"
	@echo "$(GREEN)✓ All required tools are installed$(RESET)"

status: ## Show project status (installed packages, etc.)
	@echo "$(BOLD)Project Status$(RESET)"
	@echo "$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo ""
	@echo "$(YELLOW)Web App:$(RESET)"
	@if [ -d "$(WEB_DIR)/node_modules" ]; then \
		echo "  Dependencies: $(GREEN)installed$(RESET)"; \
	else \
		echo "  Dependencies: $(RED)not installed$(RESET)"; \
	fi
	@if [ -d "$(WEB_DIR)/dist" ]; then \
		echo "  Build:        $(GREEN)exists$(RESET)"; \
	else \
		echo "  Build:        $(YELLOW)not built$(RESET)"; \
	fi
	@echo ""
	@echo "$(YELLOW)Server App:$(RESET)"
	@if [ -d "$(SERVER_DIR)/node_modules" ]; then \
		echo "  Dependencies: $(GREEN)installed$(RESET)"; \
	else \
		echo "  Dependencies: $(RED)not installed$(RESET)"; \
	fi
	@if [ -d "$(SERVER_DIR)/dist" ]; then \
		echo "  Build:        $(GREEN)exists$(RESET)"; \
	else \
		echo "  Build:        $(YELLOW)not built$(RESET)"; \
	fi
	@echo ""