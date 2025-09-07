import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { Firestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from '@angular/fire/firestore';
import { addIcons } from 'ionicons';
import { add, camera, close, create, paw, trash, } from 'ionicons/icons';
import { SpeciesBreedManagementComponent } from 'src/app/components/species-breed-management/species-breed-management.component';

@Component({

  selector: 'app-gestion-mascota',
  templateUrl: './gestion-mascota.page.html',
  styleUrls: ['./gestion-mascota.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]

})
export class GestionMascotaPage {
  constructor(



  ) {

    addIcons({ paw, add, close, create, trash, camera });

  }

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

    const loading = await this.loadingCtrl.create({
      message: 'Cargando especies...'
    });
    await loading.present();

    try {
      const speciesQuery = query(collection(this.firestore, 'species'));
      const querySnapshot = await getDocs(speciesQuery);

      this.species = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as any
      }));
    } catch (error) {
      console.error('Error loading species:', error);
      await this.showToast('Error al cargar especies', 'danger');
    } finally {
      await loading.dismiss();
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

  private async showToast(message: string, color: string = 'success') {

    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color
    });
    await toast.present();

  }

  async openSpeciesBreedManagement() {

    const modal = await this.modalCtrl.create({
      component: SpeciesBreedManagementComponent,
      componentProps: {
        species: this.species
      }
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    await this.loadSpecies();
    await this.loadBreeds();

  }

  closeModal() {

    this.modalCtrl.dismiss();

  }

}
