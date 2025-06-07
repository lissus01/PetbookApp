import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage)
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage),
 
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil.page').then(m => m.PerfilPage),
    canActivate: [authGuard],
    data:{role:'owner'}
  },
  {
    path: 'petfile',
    loadComponent: () => import('./pages/petfile/petfile.page').then(m => m.PetfilePage),
    canActivate: [authGuard],

  },
  {
    path: 'calendar',
    loadComponent: () => import('./pages/calendar/calendar.page').then(m => m.CalendarPage),
    canActivate: [authGuard],

  },
  {
    path: 'veterinarios',
    loadComponent: () => import('./pages/veterinarios/veterinarios.page').then( m => m.VeterinariosPage)
  },



  
  {
    path: '**',
    redirectTo: 'login'
  },
  

];
