// species-breed-management.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { Firestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from '@angular/fire/firestore';

@Component({
  selector: 'app-species-breed-management',
  templateUrl: './species-breed-management.component.html',
  styleUrls: ['./species-breed-management.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})

export class SpeciesBreedManagementComponent {

  private firestore = inject(Firestore);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);

  species: any[] = [];
  newSpecies = '';
  newBreed = '';
  selectedSpecies = '';
  speciesError = '';
  breedError = '';
  successMessage = '';
  breeds: any[] = [];

  async ngOnInit() {
    await this.loadSpecies();
  }
  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color
    });
    await toast.present();
  }
  async loadData() {
    const loading = await this.loadingCtrl.create({
      message: 'Cargando datos...'
    });
    await loading.present();

    try {
      // Cargar especies y razas en paralelo
      await Promise.all([
        this.loadSpecies(),
        this.loadBreeds()
      ]);
    } finally {
      await loading.dismiss();
    }
  }

  async loadSpecies() {
    try {
      const speciesQuery = query(collection(this.firestore, 'species'));
      const querySnapshot = await getDocs(speciesQuery);

      this.species = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as any
      }));
    } catch (error) {
      console.error('Error loading species:', error);
      const toast = await this.toastCtrl.create({
        message: 'Error al cargar especies',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async addSpecies() {
    if (!this.newSpecies.trim()) {
      const toast = await this.toastCtrl.create({
        message: 'El nombre de la especie no puede estar vacío',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    try {
      // Deshabilitar el botón para evitar doble envío
      const loading = await this.loadingCtrl.create({
        message: 'Guardando...'
      });
      await loading.present();

      await addDoc(collection(this.firestore, 'species'), {
        name: this.newSpecies.trim()
      });

      // Limpiar y actualizar
      this.newSpecies = '';
      await this.loadSpecies();

      await loading.dismiss();
      const toast = await this.toastCtrl.create({
        message: 'Especie agregada correctamente',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Error adding species:', error);
      const toast = await this.toastCtrl.create({
        message: 'Error al agregar especie',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async addBreed() {
    this.breedError = '';
    if (!this.selectedSpecies) {
      this.breedError = 'Debes seleccionar una especie';
      return;
    }
    if (!this.newBreed.trim()) {
      this.breedError = 'El nombre de la raza es requerido';
      return;
    }
    if (!this.newBreed.trim() || !this.selectedSpecies) return;
    try {
      await addDoc(collection(this.firestore, 'breeds'), {
        name: this.newBreed.trim(),
        speciesId: this.selectedSpecies
      });
      this.newBreed = '';
    } catch (error) {
      console.error('Error adding breed:', error);
    }
  }

  async loadBreeds() {
    const loading = await this.loadingCtrl.create({
      message: 'Cargando razas...'
    });
    await loading.present();

    try {
      const breedsQuery = query(collection(this.firestore, 'breeds'));
      const querySnapshot = await getDocs(breedsQuery);

      this.breeds = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as any
      }));
    } catch (error) {
      console.error('Error loading breeds:', error);
      const toast = await this.toastCtrl.create({
        message: 'Error al cargar razas',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  closeModal() {
    this.modalCtrl.dismiss();
  }

async deleteSpecies(speciesId: string) {
  const alert = await this.alertCtrl.create({
    header: 'Confirmar',
    message: '¿Estás seguro de eliminar esta especie?',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel'
      },
      {
        text: 'Eliminar',
        handler: async () => {
          const loading = await this.loadingCtrl.create({
            message: 'Eliminando...'
          });
          await loading.present();
          
          try {
            // Eliminar razas asociadas
            await this.deleteBreedsBySpecies(speciesId);
            // Eliminar especie
            await deleteDoc(doc(this.firestore, 'species', speciesId));
            // Recargar datos
            await this.loadData();
            this.showToast('Especie eliminada correctamente');
          } catch (error) {
            console.error('Error deleting species:', error);
            this.showToast('Error al eliminar especie', 'danger');
          } finally {
            await loading.dismiss();
          }
        }
      }
    ]
  });
  await alert.present();
}

private async deleteBreedsBySpecies(speciesId: string) {
  const breedsQuery = query(
    collection(this.firestore, 'breeds'),
    where('speciesId', '==', speciesId)
  );
  const breedsSnapshot = await getDocs(breedsQuery);
  
  const deleteOperations = breedsSnapshot.docs.map(doc => 
    deleteDoc(doc.ref)
  );
  
  await Promise.all(deleteOperations);
}

}