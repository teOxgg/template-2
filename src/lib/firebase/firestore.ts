import { db } from "./firebase";
import { collection, query, where, orderBy, addDoc, getDocs, doc, updateDoc, getDoc, Timestamp } from "firebase/firestore";
import { Message } from "ai";

export interface ChatThread {
  id: string;
  userId: string;
  title: string;
  label: string;
  lastMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredMessage extends Message {
  threadId: string;
  createdAt: Date;
}

function getFirstFourWords(text: string): string {
  const words = text.trim().split(/\s+/);
  return words.slice(0, 4).join(" ");
}

async function generateThreadTitle(userMessage: string, aiResponse: string): Promise<string> {
  try {
    const response = await fetch("/api/generate-title", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userMessage, aiResponse }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate title");
    }

    const title = await response.text();
    return title.trim();
  } catch (error) {
    console.error("Error generating title:", error);
    return userMessage.slice(0, 50) + "..."; // Fallback to truncated user message
  }
}

// Create an empty thread with just "New Thread" label
export const createEmptyThread = async (userId: string) => {
  try {
    const now = new Date();
    const threadsRef = collection(db, "threads");
    const threadDoc = await addDoc(threadsRef, {
      userId,
      title: "New Thread",
      label: "New Thread",
      lastMessage: "",
      createdAt: now,
      updatedAt: now,
    });
    
    return threadDoc.id;
  } catch (error) {
    console.error("Error creating empty thread:", error);
    throw error;
  }
};

export const addFirstMessage = async (threadId: string, userMessage: Message, aiResponse: Message) => {
  try {
    const now = new Date();
    const messagesRef = collection(db, "messages");
    const threadRef = doc(db, "threads", threadId);

    // Add user message
    await addDoc(messagesRef, {
      ...userMessage,
      threadId,
      createdAt: now,
    });

    // Add AI response with a slight delay in timestamp
    const aiMessageTime = new Date(now.getTime() + 1000);
    await addDoc(messagesRef, {
      ...aiResponse,
      threadId,
      createdAt: aiMessageTime,
    });

    // Update thread with title and label based on AI response
    const label = getFirstFourWords(aiResponse.content);
    const title = userMessage.content.slice(0, 50) + "...";

    await updateDoc(threadRef, {
      title,
      label,
      lastMessage: aiResponse.content,
      updatedAt: aiMessageTime,
    });
  } catch (error) {
    console.error("Error adding first message:", error);
    throw error;
  }
};

export const addMessageToThread = async (threadId: string, message: Message) => {
  try {
    const now = new Date();
    const messagesRef = collection(db, "messages");
    await addDoc(messagesRef, {
      ...message,
      threadId,
      createdAt: now,
    });

    const threadRef = doc(db, "threads", threadId);
    await updateDoc(threadRef, {
      lastMessage: message.content,
      updatedAt: now,
    });
  } catch (error) {
    console.error("Error adding message to thread:", error);
    throw error;
  }
};

export const getUserThreads = async (userId: string) => {
  try {
    const threadsRef = collection(db, "threads");
    const q = query(
      threadsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ChatThread[];
  } catch (error) {
    console.error("Error getting user threads:", error);
    throw error;
  }
};

export const getThreadMessages = async (threadId: string) => {
  try {
    const messagesRef = collection(db, "messages");
    const q = query(
      messagesRef,
      where("threadId", "==", threadId),
      orderBy("createdAt", "asc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate(),
      } as StoredMessage;
    });
  } catch (error) {
    console.error("Error getting thread messages:", error);
    throw error;
  }
};

// Function to update existing threads with labels
export const updateExistingThreadLabels = async (userId: string) => {
  try {
    const threads = await getUserThreads(userId);
    
    for (const thread of threads) {
      // Get the first AI message for this thread
      const messages = await getThreadMessages(thread.id);
      const firstAiMessage = messages.find(m => m.role === "assistant");
      
      if (firstAiMessage && thread.label !== getFirstFourWords(firstAiMessage.content)) {
        await updateThreadLabel(thread.id, getFirstFourWords(firstAiMessage.content));
      }
    }
  } catch (error) {
    console.error("Error updating existing thread labels:", error);
    throw error;
  }
};

export const updateThreadLabel = async (threadId: string, newLabel: string) => {
  try {
    const threadRef = doc(db, "threads", threadId);
    await updateDoc(threadRef, {
      label: newLabel,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating thread label:", error);
    throw error;
  }
}; 