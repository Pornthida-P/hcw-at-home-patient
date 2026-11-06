import { SharedModule } from './shared/shared.module';
import { NgModule, LOCALE_ID, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AngularDraggableModule } from 'angular2-draggable';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { VideoRoomPageModule } from './video-room/video-room.module';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { Camera } from '@awesome-cordova-plugins/camera/ngx';
import { Media } from '@awesome-cordova-plugins/media/ngx';

import { NativeAudio } from '@awesome-cordova-plugins/native-audio/ngx';
import { LocalNotifications } from '@awesome-cordova-plugins/local-notifications/ngx';
import { Network } from '@awesome-cordova-plugins/network/ngx';

import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { JwtInterceptor } from './auth/jwt.interceptor';
import { ErrorInterceptor } from './auth/error.interceptor';
import { registerLocaleData } from '@angular/common';
import { RequestConsultationComponent } from './shared/components/request-consultation/request-consultation.component';
import { CloseConsultationComponent } from './shared/components/close-consultation/close-consultation.component';
import { ChooseAttachmentComponent } from './shared/components/choose-attachment/choose-attachment.component';
import { ConfigService } from './services/config.service';
import { HugAngularLibModule } from 'hcw-stream-lib';
import { CountrySelectPageModule } from './register/country-select/country-select.module';

import localeEn from '@angular/common/locales/en';
import localeTh from '@angular/common/locales/th';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { DEFAULT_LANGUAGES } from './shared/services/language.service';
import { safeGetItem } from './services/safe-storage';

export function HttpLoaderFactory(http: HttpClient) {
    const baseTag = document.getElementsByTagName('base')[0];
    const baseHref = baseTag && baseTag.href ? baseTag.href : '/';
    const prefix =
        baseHref.charAt(baseHref.length - 1) === '/'
            ? baseHref + 'assets/i18n/'
            : baseHref + '/assets/i18n/';
    return new TranslateHttpLoader(http, prefix, '.json');
}

export function LocaleIdFactory(translateService: TranslateService) {
    return translateService.currentLang === 'th' ? 'th' : 'en';
}

registerLocaleData(localeEn);
registerLocaleData(localeTh);

@NgModule({
    imports: [
        TranslateModule.forRoot({
            defaultLanguage: 'en',
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient],
            },
        }),
        BrowserModule,
        BrowserAnimationsModule,
        ReactiveFormsModule,
        IonicModule.forRoot({
            platform: {
                /** The default `desktop` function returns false for devices with a touchscreen.
                 * This is not always wanted, so this function tests the User Agent instead.
                 **/
                desktop: (win) => {
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(win.navigator.userAgent);
                    return !isMobile;
                },
            },
        }),
        AppRoutingModule,
        HttpClientModule,
        VideoRoomPageModule,
        AngularDraggableModule,
        FormsModule,
        HugAngularLibModule,
        SharedModule,
        CountrySelectPageModule,
    ],
    providers: [
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        AndroidPermissions,
        File,
        Camera,
        Media,
        NativeAudio,
        LocalNotifications,
        Network,
        { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        {
            provide: LOCALE_ID,
            deps: [TranslateService],
            useFactory: LocaleIdFactory,
        },
        ConfigService,
        {
            provide: APP_INITIALIZER,
            useFactory: (configService: ConfigService, translateService: TranslateService) => () =>
                configService
                    .getConfig()
                    .toPromise()
                    .then((appConfig) => {
                        const configuredLanguages = (appConfig?.patientLanguages || []).filter((lang) => DEFAULT_LANGUAGES.includes(lang));
                        const dynamicLanguages = configuredLanguages.length ? configuredLanguages : DEFAULT_LANGUAGES;

                        translateService.addLangs(dynamicLanguages);

                        const savedLang = safeGetItem('hhp-lang');
                        const browserLang = translateService.getBrowserLang();
                        const defaultLang =
                            savedLang && dynamicLanguages.includes(savedLang)
                                ? savedLang
                                : dynamicLanguages.includes(browserLang)
                                  ? browserLang
                                  : dynamicLanguages.includes('en')
                                    ? 'en'
                                    : dynamicLanguages[0];

                        translateService.setDefaultLang('en');
                        document.documentElement.setAttribute('lang', defaultLang);
                        return translateService.use(defaultLang).toPromise().catch(() =>
                            translateService.use('en').toPromise()
                        );
                    }),
            deps: [ConfigService, TranslateService],
            multi: true,
        },
    ],
    declarations: [AppComponent, RequestConsultationComponent, CloseConsultationComponent, ChooseAttachmentComponent],
    bootstrap: [AppComponent],
})
export class AppModule {}
