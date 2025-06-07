import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { Firestore, collection, collectionData, doc, addDoc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { FormsModule } from '@angular/forms';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';



@Component({
  selector: 'app-veterinarios',
  templateUrl: './veterinarios.page.html',
  styleUrls: ['./veterinarios.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule,]
})
export class VeterinariosPage {
  constructor(private alertController: AlertController, private toastController: ToastController, private loadingController: LoadingController) {
    this.loadVeterinarios();
  }
  private firestore: Firestore = inject(Firestore);
  private storage: Storage = inject(Storage);
  isModalOpen = false;
  showActionSheet = false;

  veterinarios: any[] = [];
  nuevoVeterinario: any = {
    nombre: '',
    especialidad: '',
    foto: '',
    diasLaborales: [],
    disponible: true
  };
  editMode = false;
  editingId: string | null = null;
  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  async loadVeterinarios() {
    const veterinariosRef = collection(this.firestore, 'veterinarios');
    collectionData(veterinariosRef, { idField: 'id' }).subscribe((data) => {
      this.veterinarios = data;
    });
  }

  async agregarVeterinario() {
    const veterinariosRef = collection(this.firestore, 'veterinarios');
    await addDoc(veterinariosRef, this.nuevoVeterinario);
    this.resetForm();
    this.isModalOpen = false;
  }

  async actualizarVeterinario() {
    if (!this.editingId) return;

    const veterinarioRef = doc(this.firestore, 'veterinarios', this.editingId);
    await updateDoc(veterinarioRef, this.nuevoVeterinario);

    this.resetForm();
    this.isModalOpen = false;
  }

  async eliminarVeterinario(id: string) {
    try {
      const veterinarioRef = doc(this.firestore, 'veterinarios', id);
      await deleteDoc(veterinarioRef);

      const toast = await this.toastController.create({
        message: 'Veterinario eliminado correctamente',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Error al eliminar veterinario:', error);
      const toast = await this.toastController.create({
        message: 'Error al eliminar veterinario',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async confirmarEliminacion(veterinario: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de eliminar a ${veterinario.nombre}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          handler: async () => {
            await this.eliminarVeterinario(veterinario.id);
          }
        }
      ]
    });

    await alert.present();
  }
  editarVeterinario(veterinario: any) {
    this.editMode = true;
    this.editingId = veterinario.id;
    this.nuevoVeterinario = { ...veterinario };
  }

  resetForm() {
    this.nuevoVeterinario = {
      nombre: '',
      especialidad: '',
      foto: '',
      diasLaborales: [],
      disponible: true
    };
    this.editMode = false;
    this.editingId = null;
  }

  toggleDiaLaboral(dia: string) {
    const index = this.nuevoVeterinario.diasLaborales.indexOf(dia);
    if (index > -1) {
      this.nuevoVeterinario.diasLaborales.splice(index, 1);
    } else {
      this.nuevoVeterinario.diasLaborales.push(dia);
    }
  }
  // Botones para el action sheet de fotos
  actionSheetButtons = [
    {
      text: 'Tomar foto',
      icon: 'camera',
      handler: () => this.tomarFoto(CameraSource.Camera)
    },
    {
      text: 'Elegir de galería',
      icon: 'image',
      handler: () => this.tomarFoto(CameraSource.Photos)
    },
    {
      text: 'Cancelar',
      icon: 'close',
      role: 'cancel'
    }
  ];

  // Métodos para controlar el modal
  abrirModalCreacion() {
    this.resetForm();
    this.isModalOpen = true;
  }

  abrirModalEdicion(veterinario: any) {
    this.editMode = true;
    this.editingId = veterinario.id;
    this.nuevoVeterinario = {
      ...veterinario,
      diasLaborales: this.convertirArrayDias(veterinario.diasLaborales)
    };
    this.isModalOpen = true;
  }

  cerrarModal() {
    this.isModalOpen = false;
    this.resetForm();
  }

  // Convertir array de días a objeto para los checkboxes
  private convertirArrayDias(diasArray: string[]): any {
    const diasObj: any = {};
    this.diasSemana.forEach(dia => {
      diasObj[dia] = diasArray.includes(dia);
    });
    return diasObj;
  }

  // Convertir objeto de días a array para Firestore
  private convertirObjetoDias(diasObj: any): string[] {
    return this.diasSemana.filter(dia => diasObj[dia]);
  }

  // Método para seleccionar fuente de foto
  seleccionarFuenteFoto() {
    this.showActionSheet = true;
  }

  async actualizarDisponibilidad(id: string, disponible: boolean) {
    const veterinarioRef = doc(this.firestore, 'veterinarios', id);
    await updateDoc(veterinarioRef, { disponible });
  }
  async tomarFoto(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: source
      });

      if (image.base64String) {
        // Guardar la imagen localmente
        const savedFile = await this.guardarImagenLocalmente(image.base64String);
        this.nuevoVeterinario.foto = savedFile.webPath;
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
      const toast = await this.toastController.create({
        message: 'Error al capturar la imagen',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  private async guardarImagenLocalmente(base64Data: string): Promise<any> {
    const fileName = `vet_${new Date().getTime()}.jpeg`;

    if (Capacitor.isNativePlatform()) {
      // Para dispositivos móviles
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data
      });

      return {
        filepath: savedFile.uri,
        webPath: Capacitor.convertFileSrc(savedFile.uri)
      };
    } else {
      // Para navegadores web
      return {
        filepath: fileName,
        webPath: `data:image/jpeg;base64,${base64Data}`
      };
    }
  }

  // Método para cargar una imagen guardada
  async cargarImagen(filePath: string): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      const file = await Filesystem.readFile({
        path: filePath,
        directory: Directory.Data
      });
      return `data:image/jpeg;base64,${file.data}`;
    } else {
      return filePath; // Ya es un data URL en web
    }
  }
}