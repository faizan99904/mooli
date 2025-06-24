import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-prescription',
  imports: [CommonModule],
  templateUrl: './prescription.component.html',
  styleUrl: './prescription.component.scss',
})
export class PrescriptionComponent {
  @ViewChild('pdfContent', { static: false }) pdfContent!: ElementRef;

  downloadPDF() {
    const content = this.pdfContent.nativeElement;
    html2canvas(content, { scale: 1.2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgProps = {
        width: pageWidth,
        height: (canvas.height * pageWidth) / canvas.width,
      };

      let position = 0;
      let heightLeft = imgProps.height;
      pdf.addImage(
        imgData,
        'PNG',
        0,
        position,
        imgProps.width,
        imgProps.height
      );
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgProps.height;
        pdf.addPage();
        pdf.addImage(
          imgData,
          'PNG',
          0,
          position,
          imgProps.width,
          imgProps.height
        );
        heightLeft -= pageHeight;
      }

      pdf.save('prescription.pdf');
    });
  }
}
