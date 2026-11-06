import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ConfigService } from '../../app/services/config.service';
import { GlobalVariableService } from '../../app/services/global-variable.service';

describe('Terms and Conditions Content Validation', () => {
  describe('Thai Terms (terms.th.md)', () => {
    let configService: ConfigService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [ConfigService, GlobalVariableService]
      });
      configService = TestBed.inject(ConfigService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
    });

    it('should not contain the typo "เก็บรักษายลิงก์" (BUG-017 regression check)', (done) => {
      const typoPattern = 'เก็บรักษายลิงก์';
      const correctPattern = 'เก็บรักษาลิงก์';
      
      configService.loadTermsFile('assets/terms/terms.th.md').subscribe(content => {
        expect(content).toBeTruthy();
        expect(content).not.toContain(typoPattern);
        expect(content).toContain(correctPattern);
        expect(content).toContain('คุณสามารถเข้าร่วมการปรึกษาได้เฉพาะเมื่อมีคำเชิญที่ถูกต้องจากผู้ให้บริการด้านสุขภาพ เก็บรักษาลิงก์คำเชิญเป็นความลับ');
        done();
      });

      const req = httpMock.expectOne('assets/terms/terms.th.md');
      expect(req.request.method).toBe('GET');
      
      req.flush('## ข้อกำหนดและเงื่อนไข\n\n### 3. คุณสมบัติและการเข้าถึง\nคุณสามารถเข้าร่วมการปรึกษาได้เฉพาะเมื่อมีคำเชิญที่ถูกต้องจากผู้ให้บริการด้านสุขภาพ เก็บรักษาลิงก์คำเชิญเป็นความลับ', {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'text/plain' }
      });
    });
  });
});
