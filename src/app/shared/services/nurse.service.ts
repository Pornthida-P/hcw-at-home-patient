import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { GlobalVariableService } from '../../services/global-variable.service';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class NurseService {
    constructor(
        private http: HttpClient,
        private globalVariableService: GlobalVariableService,
    ) {}

    /**
     * Fetch a markdown asset. Reject when the SPA fallback returns index.html
     * with HTTP 200 so callers never render raw HTML as welcome content.
     */
    checkMarkdownExists(markdownUrl: string): Observable<string> {
        return this.http.get(markdownUrl, { responseType: 'text', observe: 'response' }).pipe(
            map((res: HttpResponse<string>) => {
                if (!NurseService.isValidMarkdownResponse(res)) {
                    throw new Error('markdown-not-found');
                }
                return res.body as string;
            }),
            catchError((err) => throwError(() => err)),
        );
    }

    static isValidMarkdownResponse(res: HttpResponse<string>): boolean {
        if (!res || res.status !== 200 || typeof res.body !== 'string') {
            return false;
        }
        const contentType = (res.headers && res.headers.get('content-type')) || '';
        if (contentType.toLowerCase().includes('text/html')) {
            return false;
        }
        const head = res.body.trim().slice(0, 200).toLowerCase();
        if (!head) {
            return false;
        }
        return !(
            head.startsWith('<!doctype') ||
            head.startsWith('<html') ||
            head.includes('<app-root') ||
            head.includes('<base href')
        );
    }

    registerNurse(body) {
        return this.http.post<any>(this.globalVariableService.getApiPath() + '/register-nurse', body);
    }
}
