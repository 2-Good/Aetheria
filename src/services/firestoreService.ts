import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Conversation, ChatMessage, UserPreferences, UserProfile } from '../types';

/**
 * Save or update user profile and preferences in Firestore
 */
export async function syncUserProfileToFirestore(
  profile: UserProfile,
  preferences: UserPreferences
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const path = `users/${currentUser.uid}`;
  try {
    await setDoc(
      doc(db, 'users', currentUser.uid),
      {
        uid: currentUser.uid,
        name: profile.name,
        email: currentUser.email || '',
        avatarSeed: profile.avatarSeed || profile.name.slice(0, 2).toUpperCase(),
        updatedAt: new Date().toISOString(),
        createdAt: new Date(profile.joinedAt).toISOString(),
        preferences,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save or update a conversation in Firestore
 */
export async function syncConversationToFirestore(conversation: Conversation): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const path = `conversations/${conversation.id}`;
  try {
    await setDoc(
      doc(db, 'conversations', conversation.id),
      {
        id: conversation.id,
        userId: currentUser.uid,
        title: conversation.title,
        preview: conversation.preview,
        isPinned: conversation.isPinned ?? false,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      { merge: true }
    );

    // Sync latest messages for this conversation
    if (conversation.messages.length > 0) {
      const batch = writeBatch(db);
      for (const msg of conversation.messages) {
        const msgRef = doc(db, 'conversations', conversation.id, 'messages', msg.id);
        batch.set(
          msgRef,
          {
            id: msg.id,
            conversationId: conversation.id,
            userId: currentUser.uid,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            model: msg.model || 'Aetheria Optical 2.5',
            createdAt: Date.now(),
          },
          { merge: true }
        );
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a conversation and its messages from Firestore
 */
export async function deleteConversationFromFirestore(conversationId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const path = `conversations/${conversationId}`;
  try {
    // Delete subcollection messages first
    const messagesSnapshot = await getDocs(
      collection(db, 'conversations', conversationId, 'messages')
    );
    const batch = writeBatch(db);
    messagesSnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    batch.delete(doc(db, 'conversations', conversationId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Real-time listener for current user's conversations
 */
export function subscribeToUserConversations(
  onUpdate: (conversations: Conversation[]) => void
): () => void {
  const currentUser = auth.currentUser;
  if (!currentUser) return () => {};

  const path = 'conversations';
  const q = query(collection(db, 'conversations'), where('userId', '==', currentUser.uid));

  const unsubscribe = onSnapshot(
    q,
    async (snapshot) => {
      const convList: Conversation[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        // Fetch messages for each conversation
        const msgsSnap = await getDocs(
          collection(db, 'conversations', docSnap.id, 'messages')
        );
        const messages: ChatMessage[] = [];
        msgsSnap.forEach((mSnap) => {
          const mData = mSnap.data();
          messages.push({
            id: mData.id,
            role: mData.role,
            content: mData.content,
            timestamp: mData.timestamp,
            model: mData.model,
          });
        });

        // Sort messages chronologically
        messages.sort((a, b) => a.id.localeCompare(b.id));

        convList.push({
          id: data.id,
          title: data.title,
          preview: data.preview,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          isPinned: data.isPinned ?? false,
          messages,
        });
      }

      // Sort by updatedAt descending
      convList.sort((a, b) => b.updatedAt - a.updatedAt);
      onUpdate(convList);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );

  return unsubscribe;
}
