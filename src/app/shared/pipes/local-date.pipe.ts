import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

export function dateLocale(lang: string): string {
    return lang === 'th' ? 'th' : 'en';
}

@Pipe({
    name: 'localDate',
    pure: false,
})
export class LocalDatePipe implements PipeTransform {
    private datePipe = new DatePipe('en');

    constructor(private translate: TranslateService) {}

    transform(value: any, format = 'mediumDate', timezone?: string): string | null {
        return this.datePipe.transform(value, format, timezone, dateLocale(this.translate.currentLang));
    }
}
