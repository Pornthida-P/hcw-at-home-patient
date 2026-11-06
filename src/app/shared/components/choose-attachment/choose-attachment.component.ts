import { Component, OnInit, Input, Directive, ViewChild, ElementRef } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { FilePicker } from '@capawesome/capacitor-file-picker';

//import { Camera, CameraOptions } from '@awesome-cordova-plugins/camera/ngx';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AuthService } from '../../../auth/auth.service';

import { environment } from '../../../../environments/environment';
import { TranslateService } from "@ngx-translate/core";


@Component({
  selector: 'app-choose-attachment',
  templateUrl: './choose-attachment.component.html',
  styleUrls: ['./choose-attachment.component.scss']
})
export class ChooseAttachmentComponent implements OnInit {
  @Input() consultationId;
  // Real <input type=file> used on the web (see chooseFile)
  @ViewChild('fileInput') fileInput: ElementRef<HTMLInputElement>;
  photo: SafeResourceUrl;
  currentUser;
  constructor(
    public modalController: ModalController,
    private authService: AuthService,
    public platform: Platform,
    private sanitizer: DomSanitizer,
    private translate: TranslateService,
  ) { }

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
  }

  async pickFiles () {
    const result = await FilePicker.pickFiles({
      // types: ['image/png'],
      types: ['application/pdf'],
      multiple: false,
    });
  };

  /**
   * On the web, FilePicker.pickFiles() lazy-loads its web implementation
   * (dynamic import) and only then clicks a detached <input type=file>. By that
   * time the browser no longer treats the click as a user gesture, so the
   * native file picker silently does not open (errors were only console.logged).
   * On the web we now click the <input type=file> from the template directly,
   * synchronously inside the button's click handler. Native apps keep using
   * the Capacitor FilePicker plugin.
   */
  chooseFile() {
    if (!this.isNativeApp() && this.fileInput?.nativeElement) {
      const input = this.fileInput.nativeElement;
      input.value = '';
      input.click();
      return;
    }
    FilePicker.pickFiles()
      .then((uri) => {
        if (uri && uri.files && uri.files.length) {
          this.dismiss(uri.files[0], 'file');
        }
      })
      .catch(e => console.log(e));
  }

  onBrowserFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }
    // same shape as a Capacitor PickedFile, which ConsultationService.postFile expects
    this.dismiss({
      blob: file,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
    }, 'file');
  }

  dismiss(filePath?, type?, fileName?: string) {
    this.modalController.dismiss({
      filePath,
      type:type,
      fileName
    });
  }


  async takePicture() {
    const image =  await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      promptLabelPhoto: this.translate.instant('chooseAttachement.promptLabelPhoto'),
      promptLabelPicture: this.translate.instant('chooseAttachement.promptLabelPicture')
    });
    
    this.photo = this.sanitizer.bypassSecurityTrustResourceUrl(image && (image.dataUrl));
    
    this.dismiss(this.photo, 'file', this.buildPhotoFileName(image));
  
  }

  /**
   * The Camera plugin does not return the original file name, so keep the
   * native file name when a path is given, otherwise build a unique one
   * such as photo-20261104-101530.jpg.
   */
  buildPhotoFileName(image: { path?: string; format?: string }): string {
    const format = (image?.format || 'jpeg').toLowerCase();
    const ext = format === 'jpeg' ? 'jpg' : format;
    let originalName = image?.path ? image.path.split(/[\\/]/).pop().split('?')[0] : '';
    try {
      originalName = decodeURIComponent(originalName);
    } catch (e) {}
    if (originalName && /\.[a-z0-9]+$/i.test(originalName)) {
      return originalName;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    const d = new Date();
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return `photo-${stamp}.${ext}`;
  }
  chooseFileBrowser() {
    return new Promise((resolve, reject) => {
    
      const inputElement = document.getElementById("input-file");
      inputElement.addEventListener("change", function () { 
        resolve((this as HTMLInputElement).files[0])
      }, false);
      inputElement.click();
    })
  }
  isNativeApp() {
    return !this.platform.is('mobileweb') && ( this.platform.is('ios') || this.platform.is('android'));
  }
}
