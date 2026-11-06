import { Inject, Injectable, LOCALE_ID } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { jsPDF } from 'jspdf';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { ConfigService } from '../../services/config.service';
import { GlobalVariableService } from '../../services/global-variable.service';
import { MessageService } from '../../services/message.service';
import { DurationPipe } from '../pipes/duration.pipe';
import { setupPdfFonts } from './pdf-fonts';

/**
 * PDF consultation report, shared by the dashboard history and the
 * closing screen.
 */
@Injectable({
    providedIn: 'root',
})
export class ConsultationReportService {
    private datePipe: DatePipe;
    private durationPipe = new DurationPipe();

    constructor(
        @Inject(LOCALE_ID) locale: string,
        private authService: AuthService,
        private translate: TranslateService,
        private configService: ConfigService,
        private messageService: MessageService,
        private globalVariableService: GlobalVariableService,
    ) {
        this.datePipe = new DatePipe(locale);
    }

    getImageUrl(imageFile: Blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result);
            };
            reader.onerror = () => {
                reject(reader.error);
            };
            reader.readAsDataURL(imageFile);
        });
    }

    compressImage(image: HTMLImageElement, fallback: string): string {
        try {
            if (!image.width || !image.height) {
                return fallback;
            }
            const maxSize = 1200;
            const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.75);
        } catch (err) {
            return fallback;
        }
    }

    adjustMsg(msg, consultationId) {
        return new Promise((resolve) => {
            if (msg.type === 'attachment') {
                const requestUrl = `${this.globalVariableService.getApiPath()}/consultation/${consultationId}/attachment/${msg.id}`;
                const user = this.authService.currentUserValue;

                const mimeType = msg.mimeType || '';

                if (mimeType.startsWith('image')) {
                    fetch(requestUrl, {
                        headers: {
                            Authorization: `Bearer ${user.token}`,
                        },
                    })
                        .then((res) => res.blob())
                        .then(async (imageFile) => {
                            msg.isImage = true;
                            msg.attachmentsURL = await this.getImageUrl(imageFile);
                            resolve(msg);
                        })
                        .catch((err) => {
                            msg.attachmentsURL = null;
                            resolve(msg);
                        });
                } else if (mimeType.startsWith('audio')) {
                    msg.isAudio = true;
                    resolve(msg);
                } else {
                    msg.attachmentsURL = requestUrl;
                    msg.isFile = true;
                    resolve(msg);
                }
            } else {
                resolve(msg);
            }
        });
    }

    /**
     * Builds the consultation report (participants, consultation details and
     * chat history) and downloads it as a PDF file.
     */
    async generatePDF(data, nurse, doctor): Promise<void> {
        const res = await firstValueFrom(this.messageService.getAllConsultationMessages(data._id || data.id));
        const messages = await Promise.all(res.reverse().map((m) => this.adjustMsg(m, data._id || data.id)));

        const doc = new jsPDF();
        // Embed a Unicode (Thai + Latin) font; doc.text() is Thai-shaped
        const pdfFont = await setupPdfFonts(doc);
        const getLabelWidth = (text: string) => doc.getTextWidth(text) + 2;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const imageUrl = this.configService.config?.logo;
        let yPosition = 10;

        const addPageIfNeeded = (lines = 1) => {
            if (yPosition + lines * 5 > pageHeight - 10) {
                doc.addPage();
                yPosition = 10;
            }
        };

        if (imageUrl) {
            await new Promise<void>((resolve) => {
                const image = new Image();
                image.crossOrigin = 'Anonymous';

                const isSvg = imageUrl.toLowerCase().endsWith('.svg') || imageUrl.startsWith('data:image/svg+xml');

                image.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = image.width || 200;
                        canvas.height = image.height || 200;
                        ctx.drawImage(image, 0, 0);

                        const base64 = canvas.toDataURL(isSvg ? 'image/png' : 'image/jpeg');
                        const imgWidth = 50;
                        const imgHeight = (canvas.height / canvas.width) * imgWidth;

                        doc.addImage(base64, isSvg ? 'PNG' : 'JPEG', pageWidth / 2 - imgWidth / 2, yPosition, imgWidth, imgHeight);
                        yPosition += imgHeight + 10;
                        resolve();
                    } catch (err) {
                        console.error('Image processing failed:', err);
                        resolve();
                    }
                };

                image.onerror = () => {
                    console.error('Failed to load image:', imageUrl);
                    resolve();
                };

                image.src = imageUrl;
            });
        }

        const pdfLang = this.translate.currentLang === 'th' ? 'th' : 'en';
        const formatPdfDate = (value, format: string) => this.datePipe.transform(value, format, undefined, pdfLang) || '';
        const genderKey = data.gender ? `dashboard.${String(data.gender).toLowerCase()}` : '';
        const genderText = genderKey
            ? this.translate.instant(genderKey) !== genderKey
                ? this.translate.instant(genderKey)
                : `${data.gender}`
            : '-';

        const leftX = 15;
        const labelGap = 20;
        const lineHeight = 5;

        pdfFont.setFont('normal');
        doc.setFontSize(22);
        doc.text(this.translate.instant('pdf.consultationReport'), leftX, yPosition);
        yPosition += 15;

        if (doctor?.firstName) {
            doc.setFontSize(14);
            doc.setTextColor('#464F60');
            doc.text(this.translate.instant('pdf.doctorInformation'), leftX, yPosition);
            yPosition += 10;

            doc.setFontSize(10);
            doc.setTextColor('#000');
            pdfFont.setFont('bold');
            const doctorFirstnameLabel = this.translate.instant('pdf.firstname') + ':';
            const doctorLastnameLabel = this.translate.instant('pdf.lastname') + ':';
            doc.text(doctorFirstnameLabel, leftX, yPosition);
            doc.text(doctorLastnameLabel, leftX, yPosition + lineHeight);

            pdfFont.setFont('normal');
            doc.text(`${doctor.firstName}`, leftX + getLabelWidth(doctorFirstnameLabel), yPosition);
            doc.text(`${doctor.lastName}`, leftX + getLabelWidth(doctorLastnameLabel), yPosition + lineHeight);
            yPosition += lineHeight * 2 + 10;
        }

        doc.setFontSize(14);
        doc.setTextColor('#464F60');
        doc.text(this.translate.instant('pdf.patientInformation'), leftX, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setTextColor('#000');
        pdfFont.setFont('bold');
        const patientFirstnameLabel = this.translate.instant('pdf.firstname') + ':';
        const patientLastnameLabel = this.translate.instant('pdf.lastname') + ':';
        const patientGenderLabel = this.translate.instant('pdf.gender') + ':';
        doc.text(patientFirstnameLabel, leftX, yPosition);
        doc.text(patientLastnameLabel, leftX, yPosition + lineHeight);
        doc.text(patientGenderLabel, leftX, yPosition + lineHeight * 2);
        pdfFont.setFont('normal');
        doc.text(`${data.firstName}`, leftX + getLabelWidth(patientFirstnameLabel), yPosition);
        doc.text(`${data.lastName}`, leftX + getLabelWidth(patientLastnameLabel), yPosition + lineHeight);
        doc.text(genderText, leftX + getLabelWidth(patientGenderLabel), yPosition + lineHeight * 2);
        yPosition += lineHeight * 3 + 10;

        if (nurse?.firstName) {
            doc.setFontSize(14);
            doc.setTextColor('#464F60');
            doc.text(this.translate.instant('pdf.requesterInformation'), leftX, yPosition);
            yPosition += 10;

            doc.setFontSize(10);
            doc.setTextColor('#000');
            pdfFont.setFont('bold');
            const nurseFirstnameLabel = this.translate.instant('pdf.firstname') + ':';
            const nurseLastnameLabel = this.translate.instant('pdf.lastname') + ':';
            doc.text(nurseFirstnameLabel, leftX, yPosition);
            doc.text(nurseLastnameLabel, leftX, yPosition + lineHeight);
            pdfFont.setFont('normal');
            doc.text(`${nurse.firstName}`, leftX + getLabelWidth(nurseFirstnameLabel), yPosition);
            doc.text(`${nurse.lastName}`, leftX + getLabelWidth(nurseLastnameLabel), yPosition + lineHeight);
            yPosition += lineHeight * 2 + 10;
        }

        if (data.experts?.length) {
            doc.setFontSize(14);
            doc.setTextColor('#464F60');
            doc.text(this.translate.instant('pdf.expertInformation'), leftX, yPosition);
            yPosition += 10;

            data.experts.forEach((expert) => {
                doc.setFontSize(10);
                doc.setTextColor('#000');
                pdfFont.setFont('bold');
                const expertFirstnameLabel = this.translate.instant('pdf.firstname') + ':';
                const expertLastnameLabel = this.translate.instant('pdf.lastname') + ':';
                doc.text(expertFirstnameLabel, leftX, yPosition);
                doc.text(expertLastnameLabel, leftX, yPosition + lineHeight);
                pdfFont.setFont('normal');
                doc.text(`${expert.firstName}`, leftX + getLabelWidth(expertFirstnameLabel), yPosition);
                doc.text(`${expert.lastName}`, leftX + getLabelWidth(expertLastnameLabel), yPosition + lineHeight);
                yPosition += lineHeight * 2 + 5;
            });
        }

        doc.setFontSize(14);
        doc.setTextColor('#464F60');
        doc.text(this.translate.instant('pdf.consultationInformation'), leftX, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setTextColor('#000');
        pdfFont.setFont('bold');
        doc.text(this.translate.instant('pdf.startDateTime') + ':', leftX, yPosition);
        pdfFont.setFont('normal');
        doc.text(
            formatPdfDate(data.acceptedAt || data.createdAt, 'd MMM yyyy HH:mm'),
            leftX + getLabelWidth(this.translate.instant('pdf.startDateTime') + ':'),
            yPosition,
        );
        yPosition += lineHeight;

        if (data.closedAt) {
            pdfFont.setFont('bold');
            doc.text(this.translate.instant('pdf.endDateTime') + ':', leftX, yPosition);
            pdfFont.setFont('normal');
            doc.text(
                formatPdfDate(data.closedAt, 'd MMM yyyy HH:mm'),
                leftX + getLabelWidth(this.translate.instant('pdf.endDateTime') + ':'),
                yPosition,
            );
            yPosition += lineHeight;

            pdfFont.setFont('bold');
            doc.text(this.translate.instant('pdf.duration') + ':', leftX, yPosition);
            pdfFont.setFont('normal');
            doc.text(
                `${this.durationPipe.transform(data.closedAt - (data.acceptedAt || data.createdAt), pdfLang)}`, // Same as doctor app/backend
                leftX + getLabelWidth(this.translate.instant('pdf.duration') + ':'),
                yPosition,
            );
            yPosition += lineHeight;
        }

        yPosition += 5;

        if (data.metadata && Object.keys(data.metadata).length) {
            Object.keys(data.metadata).forEach((key) => {
                addPageIfNeeded();
                pdfFont.setFont('bold');
                doc.text(`${key}:`, leftX, yPosition);
                pdfFont.setFont('normal');
                doc.text(`${data.metadata[key]}`, leftX + getLabelWidth(`${key}:`), yPosition);
                yPosition += lineHeight;
            });
        }

        doc.setFontSize(14);
        doc.setTextColor('#464F60');
        yPosition += 10;
        doc.text(this.translate.instant('pdf.chatHistory'), leftX, yPosition);
        yPosition += 10;

        for (const message of messages) {
            addPageIfNeeded(4);
            doc.setFontSize(10);
            doc.setTextColor('#000');
            pdfFont.setFont('bold');

            const firstName = message.fromUserDetail.role === 'patient' ? data?.firstName : message.fromUserDetail.firstName || '';
            const lastName = message.fromUserDetail.role === 'patient' ? data?.lastName : message.fromUserDetail.lastName || '';
            const date = formatPdfDate(message.createdAt, 'dd LLL HH:mm');
            const roleKey = `roles.${message.fromUserDetail.role}`;
            const roleLabel = this.translate.instant(roleKey) || message.fromUserDetail.role;

            const titleLine = `${firstName} ${lastName} (${roleLabel}) - ${date}:`;
            const wrappedTitle = doc.splitTextToSize(titleLine, pageWidth - 30);
            doc.text(wrappedTitle, 15, yPosition);
            yPosition += wrappedTitle.length * 5;

            pdfFont.setFont('normal');
            doc.setTextColor('#464F60');

            if (message.type === 'videoCall' || message.type === 'audioCall') {
                const callTypeText =
                    message.type === 'audioCall' ? this.translate.instant('pdf.audioCall') : this.translate.instant('pdf.videoCall');

                const callStatus = message.closedAt
                    ? message.acceptedAt
                        ? `${callTypeText} ${this.translate.instant('pdf.accepted')}`
                        : `${callTypeText} ${this.translate.instant('pdf.missed')}`
                    : `${callTypeText} ${this.translate.instant('pdf.call')}`;

                addPageIfNeeded(3);
                doc.text(callStatus, 15, yPosition);
                yPosition += 5;
                doc.text(formatPdfDate(message.createdAt, 'dd LLL HH:mm'), 15, yPosition);
                yPosition += 5;

                if (message.acceptedAt && message.closedAt) {
                    const closedDate = formatPdfDate(message.closedAt, 'dd LLL HH:mm');
                    doc.text(`${callTypeText} ${this.translate.instant('pdf.finished')}`, 15, yPosition);
                    yPosition += 5;
                    doc.text(`${closedDate}`, 15, yPosition);
                    yPosition += 5;
                }
            } else if (message.text) {
                const splitText = doc.splitTextToSize(message.text, pageWidth - 30);
                for (const line of splitText) {
                    addPageIfNeeded();
                    doc.text(line, 15, yPosition);
                    yPosition += 4;
                }
            }

            // Every attachment message gets a text line in the chat history
            // ("[Attached file]: <file name>"), like the doctor report; images
            // are embedded below that line when they could be loaded.
            if (message.type === 'attachment' || message.isImage || message.isFile || message.isAudio) {
                addPageIfNeeded();
                pdfFont.setFont('normal');
                doc.setTextColor('#464F60');
                const attachmentLine = doc.splitTextToSize(
                    `${this.translate.instant('pdf.attachedFile')}: ${message.fileName || (message.isImage ? 'image' : 'file')}`,
                    pageWidth - 30,
                );
                for (const line of attachmentLine) {
                    addPageIfNeeded();
                    doc.text(line, 15, yPosition);
                    yPosition += 5;
                }
            }

            if (message.isImage && message.attachmentsURL) {
                await new Promise<void>((resolve) => {
                    const image = new Image();
                    image.src = message.attachmentsURL;
                    image.onload = () => {
                        const imgWidth = 50;
                        const imgHeight = (image.height / image.width) * imgWidth;
                        if (yPosition + imgHeight > pageHeight - 10) {
                            doc.addPage();
                            yPosition = 10;
                        }
                        doc.addImage(this.compressImage(image, message.attachmentsURL), 'JPEG', 15, yPosition, imgWidth, imgHeight);
                        yPosition += imgHeight + 5;
                        resolve();
                    };
                    image.onerror = () => resolve();
                });
            }

        }

        pdfFont.finalize(); // ToUnicode fix (copy/paste of Thai text)
        doc.save(this.translate.instant('pdf.fileName') + '.pdf');
    }
}
