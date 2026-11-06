import { AuthService } from "../auth/auth.service";
import { Component, OnInit  } from "@angular/core";
import {ActivatedRoute, Router} from "@angular/router";

import { ConsultationService } from "../services/consultation.service";
import { ConfigService } from "../services/config.service";
import { Platform } from "@ionic/angular";
import { App } from '@capacitor/app';
import {StorageService} from "../services/storage.service";
import { ConsultationReportService } from "../shared/pdf/consultation-report.service";

@Component({
  selector: "app-closing-screen",
  templateUrl: "./closing-screen.page.html",
  styleUrls: ["./closing-screen.page.scss"],
})
export class ClosingScreenPage implements OnInit {
  private consultationId;
  public feedbackSubmitted: boolean = false;
  public loading: boolean = true;
  public feedbackSaved: boolean = false;
  public feedbackEmpty: boolean = false;
  public userRating: string = null;
  public userComment: string = "";
  public ratings: string[] = ["good", "ok", "bad"];
  // overview entry of the closed consultation (consultation, nurse, doctor)
  public consultation = null;
  public reportLoading: boolean = false;
  public reportError: boolean = false;

  currentUser;
  constructor(
    private router: Router,
    public platform: Platform,
    private authService: AuthService,
    public configService: ConfigService,
    private activeRoute: ActivatedRoute,
    private storageService: StorageService,
    private consultationService: ConsultationService,
    private consultationReportService: ConsultationReportService,
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.consultationId = this.activeRoute.snapshot.params.id;
    this.getConsultation();
  }

  getConsultation() {
    this.consultationService
        .getConsultation(this.consultationId).subscribe({
      next: (res) => {
        this.consultation = res;
        this.feedbackSaved = !!res?.queue?.disableFeedback;
        this.feedbackEmpty = !!res?.queue?.disableFeedback;
        this.loading = false;
      }, error: () =>{
        this.loading = false;
      }
    })

  }

  /**
   * The report can be downloaded by the users who can export it from the
   * dashboard history (same consultation and messages access).
   */
  canDownloadReport() {
    return !!this.consultation?.consultation && this.currentUser
      && this.currentUser.role !== 'translator' && this.currentUser.role !== 'guest';
  }

  downloadReport() {
    if (this.reportLoading || !this.consultation) {
      return;
    }
    this.reportLoading = true;
    this.reportError = false;
    const { consultation, nurse, doctor } = this.consultation;
    this.consultationReportService.generatePDF(consultation, nurse, doctor)
      .catch((err) => {
        console.error('PDF export failed', err);
        this.reportError = true;
      })
      .finally(() => {
        this.reportLoading = false;
      });
  }

  /**
   * Event fired when the user clicks on one of the ratings
   * @param rating The clicked rating
   */
  onRatingClick(rating) {
    if (rating === this.userRating) {
      this.userRating = null;
    } else if (this.ratings.indexOf(rating) !== -1) {
      this.userRating = rating;
    }
  }

  closeApp() {
    this.storageService.clear();
    App.exitApp();
  }

  /**
   * Check if the user is running an installed app.
   */

  isNativeApp() {
    return this.platform.is("ios") || this.platform.is("android");
  }

  /**
   * Event fired when the user submits the feedback form
   */
  onFormSubmit() {

    if (this.feedbackSubmitted || !this.userRating == null) {
      return;
    }
    this.feedbackSubmitted = true;
    this.consultationService
      .saveConsultationFeedback(
        this.consultationId,
        this.userRating,
        this.userComment
      )
      .subscribe(
        (res) => {
          if (this.currentUser.role === 'nurse' || this.currentUser.role === 'admin') {
            this.router.navigate([`/dashboard`]);
          } else {
            this.feedbackEmpty = !this.userRating && !this.userComment;
            this.feedbackSaved = true;
          }
        },
        (err) => {
          this.feedbackSubmitted = false;
        }
      );
  }
}
