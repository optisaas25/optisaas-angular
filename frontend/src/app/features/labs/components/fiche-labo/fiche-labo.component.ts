import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'optisass-fiche-labo',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="p-4 bg-white rounded-lg shadow-md">
      <h2 class="text-xl font-bold mb-4">Fiche Montage Labo</h2>
      
      <div class="fiche border p-6 bg-gray-50 rounded" *ngIf="fiche; else noFiche">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500">ID Fiche</p>
            <p class="font-mono font-bold">{{ fiche.id || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Date</p>
            <p class="font-bold">{{ (fiche.date | date:'dd/MM/yyyy') || '17/01/2026' }}</p>
          </div>
        </div>
        <hr class="my-4">
        <div class="space-y-2">
            <p><strong>Client:</strong> {{ fiche.client || 'Jean Dupont' }}</p>
            <p><strong>Monture:</strong> {{ fiche.monture || 'Ray-Ban Wayfarer' }}</p>
            <p><strong>Lentilles:</strong> {{ fiche.lentilles || 'Essilor Crizal' }}</p>
        </div>
      </div>
      
      <ng-template #noFiche>
        <div class="p-6 bg-blue-50 text-blue-700 rounded border border-blue-200">
            Aucune fiche de laboratoire sélectionnée.
        </div>
      </ng-template>
    </div>
  `,
    styles: [`.fiche { font-family: 'Courier New', Courier, monospace; }`]
})
export class FicheLaboComponent {
    @Input() fiche: any = {
        id: 'LAB-2026-001',
        client: 'Jean Dupont',
        monture: 'Ray-Ban Wayfarer',
        lentilles: 'Essilor Crizal',
        date: new Date()
    };
}
