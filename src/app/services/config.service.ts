import { Injectable } from "@angular/core";
import { HttpClient, HttpResponse } from "@angular/common/http";
import {BehaviorSubject, Observable, of, Subject} from "rxjs";
import { GlobalVariableService } from "./global-variable.service";
import {catchError, map, switchMap, tap} from "rxjs/operators";
import {Title} from "@angular/platform-browser";

@Injectable({
  providedIn: "root",
})
export class ConfigService {
  public configSub: Subject<any> = new Subject();
  public config;
  public api: string;
  constructor(
    private http: HttpClient,
    private titleService: Title,
    private globalVariableService: GlobalVariableService
  ) {}

    getCountries() {
        return this.http.get<string[]>('assets/terms/countries.json');
    }


    getConfig() {
        return this.http.get<any>(this.globalVariableService.getApiPath() +  '/config').pipe(
            tap(config => {
                this.config = config;
                this.configSub.next(config);

                if (config.branding) {
                    this.titleService.setTitle(config.branding);
                }

                if (config.patientAppPrimaryColor) {
                    this.updatePrimaryColor(config.patientAppPrimaryColor);
                }

                if (config.matomoUrl && config.matomoId) {
                    this.initializeMatomo(config.matomoUrl, config.matomoId);
                }

                if (config.accessibilityMode && config.accessibilityMode !== 'false') {
                    document.documentElement.setAttribute('data-theme', 'accessibility');
                }

                this.globalVariableService.serverError = false;
            }),
            catchError(error => {
                return of(null);
            })
        );
    }


    updatePrimaryColor(color: string) {
        document.documentElement.style.setProperty('--ion-color-primary', color);
    }


    //Matomo
    initializeMatomo(url: string, siteId: string): void {
        // @ts-ignore
        var _paq = window._paq = window._paq || [];
        _paq.push(['trackPageView']);
        _paq.push(['enableLinkTracking']);
        (function() {
            var u = url;
            _paq.push(['setTrackerUrl', u+'matomo.php']);
            _paq.push(['setSiteId', siteId]);
            var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
            g.async = true; g.src = u+'matomo.js'; s.parentNode.insertBefore(g, s);
        })();
    }

    /**
     * Load a terms markdown file and return its content, or
     * null when it is not available. When the file is missing, the web server's
     * SPA fallback (try_files ... /index.html) answers HTTP 200 with index.html,
     * which used to be treated as "file exists" and rendered as raw HTML text.
     */
    loadTermsFile(path: string): Observable<string | null> {
        return this.http.get(path, { responseType: 'text', observe: 'response' }).pipe(
            map((res: HttpResponse<string>) => (ConfigService.isValidTermsResponse(res) ? res.body : null)),
            catchError(() => of(null))
        );
    }

    static isValidTermsResponse(res: HttpResponse<string>): boolean {
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
        return !(head.startsWith('<!doctype') || head.startsWith('<html') || head.includes('<app-root') || head.includes('<base href'));
    }

    checkTermsFileExists(fileName: string) {
        return this.loadTermsFile(`assets/terms/${fileName}`).pipe(map(content => !!content));
    }

    shouldHideCallerName(userRole: string): boolean {
        return this.config?.hideCallerName && userRole !== 'admin' && userRole !== 'nurse';
    }

}
