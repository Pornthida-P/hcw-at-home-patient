import { Optional, Pipe, PipeTransform } from "@angular/core";
import { intervalToDuration, formatDuration } from "date-fns";
import { enUS, th } from "date-fns/locale";
import { TranslateService } from "@ngx-translate/core";

@Pipe({
  name: "duration",
  pure: false
})
export class DurationPipe implements PipeTransform {

  constructor(@Optional() private translate?: TranslateService) {}

  transform(duration: number, args?: any): any {
    if(!duration) return "";
    const durationObject = intervalToDuration({ start: 0, end: duration });
    const lang = args === "th" || args === "en" ? args : this.translate?.currentLang;
    return formatDuration(durationObject, { locale: lang === "th" ? th : enUS });
  }
}
