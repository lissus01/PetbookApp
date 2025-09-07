import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, orderBy, limit, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  constructor(private firestore: Firestore) {}

  // Obtener mensajes
  getMessages(): Observable<ChatMessage[]> {
    const messagesRef = collection(this.firestore, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    return collectionData(q) as Observable<ChatMessage[]>;
  }

  // Agregar nuevo mensaje
  async addMessage(message: Omit<ChatMessage, 'timestamp'>) {
    const messagesRef = collection(this.firestore, 'messages');
    return addDoc(messagesRef, {
      ...message,
      timestamp: new Date()
    });
  }
}