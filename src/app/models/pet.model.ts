export interface Pet {
    id?: string;
    userId: string;
    name: string;
    photoURL?: string;
    weight?: number;
    age?: number;
    birthDate?: string;
    breed?: string;
    color?: string;
    chipCode?: string;
    allergies?: string;
    additionalInfo?: string;
    createdAt: number;
    updatedAt: number;
  }