import { create } from 'zustand';
import type { Item, User, Acquisition, LoanType, AuthUser, PendingUser } from './types';
import { api } from './api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface StoreState {
  auth: { user: AuthUser; token: string } | null;
  items: Item[];
  users: User[];
  currentUser: User | null;

  pendingUsers: PendingUser[];

  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (name: string, email: string, password: string) => Promise<void>;
  fetchItems: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchCurrentUserData: () => Promise<void>;
  fetchPendingUsers: () => Promise<void>;
  approveUser: (userId: number) => Promise<void>;
  rejectUser: (userId: number) => Promise<void>;

  addItem: (name: string, amount: number, category: string, notes: string) => void;
  updateItemAmount: (id: string, delta: number) => void;
  updateItemNotes: (id: string, notes: string) => void;
  deleteItem: (id: string) => void;
  requestAcquireItem: (
    userId: string,
    itemId: string,
    amount: number,
    loanType: LoanType,
    missionName?: string,
    returnDate?: string
  ) => boolean;
  approveAcquisition: (userId: string, acquisitionId: string) => void;
  requestReturn: (userId: string, acquisitionId: string) => void;
  approveReturn: (userId: string, acquisitionId: string) => void;
  setCurrentUser: (user: User | null) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeItem(item: any): Item {
  return {
    id: String(item.id),
    name: item.name,
    totalAmount: item.totalAmount,
    available: item.available,
    category: item.category,
    notes: item.notes ?? '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeAcquisition(a: any): Acquisition {
  return {
    id: String(a.id),
    userId: String(a.userId),
    itemId: String(a.itemId),
    itemName: a.item?.name ?? a.itemName ?? '',
    amount: a.amount,
    acquiredAt: String(a.acquiredAt).split('T')[0],
    createdAt: a.createdAt,
    loanType: a.loanType as LoanType,
    missionName: a.missionName ?? undefined,
    returnDate: a.returnDate ? String(a.returnDate).split('T')[0] : undefined,
    status: a.status,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeUser(u: any): User {
  return {
    id: String(u.id),
    name: u.name,
    acquisitions: (u.acquisitions ?? []).map(normalizeAcquisition),
  };
}

function mapAcqs(
  users: User[],
  userId: string,
  fn: (acqs: Acquisition[]) => Acquisition[]
): User[] {
  return users.map((u) => (u.id === userId ? { ...u, acquisitions: fn(u.acquisitions) } : u));
}

export const useStore = create<StoreState>((set, get) => ({
  auth: null,
  items: [],
  users: [],
  currentUser: null,
  pendingUsers: [],

  initAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const user = await api.get<AuthUser>('/api/auth/me');
      set({ auth: { user, token } });
      const { fetchItems, fetchUsers, fetchCurrentUserData } = get();
      if (user.role === 'manager') {
        await Promise.all([fetchItems(), fetchUsers(), fetchPendingUsers()]);
      } else {
        await Promise.all([fetchItems(), fetchCurrentUserData()]);
      }
    } catch {
      localStorage.removeItem('token');
    }
  },

  login: async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'שגיאת התחברות' }));
      throw new Error((err as { error?: string }).error ?? 'שגיאת התחברות');
    }
    const { token, user } = (await res.json()) as { token: string; user: AuthUser };
    localStorage.setItem('token', token);
    set({ auth: { user, token } });
    const { fetchItems, fetchUsers, fetchCurrentUserData, fetchPendingUsers } = get();
    if (user.role === 'manager') {
      await Promise.all([fetchItems(), fetchUsers(), fetchPendingUsers()]);
    } else {
      await Promise.all([fetchItems(), fetchCurrentUserData()]);
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ auth: null, currentUser: null, users: [], items: [], pendingUsers: [] });
  },

  signup: async (name, email, password) => {
    const res = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'שגיאה בהרשמה' }));
      throw new Error((err as { error?: string }).error ?? 'שגיאה בהרשמה');
    }
  },

  fetchItems: async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = await api.get<any[]>('/api/items');
    set({ items: items.map(normalizeItem) });
  },

  fetchUsers: async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users = await api.get<any[]>('/api/users');
    set({ users: users.map(normalizeUser) });
  },

  fetchPendingUsers: async () => {
    const users = await api.get<PendingUser[]>('/api/users/pending');
    set({ pendingUsers: users });
  },

  approveUser: async (userId) => {
    set((s) => ({ pendingUsers: s.pendingUsers.filter((u) => u.id !== userId) }));
    await api.patch(`/api/users/${userId}/approve`, {});
  },

  rejectUser: async (userId) => {
    set((s) => ({ pendingUsers: s.pendingUsers.filter((u) => u.id !== userId) }));
    await api.delete(`/api/users/${userId}`);
  },

  fetchCurrentUserData: async () => {
    const { auth } = get();
    if (!auth) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const acquisitions = await api.get<any[]>('/api/acquisitions');
    const currentUser: User = {
      id: String(auth.user.id),
      name: auth.user.name,
      acquisitions: acquisitions.map(normalizeAcquisition),
    };
    set({ currentUser });
  },

  addItem: (name, amount, category, notes) => {
    api
      .post('/api/items', { name, category, totalAmount: amount, notes })
      .then(() => get().fetchItems())
      .catch(() => get().fetchItems());
  },

  updateItemAmount: (id, delta) => {
    set((s) => ({
      items: s.items.map((item) =>
        item.id === id
          ? {
              ...item,
              totalAmount: Math.max(0, item.totalAmount + delta),
              available: Math.max(0, item.available + delta),
            }
          : item
      ),
    }));
    const updated = get().items.find((i) => i.id === id);
    if (updated) {
      api
        .patch(`/api/items/${id}`, { totalAmount: updated.totalAmount, available: updated.available })
        .catch(() => get().fetchItems());
    }
  },

  updateItemNotes: (id, notes) => {
    set((s) => ({ items: s.items.map((item) => (item.id === id ? { ...item, notes } : item)) }));
    api.patch(`/api/items/${id}`, { notes }).catch(() => get().fetchItems());
  },

  deleteItem: (id) => {
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    api.delete(`/api/items/${id}`).catch(() => get().fetchItems());
  },

  requestAcquireItem: (userId, itemId, amount, loanType, missionName, returnDate) => {
    const { items } = get();
    const item = items.find((i) => i.id === itemId);
    if (!item || item.available < amount) return false;

    const tempAcq: Acquisition = {
      id: `temp-${Date.now()}`,
      userId,
      itemId,
      itemName: item.name,
      amount,
      acquiredAt: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      loanType,
      missionName,
      returnDate,
      status: 'pending',
    };

    set((s) => {
      const newUsers = mapAcqs(s.users, userId, (acqs) => [...acqs, tempAcq]);
      return {
        items: s.items.map((i) =>
          i.id === itemId ? { ...i, available: i.available - amount } : i
        ),
        users: newUsers,
        currentUser:
          s.currentUser?.id === userId
            ? { ...s.currentUser, acquisitions: [...s.currentUser.acquisitions, tempAcq] }
            : s.currentUser,
      };
    });

    api
      .post('/api/acquisitions', {
        itemId: parseInt(itemId),
        amount,
        loanType,
        missionName,
        returnDate,
      })
      .then(() => get().fetchCurrentUserData())
      .catch(() => {
        get().fetchCurrentUserData();
        get().fetchItems();
      });

    return true;
  },

  approveAcquisition: (userId, acquisitionId) => {
    set((s) => {
      const approve = (acqs: Acquisition[]) =>
        acqs.map((a) => (a.id === acquisitionId ? { ...a, status: 'approved' as const } : a));
      return {
        users: mapAcqs(s.users, userId, approve),
        currentUser:
          s.currentUser?.id === userId
            ? { ...s.currentUser, acquisitions: approve(s.currentUser.acquisitions) }
            : s.currentUser,
      };
    });
    api
      .patch(`/api/acquisitions/${acquisitionId}`, { status: 'approved' })
      .catch(() => get().fetchUsers());
  },

  requestReturn: (userId, acquisitionId) => {
    set((s) => {
      const markReturn = (acqs: Acquisition[]) =>
        acqs.map((a) =>
          a.id === acquisitionId ? { ...a, status: 'return_pending' as const } : a
        );
      return {
        users: mapAcqs(s.users, userId, markReturn),
        currentUser:
          s.currentUser?.id === userId
            ? { ...s.currentUser, acquisitions: markReturn(s.currentUser.acquisitions) }
            : s.currentUser,
      };
    });
    api
      .patch(`/api/acquisitions/${acquisitionId}`, { status: 'return_pending' })
      .catch(() => get().fetchCurrentUserData());
  },

  approveReturn: (userId, acquisitionId) => {
    const { users } = get();
    const acq = users
      .find((u) => u.id === userId)
      ?.acquisitions.find((a) => a.id === acquisitionId);
    if (!acq) return;

    set((s) => ({
      items: s.items.map((i) =>
        i.id === acq.itemId ? { ...i, available: i.available + acq.amount } : i
      ),
      users: mapAcqs(s.users, userId, (acqs) => acqs.filter((a) => a.id !== acquisitionId)),
      currentUser:
        s.currentUser?.id === userId
          ? {
              ...s.currentUser,
              acquisitions: s.currentUser.acquisitions.filter((a) => a.id !== acquisitionId),
            }
          : s.currentUser,
    }));
    api
      .patch(`/api/acquisitions/${acquisitionId}`, { status: 'completed' })
      .catch(() => get().fetchUsers());
  },

  setCurrentUser: (user) => set({ currentUser: user }),
}));
