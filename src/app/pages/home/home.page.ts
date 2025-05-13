import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButtons, IonButton, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, IonIcon, IonMenu, IonMenuButton , IonItem, IonList
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, personCircleOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,RouterModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonButton, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonIcon, IonMenu, IonMenuButton, IonItem, IonList
  ]
})
export class HomePage implements OnInit {
  userEmail: string | null = null;
  
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    addIcons({ logOutOutline, personCircleOutline });
  }

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userEmail = user.email;
    }
  }

  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }
}
