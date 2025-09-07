import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular/standalone';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, 
  IonCardHeader, IonCardTitle, IonCardContent, IonItem, 
  IonLabel, IonInput, IonButton, IonButtons, IonBackButton
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent, IonItem,
    IonLabel, IonInput, IonButton, IonButtons, IonBackButton
  ]
})
export class RegisterPage {
  registerForm: FormGroup;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private loadingController = inject(LoadingController);
  private alertController = inject(AlertController);
  private router = inject(Router);
  private firestore: Firestore = inject(Firestore);
  
  constructor() {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      role: ['owner'] // Rol por defecto
    }, { 
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (password === confirmPassword) {
      form.get('confirmPassword')?.setErrors(null);
      return null;
    } else {
      form.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
  }

  async register() {
    if (this.registerForm.valid) {
      const loading = await this.loadingController.create({
        message: 'Registrando usuario...',
      });
      await loading.present();

      try {
        const { email, password, name, role } = this.registerForm.value;
        
        // Registrar usuario en Firebase Auth
        const userCredential = await this.authService.register(email, password);
        const user = userCredential.user;
        
        // Guardar información adicional en Firestore
        const userDocRef = doc(this.firestore, `users/${user.uid}`);
        await setDoc(userDocRef, {
          uid: user.uid,
          name: name,
          email: email,
          role: role,
          createdAt: new Date()
        });

        loading.dismiss();
        
        const alert = await this.alertController.create({
          header: 'Registro exitoso',
          message: 'Tu cuenta ha sido creada con éxito. Ya puedes iniciar sesión.',
          buttons: [
            {
              text: 'Ir al login',
              handler: () => {
                this.router.navigate(['/login']);
              }
            }
          ]
        });
        await alert.present();
      } catch (error: any) {
        loading.dismiss();
        const alert = await this.alertController.create({
          header: 'Error de registro',
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

  goToLogin() {
    this.router.navigate(['/login']);
  }

  private getErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Este correo electrónico ya está registrado.';
      case 'auth/invalid-email':
        return 'El formato del correo electrónico es inválido.';
      case 'auth/weak-password':
        return 'La contraseña es demasiado débil.';
      default:
        return `Error: ${error.message}`;
    }
  }
}