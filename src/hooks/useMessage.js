import { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const useMessages = () => {
  const [messages, setMessages] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    });

    return () => unsubscribe();
  }, []);

  const uploadFile = async (file, path) => {
    const fileRef = ref(storage, path);
    const snapshot = await uploadBytes(fileRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  const sendMessage = async (messageData) => {
    try {
      setUploading(true);
      let processedMessageData = { ...messageData };

      // Handle image upload
      if (messageData.type === 'image' && messageData.image) {
        const timestamp = Date.now();
        const imagePath = `images/${messageData.uid}_${timestamp}_${messageData.image.name}`;
        const imageUrl = await uploadFile(messageData.image, imagePath);
        processedMessageData.imageUrl = imageUrl;
        delete processedMessageData.image; // Remove the file object
      }

      // Handle voice upload
      if (messageData.type === 'voice' && messageData.audio) {
        const timestamp = Date.now();
        const audioPath = `audio/${messageData.uid}_${timestamp}.wav`;
        const audioUrl = await uploadFile(messageData.audio, audioPath);
        processedMessageData.audioUrl = audioUrl;
        delete processedMessageData.audio; // Remove the blob object
      }

      // Add message to Firestore
      await addDoc(collection(db, "messages"), {
        ...processedMessageData,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { messages, sendMessage, uploading };
};