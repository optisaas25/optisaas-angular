import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

interface ClaimForExport {
  facture: { numero: string; dateEmission: Date; totalTTC: number };
  client: { nom: string | null; prenom: string | null };
  convention: { nom: string };
  montantTotalTTC: number;
  montantPriseEnCharge: number;
  montantPartClient: number;
  statut: string;
  referenceOrganisme: string | null;
  dateSoumission: Date | null;
}

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE: 'Soumise',
  EN_ATTENTE: 'En attente',
  REMBOURSEE: 'Remboursée',
  REJETEE: 'Rejetée',
};

@Injectable()
export class TiersPayantPdfService {
  /** Generates a single claim summary sheet meant for manual submission to the insurer/mutuelle. */
  async generateClaimExport(claim: ClaimForExport): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      this.#drawHeader(doc, 'DOSSIER DE PRISE EN CHARGE TIERS-PAYANT');
      this.#drawClaimRow(doc, 100, claim);

      doc.end();
    });
  }

  /** Generates one summary sheet per claim in a single PDF, for a batch transmission. */
  async generateBatchExport(claims: ClaimForExport[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      this.#drawHeader(doc, `DOSSIERS DE PRISE EN CHARGE TIERS-PAYANT (${claims.length})`);

      let y = 100;
      claims.forEach((claim, i) => {
        if (y > 680) {
          doc.addPage();
          y = 60;
        }
        y = this.#drawClaimRow(doc, y, claim);
        if (i < claims.length - 1) {
          doc.moveTo(40, y).lineTo(555, y).stroke('#e2e8f0');
          y += 20;
        }
      });

      doc.end();
    });
  }

  #drawHeader(doc: PDFKit.PDFDocument, title: string) {
    doc
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('OPTISAAS', 40, 40);
    doc
      .fillColor('#3b82f6')
      .font('Helvetica-Bold')
      .fontSize(13)
      .text(title, 40, 62);
    doc
      .fillColor('#475569')
      .font('Helvetica')
      .fontSize(9)
      .text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 40, 82);
    doc.moveTo(40, 95).lineTo(555, 95).lineWidth(1.5).stroke('#0f172a');
  }

  #drawClaimRow(doc: PDFKit.PDFDocument, y: number, claim: ClaimForExport): number {
    const clientName = `${claim.client.prenom || ''} ${claim.client.nom || ''}`.trim();

    doc
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(`Facture N° ${claim.facture.numero}`, 40, y);
    doc
      .fillColor('#475569')
      .font('Helvetica')
      .fontSize(9)
      .text(
        `Date: ${claim.facture.dateEmission.toLocaleDateString('fr-FR')}   |   Client: ${clientName}   |   Organisme: ${claim.convention.nom}`,
        40,
        y + 16,
      );

    const rowY = y + 35;
    const drawField = (x: number, label: string, value: string) => {
      doc
        .fillColor('#64748b')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(label.toUpperCase(), x, rowY);
      doc
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(value, x, rowY + 12);
    };

    drawField(40, 'Total facture', `${claim.montantTotalTTC.toFixed(2)} DH`);
    drawField(
      190,
      'Pris en charge',
      `${claim.montantPriseEnCharge.toFixed(2)} DH`,
    );
    drawField(340, 'Part client', `${claim.montantPartClient.toFixed(2)} DH`);
    drawField(460, 'Statut', STATUT_LABELS[claim.statut] || claim.statut);

    let nextY = rowY + 35;
    if (claim.referenceOrganisme) {
      doc
        .fillColor('#475569')
        .font('Helvetica')
        .fontSize(9)
        .text(`Référence organisme: ${claim.referenceOrganisme}`, 40, nextY);
      nextY += 14;
    }
    if (claim.dateSoumission) {
      doc
        .fillColor('#475569')
        .font('Helvetica')
        .fontSize(9)
        .text(
          `Soumis le: ${claim.dateSoumission.toLocaleDateString('fr-FR')}`,
          40,
          nextY,
        );
      nextY += 14;
    }

    return nextY + 10;
  }
}
