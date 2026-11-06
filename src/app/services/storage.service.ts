import { Injectable } from '@angular/core';
import { safeGetItem, safeSetItem, safeClear } from './safe-storage';

@Injectable({
    providedIn: 'root',
})
export class StorageService {
    constructor() {}

    clear(): void {
        const language = safeGetItem('hhp-lang');
        const languageInvite = safeGetItem('hhp-lang-invite');
        safeClear();
        if (languageInvite) {
            safeSetItem('hhp-lang-invite', languageInvite);
        }
        if (language) {
            safeSetItem('hhp-lang', language);
        } else {
            safeSetItem('hhp-lang', 'en');
        }
    }
}
