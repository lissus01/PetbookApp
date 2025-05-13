import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [
    IonApp, 
    IonRouterOutlet, 
  ],
  providers: [
    // La inicialización de Firebase se realiza en la aplicación principal
  ]
})
export class AppComponent {
  constructor() {}
}