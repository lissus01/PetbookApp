import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage } from '../../services/chat.service';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.page.html',
  styleUrls: ['./chatbot.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ChatbotPage implements OnInit {
  messages: ChatMessage[] = [];
  userInput: string = '';
  
  predefinedOptions = [
    {
      question: '¿Cuáles son sus horarios de atención?',
      answer: 'Nuestro horario de atención es de lunes a viernes de 9:00 AM a 6:00 PM.'
    },
    {
      question: '¿Cómo puedo contactarlos?',
      answer: 'Puede contactarnos a través de nuestro correo electrónico: contacto@ejemplo.com'
    },
    {
      question: '¿Atienden emergencias?',
      answer: 'Sí, contamos con servicio de emergencias las 24 horas. Para emergencias fuera del horario regular, por favor llamar al número de emergencias: 555-0000.'
    },
    {
      question: '¿Realizan esterilizaciones?',
      answer: 'Si, en caso de necesitar una cita veterinaria , ve a nuestra opcion de "agenda de citas "'
    },
    {
      question: '¿Qué vacunas necesita mi mascota?',
      answer: 'El esquema de vacunación depende de la edad y tipo de mascota. En la primera consulta realizaremos una evaluación y estableceremos el calendario de vacunación adecuado.'
    },
    {
      question: '¿Tienen servicio de peluquería?',
      answer: 'Sí, contamos con servicio completo de peluquería y spa para mascotas. Incluye baño, corte, cepillado y corte de uñas.'
    },
    {
      question: '¿Cuál es el costo de la consulta?',
      answer: 'La consulta general tiene un costo base de $30. Los precios pueden variar según el tipo de atención requerida.'
    },
  ];

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    // Suscribirse a los mensajes
    this.chatService.getMessages().subscribe(messages => {
      this.messages = messages;
    });
  }

  // Nueva función para manejar la selección de preguntas predefinidas
  async selectQuestion(question: string) {
    this.userInput = question;
    await this.sendMessage();
  }

  async sendMessage() {
    if (this.userInput.trim() === '') return;

    const userQuestion = this.userInput;
    this.userInput = ''; // Limpiar input inmediatamente

    // Agregar mensaje del usuario
    const userMessageSent = await this.chatService.addMessage({
      text: userQuestion,
      isUser: true
    });

    if (!userMessageSent) {
      console.error('No se pudo enviar el mensaje del usuario');
      this.userInput = userQuestion; // Restaurar el input si falló
      return;
    }

    // Buscar respuesta predefinida
    const response = this.findResponse(userQuestion);
    
    // Agregar respuesta del bot con delay
    setTimeout(async () => {
      const botMessageSent = await this.chatService.addMessage({
        text: response,
        isUser: false
      });
      
      if (!botMessageSent) {
        console.error('No se pudo enviar la respuesta del bot');
      }
    }, 1000);
  }

  // MÉTODO CORREGIDO - Varias opciones de búsqueda
  findResponse(input: string): string {
    const inputLower = input.toLowerCase().trim();
    
    // 1. Búsqueda exacta (recomendada para preguntas predefinidas)
    let option = this.predefinedOptions.find(opt => 
      opt.question.toLowerCase().trim() === inputLower
    );
    
    // 2. Si no encuentra exacta, busca si la pregunta predefinida contiene palabras del input
    if (!option) {
      option = this.predefinedOptions.find(opt => 
        opt.question.toLowerCase().includes(inputLower) || 
        inputLower.includes(opt.question.toLowerCase())
      );
    }
    
    // 3. Búsqueda por palabras clave si no encuentra nada
    if (!option) {
      option = this.findByKeywords(inputLower);
    }
    
    return option ? option.answer : 'Lo siento, no entiendo tu pregunta. ¿Podrías reformularla o seleccionar una de las opciones disponibles?';
  }

  // Método adicional para búsqueda por palabras clave
  private findByKeywords(input: string): any {
    const keywordMap = [
      { keywords: ['horario', 'horarios', 'atención', 'atienden'], index: 0 },
      { keywords: ['contacto', 'contactar', 'email', 'correo'], index: 1 },
      { keywords: ['emergencia', 'emergencias', 'urgencia'], index: 2 },
      { keywords: ['esterilización', 'esterilizaciones', 'castración'], index: 3 },
      { keywords: ['vacuna', 'vacunas', 'vacunación'], index: 4 },
      { keywords: ['peluquería', 'baño', 'corte', 'spa'], index: 5 },
      { keywords: ['costo', 'precio', 'consulta', 'cuánto'], index: 6 }
    ];

    for (const map of keywordMap) {
      if (map.keywords.some(keyword => input.includes(keyword))) {
        return this.predefinedOptions[map.index];
      }
    }
    
    return null;
  }
}