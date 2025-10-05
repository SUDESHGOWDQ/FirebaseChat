import { useState, useCallback } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  doc,
  getDocs
} from 'firebase/firestore';

export const useFirestore = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addDocument = useCallback(async (collectionName, data) => {
    setLoading(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date()
      });
      return docRef;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDocument = useCallback(async (collectionName, docId, data) => {
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const subscribeToCollection = useCallback((
    collectionName, 
    queryConstraints = [], 
    callback
  ) => {
    const q = query(collection(db, collectionName), ...queryConstraints);
    return onSnapshot(q, callback, (error) => {
      console.error(`Error subscribing to ${collectionName}:`, error);
      setError(error.message);
    });
  }, []);

  const getDocuments = useCallback(async (collectionName, queryConstraints = []) => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, collectionName), ...queryConstraints);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    addDocument,
    updateDocument,
    subscribeToCollection,
    getDocuments
  };
};