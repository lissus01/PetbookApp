import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { IonicModule, AlertController, ActionSheetController, ModalController } from '@ionic/angular';
import { Firestore, collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, FirestoreModule } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { authState } from 'rxfire/auth';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject, StorageModule } from '@angular/fire/storage';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { Subscription } from 'rxjs';

interface Pet {
  id?: string;
  name: string;
  nickname: string;
  age: number;
  breed: string;
  weight: number;
  chipId: string;
  photoUrl: string;
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
    private modalCtrl: ModalController
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
      this.selectedPhoto = pet.photoUrl;
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
        if (this.isEditing && this.selectedPhoto && this.selectedPhoto.includes('firebase')) {
          try {
            const oldImageRef = ref(this.storage, this.selectedPhoto);
            await deleteObject(oldImageRef);
          } catch (error) {
            console.error('Error deleting old image:', error);
          }
        }

        const response = await fetch(image.dataUrl);
        const blob = await response.blob();

        const fileName = `pets/${this.userUid}/${Date.now()}.${image.format}`;
        const storageRef = ref(this.storage, fileName);

        await uploadBytes(storageRef, blob);
        this.selectedPhoto = await getDownloadURL(storageRef);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
    }
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
