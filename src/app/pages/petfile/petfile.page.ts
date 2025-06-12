import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { IonicModule, AlertController, ActionSheetController, ModalController, ToastController } from '@ionic/angular';
import { Firestore, collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, FirestoreModule, collectionData } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { authState } from 'rxfire/auth';
import { Storage, ref, deleteObject, StorageModule } from '@angular/fire/storage';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { Subscription } from 'rxjs';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { SpeciesBreedManagementComponent } from 'src/app/components/species-breed-management/species-breed-management.component';
import { addIcons } from 'ionicons';
import { add, camera, close, create, paw, trash, } from 'ionicons/icons';
interface Pet {
  id?: string;
  name: string;
  nickname: string;
  age: number;
  species: string;
  breed: string;
  weight: number;
  chipId: string;
  photoLocalPath: string;
  photoUrl?: string;
  userId: string;
}
interface Species {
  id?: string;
  name: string;
}

interface Breed {
  id?: string;
  name: string;
  speciesId: string;
}

@Component({
  selector: 'app-petfile',
  templateUrl: './petfile.page.html',
  styleUrls: ['./petfile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, FirestoreModule, AngularFireStorageModule, StorageModule],
})
export class PetfilePage implements OnInit, OnDestroy {
  pets: Pet[] = [];
  userUid: string | null = null;
  petForm: FormGroup;
  isEditing = false;
  currentPetId: string | null = null;
  selectedPhoto: string | null = null;
  showPetDetail: boolean = false;
  selectedPet: Pet | null = null;
  species: Species[] = [];
  breeds: Breed[] = [];
  filteredBreeds: Breed[] = [];
  private authSub: Subscription | undefined;

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private storage: Storage,
    private formBuilder: FormBuilder,
    private alertCtrl: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    ) 
    {
    this.petForm = this.formBuilder.group({
      name: ['', Validators.required],
      nickname: [''],
      age: [0, [Validators.required, Validators.min(0), Validators.max(30)]],
      species: ['', Validators.required],
      breed: ['',],
      weight: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      chipId: ['', [Validators.required]]
      
    });
    addIcons({ paw, add, close,create, trash, camera});
    }

  ngOnInit() {
    this.authSub = authState(this.auth).subscribe(user => {
      if (user) {
        this.userUid = user.uid;
        this.loadSpecies();
        this.loadBreeds();
        this.loadPets();
      } else {
        this.userUid = null;
        this.pets = [];
        this.species = [];
        this.breeds = [];
      }

    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }

  async loadPets() {
    if (!this.userUid) return;
    try {
      const q = query(
        collection(this.firestore, 'pets'),
        where('userId', '==', this.userUid)
      );
      const querySnapshot = await getDocs(q);
      this.pets = [];
      querySnapshot.forEach((doc) => {
        this.pets.push({
          id: doc.id,
          ...doc.data() as Pet
        });
      });
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  }
  async loadSpecies() {
    try {
      const q = query(collection(this.firestore, 'species'));
      const querySnapshot = await getDocs(q);
      this.species = [];
      querySnapshot.forEach((doc) => {
        this.species.push({
          id: doc.id,
          ...doc.data() as Species
        });
      });
    } catch (error) {
      console.error('Error loading species:', error);
    }
  }

  async loadBreeds() {
    try {
      const q = query(collection(this.firestore, 'breeds'));
      const querySnapshot = await getDocs(q);
      this.breeds = [];
      querySnapshot.forEach((doc) => {
        this.breeds.push({
          id: doc.id,
          ...doc.data() as Breed
        });
      });
    } catch (error) {
      console.error('Error loading breeds:', error);
    }
  }
  async loadSpeciesAndBreeds() {
    try {
      const [speciesSnapshot, breedsSnapshot] = await Promise.all([
        getDocs(collection(this.firestore, 'species')),
        getDocs(collection(this.firestore, 'breeds'))
      ]);

      this.species = speciesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as any
      }));

      this.breeds = breedsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as any
      }));

      console.log('Datos actualizados:', {
        species: this.species,
        breeds: this.breeds
      });
    } catch (error) {
      console.error('Error loading data:', error);
      const toast = await this.toastCtrl.create({
        message: 'Error al cargar especies y razas',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  filterBreedsBySpecies(speciesId: string) {
    this.filteredBreeds = this.breeds.filter(breed => breed.speciesId === speciesId);
  }

  async openPetForm(pet: Pet | null = null) {
    await this.loadSpeciesAndBreeds();
    this.showPetDetail = false;
    if (pet) {
      this.isEditing = true;
      this.currentPetId = pet.id || null;
      this.petForm.setValue({
        name: pet.name,
        nickname: pet.nickname,
        age: pet.age,
        breed: pet.breed,
        weight: pet.weight,
        chipId: pet.chipId,
        species: pet.species,
      });
      this.filterBreedsBySpecies(pet.species);
      if (pet.photoUrl) {
        try {
          this.selectedPhoto = await this.loadLocalImage(pet.photoUrl);
        } catch (error) {
          console.error('Error loading pet image:', error);
          this.selectedPhoto = 'https://ionicframework.com/docs/img/demos/thumbnail.svg';
        }
      } else {
        this.selectedPhoto = 'https://ionicframework.com/docs/img/demos/thumbnail.svg';
      }
    } else {
      this.isEditing = false;
      this.currentPetId = null;
      this.petForm.reset({
        name: '',
        nickname: '',
        age: 0,
        species: '',
        breed: '',
        weight: 0,
        chipId: ''
      });
      this.filteredBreeds = [];
      this.selectedPhoto = null;
    }
    this.petForm.markAsDirty();
  }

  async submitForm() {
    if (!this.userUid || this.petForm.invalid) return;
    try {
      const petData: Record<string, any> = {
        ...this.petForm.value,
        userId: this.userUid,
        photoUrl: this.selectedPhoto || '',
        speciesName: this.species.find(s => s.id === this.petForm.value.species)?.name || '',
        breedName: this.breeds.find(b => b.id === this.petForm.value.breed)?.name || ''
      };

      if (this.isEditing && this.currentPetId) {
        await updateDoc(doc(this.firestore, 'pets', this.currentPetId), petData);
      } else {
        await addDoc(collection(this.firestore, 'pets'), petData);
      }

      this.petForm.reset();
      this.selectedPhoto = null;
      this.isEditing = false;
      this.currentPetId = null;
      await this.loadPets();
    } catch (error) {
      console.error('Error saving pet:', error);
    }
  }

  async takePicture() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Seleccionar imagen',
      buttons: [
        {
          text: 'Tomar foto',
          icon: 'camera',
          handler: () => {
            this.getPicture(CameraSource.Camera);
          }
        },
        {
          text: 'Elegir de la galería',
          icon: 'image',
          handler: () => {
            this.getPicture(CameraSource.Photos);
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async getPicture(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source
      });

      if (image.dataUrl) {
        this.selectedPhoto = image.dataUrl;
      }
    } catch (error) {
      console.error('Error taking picture:', error);
    }
  }

  private async loadLocalImage(path: string): Promise<string> {
    if (!path) return 'https://ionicframework.com/docs/img/demos/thumbnail.svg';

    if (path.startsWith('data:image')) {
      return path; // Ya es un data URL (para web)
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const file = await Filesystem.readFile({
          path: path,
          directory: Directory.Data
        });
        return `data:image/jpeg;base64,${file.data}`;
      } catch (error) {
        console.error('Error reading local image:', error);
        return 'https://ionicframework.com/docs/img/demos/thumbnail.svg';
      }
    } else {
      return path; // En web, debería ser un data URL
    }
  }
  viewPetDetail(pet: Pet) {
    this.selectedPet = pet;
    this.showPetDetail = true;
  }
  getSpeciesName(speciesId: string): string {
    const species = this.species.find(s => s.id === speciesId);
    return species ? species.name : 'Unknown';
  }
  getBreedName(BreedId: string): string {
    const breed = this.breeds.find(s => s.id === BreedId);
    return breed ? breed.name : 'Unknown';
  }

  closePetDetail() {
    this.showPetDetail = false;
    this.selectedPet = null;
  }

  async deletePet(pet: Pet) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que deseas eliminar a ${pet.name}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            if (pet.id) {
              try {
                if (pet.photoUrl && pet.photoUrl.includes('firebase')) {
                  try {
                    const imageRef = ref(this.storage, pet.photoUrl);
                    await deleteObject(imageRef);
                  } catch (error) {
                    console.error('Error deleting image:', error);
                  }
                }

                await deleteDoc(doc(this.firestore, 'pets', pet.id));
                this.loadPets();
                this.closePetDetail();
              } catch (error) {
                console.error('Error deleting pet:', error);
              }
            }
          }
        }
      ]
    });

    await alert.present();
  }
  async openSpeciesBreedManagement() {
    const modal = await this.modalCtrl.create({
      component: SpeciesBreedManagementComponent,
      componentProps: {
        species: this.species
      }
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.reload) {
      this.loadSpecies();
      this.loadBreeds();
    }
  }
}