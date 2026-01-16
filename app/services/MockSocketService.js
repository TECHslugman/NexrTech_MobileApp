// services/MockSocketService.js
class MockSocketService {
  constructor() {
    this.mockConnected = false;
    this.listeners = new Map();
    this.currentUserId = null;
    
    // Mock data - NO userToken in constructor
    this.mockMessages = [
      {
        id: '1',
        name: 'John Doe',
        lastMessage: 'Hey, are we meeting tomorrow?',
        time: '10:30 AM',
        unread: 2,
        online: true,
      },
      {
        id: '2',
        name: 'Jane Smith',
        lastMessage: 'Thanks for the help yesterday!',
        time: 'Yesterday',
        unread: 0,
        online: false,
      },
      {
        id: '3',
        name: 'Robert Johnson',
        lastMessage: 'Can you send me the documents?',
        time: 'Monday',
        unread: 5,
        online: true,
      },
      {
        id: '4',
        name: 'Sarah Williams',
        lastMessage: 'The meeting is at 3 PM',
        time: 'Last week',
        unread: 0,
        online: true,
      },
    ];
  }

  connect(userId) {
    console.log(`📡 [MOCK] Connected with userId: ${userId}`);
    this.currentUserId = userId;
    this.mockConnected = true;
    
    // Store mock chat messages using the userId
    this.mockChatMessages = {
      '1': [
        {
          _id: '1',
          text: 'Hello there! How are you doing today?',
          createdAt: new Date(Date.now() - 3600000),
          user: { _id: '1', name: 'John Doe' },
        },
        {
          _id: '2',
          text: 'I\'m doing great! Just finished the project proposal.',
          createdAt: new Date(Date.now() - 1800000),
          user: { _id: userId, name: 'Me' },
        },
        {
          _id: '3',
          text: 'That\'s awesome! Can you share it with me?',
          createdAt: new Date(Date.now() - 900000),
          user: { _id: '1', name: 'John Doe' },
        },
      ],
      '2': [
        {
          _id: '1',
          text: 'Thanks for your help yesterday!',
          createdAt: new Date(Date.now() - 86400000),
          user: { _id: '2', name: 'Jane Smith' },
        },
        {
          _id: '2',
          text: 'No problem! Happy to help.',
          createdAt: new Date(Date.now() - 86300000),
          user: { _id: userId, name: 'Me' },
        },
      ]
    };
    
    // Simulate connection event
    setTimeout(() => {
      this.triggerEvent('connect');
    }, 500);
  }

  joinRoom(roomId) {
    console.log(`📡 [MOCK] Joined room: ${roomId}`);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    console.log(`📡 [MOCK] Emitted: ${event}`, data);
    
    // Simulate server responses
    if (event === 'send_message') {
      // Simulate message delivery after 500ms
      setTimeout(() => {
        const mockResponse = {
          ...data,
          _id: Date.now().toString(),
          createdAt: new Date(),
          user: { 
            _id: this.currentUserId, 
            name: 'Me' 
          }
        };
        this.triggerEvent('receive_message', mockResponse);
        
        // Also trigger new_message_alert for messages screen
        this.triggerEvent('new_message_alert', {
          senderId: this.currentUserId,
          receiverId: data.receiverId || data.roomId,
          text: data.text,
          senderName: 'Me',
        });
      }, 500);
    }
  }

  triggerEvent(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error in ${event} callback:`, err);
      }
    });
  }

  removeListener(event) {
    this.listeners.delete(event);
  }

  disconnect() {
    console.log('📡 [MOCK] Disconnected');
    this.mockConnected = false;
    this.currentUserId = null;
  }

  // Helper methods for mock data
  async fetchChatHistory() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.mockMessages);
      }, 800);
    });
  }

  async fetchMessages(agencyId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.mockChatMessages[agencyId] || []);
      }, 600);
    });
  }
}

export default new MockSocketService();