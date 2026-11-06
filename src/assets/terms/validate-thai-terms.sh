#!/bin/bash
# BUG-017 Regression Check: Validate Thai Terms Content
# Simple shell script for CI/CD pipelines
# Usage: ./validate-thai-terms.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERMS_FILE="$SCRIPT_DIR/terms.th.md"

TYPO_PATTERN="เก็บรักษายลิงก์"
CORRECT_PATTERN="เก็บรักษาลิงก์"

echo "🔍 BUG-017 Regression Check: Validating Thai Terms..."
echo

# Check 1: File exists
if [ ! -f "$TERMS_FILE" ]; then
  echo "❌ FAIL: terms.th.md not found"
  exit 1
fi
echo "✅ PASS: File exists"

# Check 2: Should NOT contain the typo
if grep -q "$TYPO_PATTERN" "$TERMS_FILE"; then
  echo "❌ FAIL: File contains typo \"$TYPO_PATTERN\""
  exit 1
fi
echo "✅ PASS: Typo \"$TYPO_PATTERN\" not found"

# Check 3: Should contain the correct text
if ! grep -q "$CORRECT_PATTERN" "$TERMS_FILE"; then
  echo "❌ FAIL: File does not contain correct text \"$CORRECT_PATTERN\""
  exit 1
fi
echo "✅ PASS: Correct text \"$CORRECT_PATTERN\" found"

echo
echo "✅ All BUG-017 regression checks passed!"
exit 0
