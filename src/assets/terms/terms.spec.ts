import * as fs from 'fs';
import * as path from 'path';

describe('Terms and Conditions Content Validation', () => {
  describe('Thai Terms (terms.th.md)', () => {
    let thaiTermsContent: string;

    beforeAll(() => {
      const termsPath = path.join(__dirname, 'terms.th.md');
      thaiTermsContent = fs.readFileSync(termsPath, 'utf-8');
    });

    it('should exist and be readable', () => {
      expect(thaiTermsContent).toBeDefined();
      expect(thaiTermsContent.length).toBeGreaterThan(0);
    });

    it('should not contain the typo "เก็บรักษายลิงก์" (BUG-017 regression check)', () => {
      const typoPattern = 'เก็บรักษายลิงก์';
      expect(thaiTermsContent).not.toContain(typoPattern);
    });

    it('should contain the correct text "เก็บรักษาลิงก์"', () => {
      const correctPattern = 'เก็บรักษาลิงก์';
      expect(thaiTermsContent).toContain(correctPattern);
    });

    it('should have section 3 with correct eligibility and access text', () => {
      const expectedText = 'คุณสามารถเข้าร่วมการปรึกษาได้เฉพาะเมื่อมีคำเชิญที่ถูกต้องจากผู้ให้บริการด้านสุขภาพ เก็บรักษาลิงก์คำเชิญเป็นความลับ';
      expect(thaiTermsContent).toContain(expectedText);
    });
  });
});
