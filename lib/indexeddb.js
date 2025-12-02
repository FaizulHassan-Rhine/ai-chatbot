// IndexedDB utility for client-side database operations

const DB_NAME = 'ChatbotDB';
const DB_VERSION = 1;

// Database schema
const STORES = {
  chats: 'chats',
  messages: 'messages',
  knowledge: 'knowledge',
};

// Initialize database
export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create chats store
      if (!db.objectStoreNames.contains(STORES.chats)) {
        const chatsStore = db.createObjectStore(STORES.chats, { keyPath: 'id' });
        chatsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Create messages store
      if (!db.objectStoreNames.contains(STORES.messages)) {
        const messagesStore = db.createObjectStore(STORES.messages, { keyPath: 'id' });
        messagesStore.createIndex('chatId', 'chatId', { unique: false });
        messagesStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Create knowledge store
      if (!db.objectStoreNames.contains(STORES.knowledge)) {
        const knowledgeStore = db.createObjectStore(STORES.knowledge, { keyPath: 'id' });
        knowledgeStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

// Generic helper to get object store
async function getStore(storeName, mode = 'readonly') {
  const db = await initDB();
  const transaction = db.transaction([storeName], mode);
  return transaction.objectStore(storeName);
}

// Chat operations
export async function getAllChats() {
  try {
    const store = await getStore(STORES.chats);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const chats = request.result.sort((a, b) => 
          new Date(b.updatedAt) - new Date(a.updatedAt)
        );
        resolve(chats);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting chats:', error);
    return [];
  }
}

export async function getChatById(chatId) {
  try {
    const store = await getStore(STORES.chats);
    return new Promise((resolve, reject) => {
      const request = store.get(chatId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting chat:', error);
    return null;
  }
}

export async function createChat(title) {
  try {
    const store = await getStore(STORES.chats, 'readwrite');
    const chat = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title || 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return new Promise((resolve, reject) => {
      const request = store.add(chat);
      request.onsuccess = () => resolve(chat);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
}

export async function updateChat(chatId, updates) {
  try {
    const store = await getStore(STORES.chats, 'readwrite');
    return new Promise((resolve, reject) => {
      const getRequest = store.get(chatId);
      getRequest.onsuccess = () => {
        const chat = getRequest.result;
        if (!chat) {
          reject(new Error('Chat not found'));
          return;
        }
        const updated = { ...chat, ...updates, updatedAt: new Date().toISOString() };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve(updated);
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('Error updating chat:', error);
    throw error;
  }
}

export async function deleteChat(chatId) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction([STORES.chats, STORES.messages], 'readwrite');
      const chatsStore = transaction.objectStore(STORES.chats);
      const messagesStore = transaction.objectStore(STORES.messages);
      
      // Get all messages for this chat using index
      const index = messagesStore.index('chatId');
      const getRequest = index.getAll(chatId);
      
      getRequest.onsuccess = () => {
        const messages = getRequest.result;
        
        // Delete all messages
        let deleteCount = 0;
        const totalMessages = messages.length;
        
        if (totalMessages === 0) {
          // No messages, just delete the chat
          const deleteChatRequest = chatsStore.delete(chatId);
          deleteChatRequest.onsuccess = () => resolve();
          deleteChatRequest.onerror = () => reject(deleteChatRequest.error);
          return;
        }
        
        messages.forEach((message) => {
          const deleteRequest = messagesStore.delete(message.id);
          deleteRequest.onsuccess = () => {
            deleteCount++;
            if (deleteCount === totalMessages) {
              // All messages deleted, now delete the chat
              const deleteChatRequest = chatsStore.delete(chatId);
              deleteChatRequest.onsuccess = () => resolve();
              deleteChatRequest.onerror = () => reject(deleteChatRequest.error);
            }
          };
          deleteRequest.onerror = () => reject(deleteRequest.error);
        });
      };
      
      getRequest.onerror = () => reject(getRequest.error);
      
      transaction.onerror = () => reject(transaction.error);
    } catch (error) {
      console.error('Error deleting chat:', error);
      reject(error);
    }
  });
}

// Message operations
export async function getMessagesByChatId(chatId) {
  try {
    const store = await getStore(STORES.messages);
    return new Promise((resolve, reject) => {
      const request = store.index('chatId').getAll(chatId);
      request.onsuccess = () => {
        const messages = request.result.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
        resolve(messages);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
}

export async function createMessage(messageData) {
  try {
    const store = await getStore(STORES.messages, 'readwrite');
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: messageData.role,
      content: messageData.content || '',
      imageUrl: messageData.imageUrl || null,
      chatId: messageData.chatId,
      createdAt: new Date().toISOString(),
    };
    return new Promise((resolve, reject) => {
      const request = store.add(message);
      request.onsuccess = () => {
        // Update chat's updatedAt timestamp
        updateChat(messageData.chatId, {}).catch(console.error);
        resolve(message);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
}

// Knowledge operations
export async function getAllKnowledge() {
  try {
    const store = await getStore(STORES.knowledge);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const knowledge = request.result.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        resolve(knowledge);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting knowledge:', error);
    return [];
  }
}

export async function createKnowledge(title, content) {
  try {
    const store = await getStore(STORES.knowledge, 'readwrite');
    const knowledge = {
      id: `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return new Promise((resolve, reject) => {
      const request = store.add(knowledge);
      request.onsuccess = () => resolve(knowledge);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error creating knowledge:', error);
    throw error;
  }
}

export async function deleteKnowledge(knowledgeId) {
  try {
    const store = await getStore(STORES.knowledge, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(knowledgeId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error deleting knowledge:', error);
    throw error;
  }
}

export async function searchKnowledge(query) {
  try {
    const allKnowledge = await getAllKnowledge();
    const queryLower = query.toLowerCase();
    return allKnowledge.filter(
      (k) =>
        k.title.toLowerCase().includes(queryLower) ||
        k.content.toLowerCase().includes(queryLower)
    ).slice(0, 5);
  } catch (error) {
    console.error('Error searching knowledge:', error);
    return [];
  }
}

