import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Fitness Club - фитнес и тренировки',
    loadComponent: () => import('./pages/home/home-page.component').then((m) => m.HomePageComponent)
  },
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'prices',
    title: 'Цены | Fitness Club',
    loadComponent: () => import('./pages/prices/prices-page.component').then((m) => m.PricesPageComponent)
  },
  {
    path: 'schedule',
    title: 'Расписание | Fitness Club',
    loadComponent: () =>
      import('./pages/schedule/schedule-page.component').then((m) => m.SchedulePageComponent)
  },
  {
    path: 'trainers',
    title: 'Тренеры | Fitness Club',
    loadComponent: () =>
      import('./pages/trainers/trainers-page.component').then((m) => m.TrainersPageComponent)
  },
  {
    path: 'contacts',
    title: 'Контакты | Fitness Club',
    loadComponent: () =>
      import('./pages/contacts/contacts-page.component').then((m) => m.ContactsPageComponent)
  },
  {
    path: 'login',
    title: 'Вход | Fitness Club',
    loadComponent: () => import('./pages/login/login-page.component').then((m) => m.LoginPageComponent)
  },
  {
    path: 'admin',
    title: 'Заявки | Fitness Club',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin-page.component').then((m) => m.AdminPageComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
