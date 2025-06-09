import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { IonicModule, AlertController, ActionSheetController, ModalController,ToastController } from '@ionic/angular';
import { Firestore, collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, FirestoreModule } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { authState } from 'rxfire/auth';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject, StorageModule } from '@angular/fire/storage';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { Subscription } from 'rxjs';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

interface Pet {
  id?: string;
  name: string;
  nickname: string;
  age: number;
  breed: string;
  weight: number;
  chipId: string;
  photoLocalPath: string;
  photoUrl?: string;
  userId: string;
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
  ) {
    this.petForm = this.formBuilder.group({
      name: ['', Validators.required],
      nickname: [''],
      age: [0, [Validators.required, Validators.min(0), Validators.max(30)]],
      breed: ['', Validators.required],
      weight: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      chipId: ['']
    });
  }

  ngOnInit() {
    this.authSub = authState(this.auth).subscribe(user => {
      if (user) {
        this.userUid = user.uid;
        this.loadPets();
      } else {
        this.userUid = null;
        this.pets = [];
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

  async openPetForm(pet: Pet | null = null) {
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
        chipId: pet.chipId
      });
       if (pet.photoLocalPath) {
        try {
          this.selectedPhoto = await this.loadLocalImage(pet.photoLocalPath);
        } catch (error) {
          console.error('Error loading pet image:', error);
          this.selectedPhoto = 'assets/images/default-pet.png';
        }
      } else {
        this.selectedPhoto = 'assets/images/default-pet.png';
      }
    } else {
      this.isEditing = false;
      this.currentPetId = null;
      this.petForm.reset({
        name: '',
        nickname: '',
        age: 0,
        breed: '',
        weight: 0,
        chipId: ''
      });
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
        photoUrl: this.selectedPhoto || ''
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

  private async saveImageLocally(dataUrl: string | null): Promise<string> {
    if (!dataUrl || dataUrl.includes('assets/images/')) {
      return ''; // No guardar imágenes por defecto
    }

    try {
      const fileName = `pet_${Date.now()}.jpeg`;
      const base64Data = dataUrl.split(',')[1];

      if (Capacitor.isNativePlatform()) {
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Data,
          encoding: Encoding.UTF8 // Use the Encoding enum here
        });
        
        return savedFile.uri;
      } else {
        // En navegadores, guardamos el data URL completo
        return dataUrl;
      }
    } catch (error) {
      console.error('Error saving image locally:', error);
      throw error;
    }
}

  private async loadLocalImage(path: string): Promise<string> {
    if (!path) return 'assets/images/default-pet.png';
    
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
        return 'assets/images/default-pet.png';
      }
    } else {
      return path; // En web, debería ser un data URL
    }
  }

  private async deleteLocalImage(path: string): Promise<void> {
    if (!path || path.includes('assets/images/')) return;

    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.deleteFile({
          path: path,
          directory: Directory.Data
        });
      } catch (error) {
        console.error('Error deleting local image:', error);
      }
    }
    // En web no necesitamos hacer nada especial
  }


  viewPetDetail(pet: Pet) {
    this.selectedPet = pet;
    this.showPetDetail = true;
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
}