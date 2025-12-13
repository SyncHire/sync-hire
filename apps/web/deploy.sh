#!/bin/bash
set -e

# Firebase App Hosting Deployment Script for SyncHire Next.js Application
# App Hosting deploys automatically on GitHub push, but this script
# can trigger a manual rollout if needed.

echo "SyncHire - Firebase App Hosting"
echo "================================"
echo ""
echo "Firebase App Hosting deploys automatically when you push to GitHub."
echo ""
echo "Manual deployment options:"
echo ""
echo "1. Push to GitHub (recommended):"
echo "   git push origin main"
echo ""
echo "2. Trigger manual rollout:"
echo "   firebase apphosting:rollouts:create BACKEND_ID --git-branch main"
echo ""
echo "3. View backend status:"
echo "   firebase apphosting:backends:list"
echo ""
echo "4. View rollout history:"
echo "   firebase apphosting:rollouts:list BACKEND_ID"
echo ""

# Check if backend exists
if command -v firebase &> /dev/null; then
  echo "Checking App Hosting backends..."
  firebase apphosting:backends:list 2>/dev/null || echo "No backends found. Run: firebase apphosting:backends:create"
fi
