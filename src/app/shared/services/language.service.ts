import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { safeGetItem, safeSetItem } from '../../services/safe-storage';

export const DEFAULT_LANGUAGES = ['en', 'th'];

@Injectable({
    providedIn: 'root',
})
export class LanguageService {
    constructor(private translate: TranslateService) {}

    getCurrentLanguage() {
        const userLang = safeGetItem('hhp-lang') || this.translate.getBrowserLang();
        return DEFAULT_LANGUAGES.includes(userLang) ? userLang : DEFAULT_LANGUAGES[0];
    }

    switchLanguage(lang: string) {
        this.translate.use(lang).subscribe(() => {
            safeSetItem('hhp-lang', lang);
            const rtlLanguages = ['ar', 'fa', 'he', 'ur', 'ps'];
            const dir = rtlLanguages.includes(lang) ? 'rtl' : 'ltr';

            document.documentElement.setAttribute('dir', dir);
            document.documentElement.setAttribute('lang', lang);
        });
        this.translate.setDefaultLang('en');
    }

    applyInviteLanguage(lang: string, inviteToken?: string, force = false): boolean {
        if (!lang || !DEFAULT_LANGUAGES.includes(lang)) {
            return false;
        }
        const inviteKey = inviteToken ? `${inviteToken}|${lang}` : '';
        const appliedFor = safeGetItem('hhp-lang-invite');
        const isNewInvite = !inviteKey || appliedFor !== inviteKey;
        if (!force && !isNewInvite && safeGetItem('hhp-lang')) {
            return false;
        }
        if (inviteKey) {
            safeSetItem('hhp-lang-invite', inviteKey);
        }
        if (this.translate.currentLang !== lang || safeGetItem('hhp-lang') !== lang) {
            this.switchLanguage(lang);
        }
        return true;
    }
}
