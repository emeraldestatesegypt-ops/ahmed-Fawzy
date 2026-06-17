/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, getDocs, addDoc, setDoc, query, orderBy, limit } from 'firebase/firestore';

// Core Web App Config of Ahmed Fawzy
const firebaseConfig = {
  apiKey: "AIzaSyBZLN2jTTKV34SneGPoWRz1zoRpX5uODjs",
  authDomain: "sierra-blu.firebaseapp.com",
  projectId: "sierra-blu",
  storageBucket: "sierra-blu.firebasestorage.app",
  messagingSenderId: "941030513456",
  appId: "1:941030513456:web:56209a1495d69f217086f5",
  measurementId: "G-ZP054BPJ8Q"
};

// Protect initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// Check connections
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    // Attempt a light live server check to ensure authentication and schema alignment
    const testDoc = doc(db, 'system_test', 'connection');
    await getDocFromServer(testDoc);
    return true;
  } catch (error: any) {
    console.warn("Firestore live query status:", error?.message || error);
    // If it's a permission/not found, the connection itself is successful but denied/empty
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      return true; 
    }
    return false;
  }
}

// Firestore Error handler conformant to JSON specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
    },
    operationType,
    path
  };
  console.error('Firestore Hardened Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
