import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-labs-container',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <nav class="flex space-x-4 mb-8 bg-white p-2 rounded-lg shadow-sm">
        <a routerLink="./dashboard" routerLinkActive="bg-blue-600 text-white" class="px-4 py-2 rounded-md hover:bg-blue-50 transition-colors">Dashboard</a>
        <a routerLink="./essayage-virtuel" routerLinkActive="bg-blue-600 text-white" class="px-4 py-2 rounded-md hover:bg-blue-50 transition-colors">2D/IA</a>
        <!-- <a routerLink="./essayage-3d" routerLinkActive="bg-blue-600 text-white" class="px-4 py-2 rounded-md hover:bg-blue-50 transition-colors">3D</a> -->
        <a routerLink="./lentilles" routerLinkActive="bg-blue-600 text-white" class="px-4 py-2 rounded-md hover:bg-blue-50 transition-colors">Lentilles</a>
        <a routerLink="./fiche-labo" routerLinkActive="bg-blue-600 text-white" class="px-4 py-2 rounded-md hover:bg-blue-50 transition-colors">Fiche Labo</a>
      </nav>
      
      <div class="max-w-7xl mx-auto">
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class LabsContainerComponent { }
