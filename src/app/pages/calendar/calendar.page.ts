import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { Firestore, collection, addDoc, query, where, getDocs, FirestoreModule } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { LocalNotifications } from '@capacitor/local-notifications';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, FirestoreModule]
})
export class CalendarPage implements OnInit {
  currentDate: string = new Date().toISOString();
  selectedDate: string = new Date().toISOString();
  reminders: any[] = [];
  userUid: string | null = null;

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    // Verificar si el usuario está autenticado
    onAuthStateChanged(this.auth, (user) => { 
      if (user) {
        this.userUid = user.uid;
        this.loadReminders();
      } else {
        this.userUid = null;
        this.reminders = [];
      }
    });
  

    // Solicitar permiso para notificaciones
    this.requestNotificationPermission();
  }

  async requestNotificationPermission() {
    const permStatus = await LocalNotifications.requestPermissions();
    console.log('Notification permission status:', permStatus);
  }

  async loadReminders() {
    if (!this.userUid) return;
    
    try {
      const selectedDateStart = new Date(this.selectedDate);
      selectedDateStart.setHours(0, 0, 0, 0);
      
      const selectedDateEnd = new Date(this.selectedDate);
      selectedDateEnd.setHours(23, 59, 59, 999);
      
      const q = query(
        collection(this.firestore, 'reminders'),
        where('userId', '==', this.userUid),
        where('date', '>=', selectedDateStart),
        where('date', '<=', selectedDateEnd)
      );
      
      const querySnapshot = await getDocs(q);
      this.reminders = [];
      querySnapshot.forEach((doc) => {
        this.reminders.push({
          id: doc.id,
          ...doc.data()
        });
      });
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  }

  async addNewReminder() {
    const alert = await this.alertCtrl.create({
      header: 'Nuevo Recordatorio',
      inputs: [
        {
          name: 'title',
          type: 'text',
          placeholder: 'Título'
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Descripción'
        },
        {
          name: 'time',
          type: 'time',
          min: '00:00',
          max: '23:59'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!this.userUid) return;
            
            // Crear fecha con hora seleccionada
            const reminderDate = new Date(this.selectedDate);
            const [hours, minutes] = data.time.split(':');
            reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            try {
              // Guardar en Firebase
              const docRef = await addDoc(collection(this.firestore, 'reminders'), {
                userId: this.userUid,
                title: data.title,
                description: data.description,
                date: reminderDate,
                createdAt: new Date()
              });
              
              // Programar notificación
              await this.scheduleNotification(
                docRef.id,
                data.title,
                data.description,
                reminderDate
              );
              
              // Recargar recordatorios
              this.loadReminders();
            } catch (error) {
              console.error('Error saving reminder:', error);
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  async scheduleNotification(id: string, title: string, description: string, date: Date) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: parseInt(id.substring(0, 8), 16), // Convertir parte del ID de Firebase a entero
            title: title,
            body: description,
            schedule: { at: date },
            sound: 'default',
            actionTypeId: '',
            extra: { id }
          }
        ]
      });
      console.log('Notification scheduled for:', date);
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  onDateChange(event: any) {
    this.selectedDate = event.detail.value;
    this.loadReminders();
  }
}
