import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular/standalone';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, 
  IonCardHeader, IonCardTitle, IonCardContent, IonItem, 
  IonLabel, IonInput, IonButton, IonButtons, IonBackButton,
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent, IonItem,
    IonLabel, IonInput, IonButton, IonButtons, IonBackButton,
  ]
})
export class LoginPage {
  loginForm: FormGroup;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private loadingController = inject(LoadingController);
  private alertController = inject(AlertController);
  private router = inject(Router);
  
  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async login() {
    if (this.loginForm.valid) {
      const loading = await this.loadingController.create({
        message: 'Iniciando sesión...',
      });
      await loading.present();

      try {
        const { email, password } = this.loginForm.value;
        await this.authService.login(email, password);
        loading.dismiss();
        this.router.navigate(['/home']); // Ajusta la ruta según tu aplicación
      } catch (error: any) {
        loading.dismiss();
        const alert = await this.alertController.create({
          header: 'Error de inicio de sesión',
          message: this.getErrorMessage(error),
          buttons: ['OK']
        });
        await alert.present();
      }
    } else {
      const alert = await this.alertController.create({
        header: 'Formulario inválido',
        message: 'Por favor, completa todos los campos correctamente.',
        buttons: ['OK']
        });
      await alert.present();
    }
  }

  async forgotPassword() {
    const alert = await this.alertController.create({
      header: 'Recuperar contraseña',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'Correo electrónico'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Enviar',
          handler: async (data) => {
            try {
              await this.authService.resetPassword(data.email);
              const successAlert = await this.alertController.create({
                header: 'Éxito',
                message: 'Se ha enviado un correo para restablecer tu contraseña.',
                buttons: ['OK']
              });
              await successAlert.present();
            } catch (error) {
              const errorAlert = await this.alertController.create({
                header: 'Error',
                message: 'No se pudo enviar el correo de recuperación.',
                buttons: ['OK']
              });
              await errorAlert.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  private getErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Correo o contraseña incorrectos.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos. Intenta más tarde.';
      default:
        return 'Ocurrió un error al iniciar sesión.';
    }
  }
}