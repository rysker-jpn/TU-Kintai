/**
 * ユーザーモデル
 */

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'member';
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface FirebaseAuthUser {
  uid: string;
  email: string;
  displayName: string;
}

export interface UserCreateInput {
  uid: string;
  email: string;
  displayName: string;
  role?: 'admin' | 'member';
  status?: 'active' | 'suspended';
}

export interface UserUpdateInput {
  displayName?: string;
  role?: 'admin' | 'member';
  status?: 'active' | 'suspended';
}
