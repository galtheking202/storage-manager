import type { Item, User } from './types';

export const mockItems: Item[] = [
  { id: '1', name: 'רובה M16', totalAmount: 10, available: 7, category: 'נשק', notes: '' },
  { id: '2', name: 'מגן קיסרי', totalAmount: 15, available: 13, category: 'ציוד מגן', notes: '' },
  { id: '3', name: 'אפוד קרבי', totalAmount: 20, available: 18, category: 'ציוד מגן', notes: 'לבדוק תקינות לפני הוצאה' },
  { id: '4', name: 'קסדה', totalAmount: 8, available: 5, category: 'ציוד מגן', notes: '' },
  { id: '5', name: 'פנס טקטי', totalAmount: 6, available: 4, category: 'ציוד שדה', notes: '' },
  { id: '6', name: 'ציוד תקשורת', totalAmount: 12, available: 9, category: 'אלקטרוניקה', notes: 'לטעון לפני שימוש' },
];

export const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'אלי כהן',
    acquisitions: [
      {
        id: 'a1', userId: 'u1', itemId: '1', itemName: 'רובה M16',
        amount: 1, acquiredAt: '2026-03-10', loanType: 'permanent', status: 'approved',
      },
      {
        id: 'a2', userId: 'u1', itemId: '3', itemName: 'אפוד קרבי',
        amount: 1, acquiredAt: '2026-03-15', loanType: 'temporary',
        missionName: 'אימון לילה', returnDate: '2026-04-15', status: 'approved',
      },
    ],
  },
  {
    id: 'u2',
    name: 'דני לוי',
    acquisitions: [
      {
        id: 'a3', userId: 'u2', itemId: '2', itemName: 'מגן קיסרי',
        amount: 2, acquiredAt: '2026-03-12', loanType: 'permanent', status: 'pending',
      },
    ],
  },
  {
    id: 'u3',
    name: 'יוסי מזרחי',
    acquisitions: [],
  },
];
