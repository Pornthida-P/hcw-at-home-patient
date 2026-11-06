#!/usr/bin/env node
/**
 * BUG-017 Regression Check: Validate Thai Terms Content
 * 
 * This standalone script validates that terms.th.md does not contain
 * the typo "เก็บรักษายลิงก์" and has the correct "เก็บรักษาลิงก์".
 * 
 * Can be run independently of the Angular test suite.
 * Usage: node validate-thai-terms.js
 */

const fs = require('fs');
const path = require('path');

const TYPO_PATTERN = 'เก็บรักษายลิงก์';
const CORRECT_PATTERN = 'เก็บรักษาลิงก์';
const EXPECTED_TEXT = 'คุณสามารถเข้าร่วมการปรึกษาได้เฉพาะเมื่อมีคำเชิญที่ถูกต้องจากผู้ให้บริการด้านสุขภาพ เก็บรักษาลิงก์คำเชิญเป็นความลับ';

const termsPath = path.join(__dirname, 'terms.th.md');

try {
  const content = fs.readFileSync(termsPath, 'utf-8');
  
  console.log('🔍 BUG-017 Regression Check: Validating Thai Terms...\n');
  
  // Check 1: File should not be empty
  if (!content || content.length === 0) {
    console.error('❌ FAIL: terms.th.md is empty');
    process.exit(1);
  }
  console.log('✅ PASS: File exists and is readable');
  
  // Check 2: Should NOT contain the typo
  if (content.includes(TYPO_PATTERN)) {
    console.error(`❌ FAIL: File contains typo "${TYPO_PATTERN}"`);
    process.exit(1);
  }
  console.log(`✅ PASS: Typo "${TYPO_PATTERN}" not found`);
  
  // Check 3: Should contain the correct text
  if (!content.includes(CORRECT_PATTERN)) {
    console.error(`❌ FAIL: File does not contain correct text "${CORRECT_PATTERN}"`);
    process.exit(1);
  }
  console.log(`✅ PASS: Correct text "${CORRECT_PATTERN}" found`);
  
  // Check 4: Should contain the expected full sentence
  if (!content.includes(EXPECTED_TEXT)) {
    console.error(`❌ FAIL: File does not contain expected sentence`);
    process.exit(1);
  }
  console.log('✅ PASS: Expected sentence found in section 3');
  
  console.log('\n✅ All BUG-017 regression checks passed!');
  process.exit(0);
  
} catch (error) {
  console.error(`❌ ERROR: ${error.message}`);
  process.exit(1);
}
