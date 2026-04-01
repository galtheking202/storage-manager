export type LoanType = 'permanent' | 'temporary';
export type AcquisitionStatus = 'pending' | 'approved' | 'return_pending';
export type UserRole = 'manager' | 'soldier';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface Item {
  id: string;
  name: string;
  totalAmount: number;
  available: number;
  category: string;
  notes: string;
}

export interface Acquisition {
  id: string;
  userId: string;
  itemId: string;
  itemName: string;
  amount: number;
  acquiredAt: string;
  createdAt: string;
  loanType: LoanType;
  missionName?: string;
  returnDate?: string;
  status: AcquisitionStatus;
}

export interface User {
  id: string;
  name: string;
  acquisitions: Acquisition[];
}
