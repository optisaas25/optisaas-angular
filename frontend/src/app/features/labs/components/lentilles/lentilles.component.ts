import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LentilleOptiqueService } from '../../services/lentille-optique.service';

@Component({
    selector: 'optisass-lentilles',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="p-4 bg-white rounded-lg shadow-md">
      <h2 class="text-xl font-bold mb-4">Simulation Lentilles Optiques</h2>
      
      <div class="lentille-zone border rounded overflow-hidden relative" *ngIf="photo">
        <img [src]="photo" class="photo" [style.transform]="'scale(' + effet.scale + ')'">
        <div class="teinte" [ngStyle]="{'background': teinte}"></div>
      </div>
      
      <div *ngIf="!photo" class="h-64 bg-gray-100 border rounded flex items-center justify-center text-gray-400">
        Aucune photo chargée pour la simulation.
      </div>
      
      <div class="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium">Type de teinte</label>
          <select class="mt-1 block w-full border rounded p-2" (change)="onTeinteChange($event)">
            <option value="aucune">Aucune</option>
            <option value="bleue">Bleue</option>
            <option value="brune">Brune</option>
          </select>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .lentille-zone { position: relative; width: 100%; max-width: 600px; margin: 0 auto; }
    .photo { width: 100%; transition: transform .3s ease; display: block; }
    .teinte { position: absolute; inset: 0; pointer-events: none; transition: background 0.3s ease; }
  `]
})
export class LentillesComponent implements OnChanges {
    @Input() photo: string | null = null;
    @Input() prescription: any = { sph: -2.00 };
    @Input() typeTeinte: string = 'aucune';

    effet: any = { scale: 1 };
    teinte = 'transparent';

    constructor(private optique: LentilleOptiqueService) { }

    ngOnChanges() {
        if (!this.prescription) return;
        this.effet = this.optique.calculEffet(this.prescription);
        this.teinte = this.optique.teinte(this.typeTeinte);
    }

    onTeinteChange(event: any) {
        this.typeTeinte = event.target.value;
        this.teinte = this.optique.teinte(this.typeTeinte);
    }
}
