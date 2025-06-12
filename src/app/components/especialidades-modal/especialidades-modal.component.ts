import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, AlertController, ModalController,} from '@ionic/angular';
import { Firestore, collection, collectionData, addDoc, deleteDoc, doc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { close, add, trash, medical } from 'ionicons/icons';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-especialidades-modal',
  templateUrl: './especialidades-modal.component.html',
  styleUrls: ['./especialidades-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule,]
})
export class EspecialidadesModalComponent {
  private firestore: Firestore = inject(Firestore);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);
  private modalCtrl = inject(ModalController);

  especialidades: any[] = [];
  nuevaEspecialidad = {
    nombre: '',
    descripcion: ''
  };

  constructor() {
    addIcons({ close, add, trash, medical });
    this.cargarEspecialidades();
  }

  async cargarEspecialidades() {
    const especialidadesRef = collection(this.firestore, 'especialidades');
    collectionData(especialidadesRef, { idField: 'id' }).subscribe({
      next: (data) => {
        this.especialidades = data.sort((a, b) => a['nombre'].localeCompare(b['nombre']));
      },
      error: async (err) => {
        console.error('Error al cargar especialidades:', err);
        await this.mostrarToast('Error al cargar especialidades', 'danger');
      }
    });
  }

  async agregarEspecialidad() {
    if (!this.nuevaEspecialidad.nombre.trim()) {
      await this.mostrarToast('El nombre es requerido', 'warning');
      return;
    }

    try {
      const especialidadesRef = collection(this.firestore, 'especialidades');
      await addDoc(especialidadesRef, this.nuevaEspecialidad);
      this.nuevaEspecialidad = { nombre: '', descripcion: '' };
      await this.mostrarToast('Especialidad agregada correctamente', 'success');
    } catch (error) {
      console.error('Error al agregar especialidad:', error);
      await this.mostrarToast('Error al agregar especialidad', 'danger');
    }
  }

  async eliminarEspecialidad(id: string, nombre: string) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de eliminar la especialidad "${nombre}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          handler: async () => {
            try {
              const docRef = doc(this.firestore, `especialidades/${id}`);
              await deleteDoc(docRef);
              await this.mostrarToast('Especialidad eliminada', 'success');
            } catch (error) {
              console.error('Error al eliminar:', error);
              await this.mostrarToast('Error al eliminar especialidad', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  cerrarModal() {
    this.modalCtrl.dismiss();
  }

  private async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      color: color
    });
    await toast.present();
  }
}