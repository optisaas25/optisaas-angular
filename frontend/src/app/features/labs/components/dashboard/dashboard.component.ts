import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SaasService } from '../../services/saas.service';

@Component({
    selector: 'optisass-dashboard',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="p-4">
      <h1 class="text-2xl font-bold mb-6 text-blue-800">Dashboard SaaS Multi-Centres</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
          <h3 class="text-lg opacity-80">Conversion IA</h3>
          <p class="text-3xl font-bold mt-2">78%</p>
        </div>
        <div class="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
          <h3 class="text-lg opacity-80">Essais 3D</h3>
          <p class="text-3xl font-bold mt-2">1,240</p>
        </div>
        <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-xl text-white shadow-lg">
          <h3 class="text-lg opacity-80">Ventes Totales</h3>
          <p class="text-3xl font-bold mt-2">45.2k €</p>
        </div>
      </div>

      <div class="bg-white p-6 rounded-xl shadow-md">
        <h2 class="text-xl font-bold mb-4">Montures Populaires</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="border-b text-left text-gray-500 text-sm">
                <th class="pb-3">Modèle</th>
                <th class="pb-3 text-right">Nombre d'essais</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let key of popularKeys" class="border-b last:border-0">
                <td class="py-3 font-medium">{{ key }}</td>
                <td class="py-3 text-right">{{ stats.monturesPopulaires[key] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
    stats: any;
    popularKeys: string[] = [];

    constructor(private saas: SaasService) { }

    ngOnInit() {
        this.stats = this.saas.statsConversion();
        if (this.stats && this.stats.monturesPopulaires) {
            this.popularKeys = Object.keys(this.stats.monturesPopulaires);
        }
    }
}
