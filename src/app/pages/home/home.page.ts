import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonMenuButton, IonItem, IonList, IonMenu
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, personCircleOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonMenu, IonMenuButton, IonItem, IonList
  ]
})
export class HomePage implements OnInit {
  userEmail: string | null = null;
  userRole: string | null = null;
  userName: string | null = null;
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    addIcons({ logOutOutline, personCircleOutline });
  }

async ngOnInit() {
  const user = this.authService.getCurrentUser();
  if (user) {
    this.userEmail = user.email;
    
    const db = getFirestore();
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    this.userRole = userDoc.data()?.['role'] || null;
    this.userName = userDoc.data()?.['name'] || null;
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
