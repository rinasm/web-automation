import { create } from 'zustand';
import { NetworkEntry, NetworkFilter, NetworkStats } from '../types/network';

interface NetworkStore {
  // State
  entries: NetworkEntry[];
  selectedEntryId: string | null;
  isPanelVisible: boolean;
  isMonitoring: boolean;
  filter: NetworkFilter;
  maxEntries: number;

  // Stats
  stats: NetworkStats;

  // Actions
  addEntry: (entry: NetworkEntry) => void;
  updateEntry: (id: string, updates: Partial<NetworkEntry>) => void;
  removeEntry: (id: string) => void;
  clearEntries: () => void;

  setSelectedEntry: (id: string | null) => void;
  togglePanel: () => void;
  setPanelVisible: (visible: boolean) => void;

  setFilter: (filter: Partial<NetworkFilter>) => void;
  resetFilter: () => void;

  toggleMonitoring: () => void;
  setMonitoring: (monitoring: boolean) => void;

  setMaxEntries: (max: number) => void;

  // Computed
  getFilteredEntries: () => NetworkEntry[];
  getEntryById: (id: string) => NetworkEntry | undefined;
  updateStats: () => void;
}

const defaultFilter: NetworkFilter = {
  type: 'all',
  status: 'all',
  search: '',
  method: 'all',
};

const defaultStats: NetworkStats = {
  totalRequests: 0,
  totalSize: 0,
  averageDuration: 0,
  errorCount: 0,
};

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  // Initial state
  entries: [],
  selectedEntryId: null,
  isPanelVisible: false,
  isMonitoring: true,
  filter: defaultFilter,
  maxEntries: 1000,
  stats: defaultStats,

  // Actions
  addEntry: (entry: NetworkEntry) => {
    set((state) => {
      const newEntries = [entry, ...state.entries];

      // Limit entries to maxEntries
      if (newEntries.length > state.maxEntries) {
        newEntries.pop();
      }

      return { entries: newEntries };
    });

    // Update stats after adding
    get().updateStats();
  },

  updateEntry: (id: string, updates: Partial<NetworkEntry>) => {
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry
      ),
    }));

    get().updateStats();
  },

  removeEntry: (id: string) => {
    set((state) => ({
      entries: state.entries.filter((entry) => entry.id !== id),
    }));

    get().updateStats();
  },

  clearEntries: () => {
    set({
      entries: [],
      selectedEntryId: null,
      stats: defaultStats,
    });
  },

  setSelectedEntry: (id: string | null) => {
    set({ selectedEntryId: id });
  },

  togglePanel: () => {
    set((state) => ({ isPanelVisible: !state.isPanelVisible }));
  },

  setPanelVisible: (visible: boolean) => {
    set({ isPanelVisible: visible });
  },

  setFilter: (newFilter: Partial<NetworkFilter>) => {
    set((state) => ({
      filter: { ...state.filter, ...newFilter },
    }));
  },

  resetFilter: () => {
    set({ filter: defaultFilter });
  },

  toggleMonitoring: () => {
    set((state) => ({ isMonitoring: !state.isMonitoring }));
  },

  setMonitoring: (monitoring: boolean) => {
    set({ isMonitoring: monitoring });
  },

  setMaxEntries: (max: number) => {
    set({ maxEntries: max });
  },

  // Computed
  getFilteredEntries: () => {
    const { entries, filter } = get();

    return entries.filter((entry) => {
      // Filter by type
      if (filter.type !== 'all' && entry.type !== filter.type) {
        return false;
      }

      // Filter by method
      if (filter.method && filter.method !== 'all' && entry.request.method !== filter.method) {
        return false;
      }

      // Filter by status
      if (filter.status !== 'all' && entry.response) {
        const statusCode = entry.response.status;
        const statusCategory = Math.floor(statusCode / 100);
        const expectedCategory = filter.status.charAt(0);

        if (statusCategory.toString() !== expectedCategory) {
          return false;
        }
      }

      // Filter by search
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const urlMatch = entry.request.url.toLowerCase().includes(searchLower);
        const methodMatch = entry.request.method.toLowerCase().includes(searchLower);
        const statusMatch = entry.response?.status.toString().includes(searchLower);
        const bodyMatch = entry.request.body?.toLowerCase().includes(searchLower) ||
                          entry.response?.body?.toLowerCase().includes(searchLower);

        if (!urlMatch && !methodMatch && !statusMatch && !bodyMatch) {
          return false;
        }
      }

      return true;
    });
  },

  getEntryById: (id: string) => {
    return get().entries.find((entry) => entry.id === id);
  },

  updateStats: () => {
    const { entries } = get();

    if (entries.length === 0) {
      set({ stats: defaultStats });
      return;
    }

    const totalRequests = entries.length;
    let totalSize = 0;
    let totalDuration = 0;
    let errorCount = 0;

    entries.forEach((entry) => {
      // Calculate total size
      totalSize += entry.request.bodySize;
      if (entry.response) {
        totalSize += entry.response.bodySize;
      }

      // Calculate total duration
      totalDuration += entry.timing.totalDuration;

      // Count errors
      if (entry.error || (entry.response && entry.response.status >= 400)) {
        errorCount++;
      }
    });

    const averageDuration = totalDuration / totalRequests;

    set({
      stats: {
        totalRequests,
        totalSize,
        averageDuration,
        errorCount,
      },
    });
  },
}));
