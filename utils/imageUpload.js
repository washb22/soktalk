import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadImage = async (uri, folder = 'images') => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, filename);
    
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('이미지 업로드 에러:', error);
    throw error;
  }
};