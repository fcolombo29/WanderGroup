
import { Trip, User, Expense, Activity, Document, Payment, TripStatus, TripRole } from '../types';

const STORAGE_KEYS = {
  USERS: 'wander_users',
  TRIPS: 'wander_trips',
  MEMBERS: 'wander_members',
  EXPENSES: 'wander_expenses',
  ACTIVITIES: 'wander_activities',
  DOCUMENTS: 'wander_documents',
  PAYMENTS: 'wander_payments',
  CURRENT_USER: 'wander_current_user'
};

const get = <T,>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const save = <T,>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

const initMockData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const mockUser: User = { id: 'user-1', name: 'Diego García', email: 'diego@example.com', avatar_url: 'https://i.pravatar.cc/150?u=diego' };
    const mockFriend1: User = { id: 'user-2', name: 'Sofía Martínez', email: 'sofia@example.com' };
    const mockFriend2: User = { id: 'user-3', name: 'Marcos Ruiz', email: 'marcos@example.com' };
    
    save(STORAGE_KEYS.USERS, [mockUser, mockFriend1, mockFriend2]);
    save(STORAGE_KEYS.CURRENT_USER, mockUser);

    const initialTrip: Trip = {
      id: 'trip-1',
      name: 'Verano en Barcelona',
      destination: 'Barcelona, España',
      start_date: '2024-07-01',
      end_date: '2024-07-15',
      status: TripStatus.ACTIVE,
      created_at: new Date().toISOString(),
      image_url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800'
    };
    save(STORAGE_KEYS.TRIPS, [initialTrip]);

    save(STORAGE_KEYS.MEMBERS, [
      { id: 'm1', trip_id: 'trip-1', user_id: 'user-1', role: TripRole.ADMIN },
      { id: 'm2', trip_id: 'trip-1', user_id: 'user-2', role: TripRole.EDITOR },
      { id: 'm3', trip_id: 'trip-1', user_id: 'user-3', role: TripRole.EDITOR },
    ]);

    save(STORAGE_KEYS.EXPENSES, [
      {
        id: 'exp-1',
        trip_id: 'trip-1',
        payer_id: 'user-1',
        amount: 85500,
        description: 'Cena de bienvenida',
        date: '2024-07-01',
        category: 'Comida',
        participants: ['user-1', 'user-2', 'user-3']
      },
      {
        id: 'exp-2',
        trip_id: 'trip-1',
        payer_id: 'user-2',
        amount: 25300,
        description: 'Bebidas playa',
        date: '2024-07-02',
        category: 'Ocio',
        participants: ['user-1', 'user-2']
      }
    ]);
  }
};

initMockData();

export const db = {
  getCurrentUser: (): User | null => get(STORAGE_USER_KEY(), null),
  
  updateCurrentUser: (updates: Partial<User>): User | null => {
    const user = db.getCurrentUser();
    if (!user) return null;
    const updated = { ...user, ...updates };
    save(STORAGE_KEYS.CURRENT_USER, updated);
    const users = get<User[]>(STORAGE_KEYS.USERS, []);
    save(STORAGE_KEYS.USERS, users.map(u => u.id === user.id ? updated : u));
    return updated;
  },

  getTrips: (): Trip[] => get(STORAGE_KEYS.TRIPS, []),
  
  getTripById: (id: string): Trip | undefined => get<Trip[]>(STORAGE_KEYS.TRIPS, []).find(t => t.id === id),

  updateTrip: (id: string, updates: Partial<Trip>): void => {
    const trips = get<Trip[]>(STORAGE_KEYS.TRIPS, []);
    save(STORAGE_KEYS.TRIPS, trips.map(t => t.id === id ? { ...t, ...updates } : t));
  },

  createTrip: (tripData: Partial<Trip>): Trip => {
    const trips = get<Trip[]>(STORAGE_KEYS.TRIPS, []);
    const user = db.getCurrentUser();
    const newTrip: Trip = {
      id: Math.random().toString(36).substr(2, 9),
      name: tripData.name || 'Nuevo Viaje',
      destination: tripData.destination || '',
      start_date: tripData.start_date || '',
      end_date: tripData.end_date || '',
      status: TripStatus.ACTIVE,
      created_at: new Date().toISOString(),
      image_url: tripData.image_url || `https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=800`,
    };
    save(STORAGE_KEYS.TRIPS, [...trips, newTrip]);
    if (user) {
      const members = get(STORAGE_KEYS.MEMBERS, []);
      save(STORAGE_KEYS.MEMBERS, [...members, { id: 'm-' + Math.random().toString(36).substr(2, 5), trip_id: newTrip.id, user_id: user.id, role: TripRole.ADMIN }]);
    }
    return newTrip;
  },

  getTripMembers: (tripId: string): User[] => {
    const members = get<any[]>(STORAGE_KEYS.MEMBERS, []);
    const users = get<User[]>(STORAGE_KEYS.USERS, []);
    const tripMemberIds = members.filter(m => m.trip_id === tripId).map(m => m.user_id);
    return users.filter(u => tripMemberIds.includes(u.id));
  },

  updateTripMember: (userId: string, updates: Partial<User>): void => {
    const users = get<User[]>(STORAGE_KEYS.USERS, []);
    save(STORAGE_KEYS.USERS, users.map(u => u.id === userId ? { ...u, ...updates } : u));
  },

  addTripMember: (tripId: string, name: string): User => {
    const users = get<User[]>(STORAGE_KEYS.USERS, []);
    const members = get<any[]>(STORAGE_KEYS.MEMBERS, []);
    const newUser: User = { id: 'user-' + Math.random().toString(36).substr(2, 5), name, email: name.toLowerCase().replace(' ', '.') + '@example.com' };
    save(STORAGE_KEYS.USERS, [...users, newUser]);
    save(STORAGE_KEYS.MEMBERS, [...members, { id: 'm-' + Math.random().toString(36).substr(2, 5), trip_id: tripId, user_id: newUser.id, role: TripRole.VIEWER }]);
    return newUser;
  },

  getExpenses: (tripId: string): Expense[] => {
    return get<Expense[]>(STORAGE_KEYS.EXPENSES, []).filter(e => e.trip_id === tripId);
  },

  addExpense: (expense: Omit<Expense, 'id'>): Expense => {
    const expenses = get<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    const newExpense = { ...expense, id: Math.random().toString(36).substr(2, 9) };
    save(STORAGE_KEYS.EXPENSES, [...expenses, newExpense]);
    return newExpense;
  },

  updateExpense: (id: string, updates: Partial<Expense>): void => {
    const expenses = get<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    const updated = expenses.map(e => e.id === id ? { ...e, ...updates } : e);
    save(STORAGE_KEYS.EXPENSES, updated);
  },

  deleteExpense: (id: string): void => {
    const expenses = get<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    save(STORAGE_KEYS.EXPENSES, expenses.filter(e => e.id !== id));
  },

  getActivities: (tripId: string): Activity[] => {
    return get<Activity[]>(STORAGE_KEYS.ACTIVITIES, []).filter(a => a.trip_id === tripId);
  },

  addActivity: (activity: Omit<Activity, 'id'>): Activity => {
    const activities = get<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
    const newActivity = { ...activity, id: Math.random().toString(36).substr(2, 9) };
    save(STORAGE_KEYS.ACTIVITIES, [...activities, newActivity]);
    return newActivity;
  },

  updateActivity: (id: string, updates: Partial<Activity>): void => {
    const activities = get<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
    save(STORAGE_KEYS.ACTIVITIES, activities.map(a => a.id === id ? { ...a, ...updates } : a));
  },

  getDocuments: (tripId: string): Document[] => {
    return get<Document[]>(STORAGE_KEYS.DOCUMENTS, []).filter(d => d.trip_id === tripId);
  },

  addDocument: (doc: Omit<Document, 'id'>): Document => {
    const docs = get<Document[]>(STORAGE_KEYS.DOCUMENTS, []);
    const newDoc = { ...doc, id: Math.random().toString(36).substr(2, 9) };
    save(STORAGE_KEYS.DOCUMENTS, [...docs, newDoc]);
    return newDoc;
  },

  getPayments: (tripId: string): Payment[] => {
    return get<Payment[]>(STORAGE_KEYS.PAYMENTS, []).filter(p => p.trip_id === tripId);
  },

  addPayment: (payment: Omit<Payment, 'id'>): Payment => {
    const payments = get<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
    const newPayment = { ...payment, id: Math.random().toString(36).substr(2, 9) };
    save(STORAGE_KEYS.PAYMENTS, [...payments, newPayment]);
    return newPayment;
  }
};

function STORAGE_USER_KEY(): string {
  return STORAGE_KEYS.CURRENT_USER;
}
