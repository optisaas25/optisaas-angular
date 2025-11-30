import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    SidebarComponent,
    HeaderComponent,
  ],
  template: `
    <div class="material-layout">
      <mat-sidenav-container class="sidenav-container">
        <mat-sidenav
          #sidenav
          [mode]="'side'"
          [opened]="true"
          class="material-sidenav"
        >
          <app-sidebar></app-sidebar>
        </mat-sidenav>

        <mat-sidenav-content class="sidenav-content">
          <app-header></app-header>
          <main class="main-content">
            <router-outlet></router-outlet>
          </main>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    .material-layout {
      height: 100vh;
      overflow: hidden;
      background: #f5f5f5;
    }

    .sidenav-container {
      height: 100%;
      background: #f5f5f5;
    }

    .material-sidenav {
      width: 260px;
      border-right: none;
      background: #ffffff;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .sidenav-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #f5f5f5;
    }

    .main-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
    }

    @media (max-width: 768px) {
      .main-content {
        padding: 16px;
      }
    }
  `],
})
export class LayoutComponent {
  sidenavOpened = signal(true);
}
