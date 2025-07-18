import { ReceiverQueries } from '../lib/firebase/role-based-queries';

// Mock Firebase and auth
jest.mock('../lib/firebase/config', () => ({
  db: {},
}));

jest.mock('../lib/firebase/auth', () => ({
  authService: {
    getCurrentUser: jest.fn(),
  },
}));

describe('Supplier Loading Error Handling', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  test('getTodaysExpectedSuppliers should return empty array when unauthorized', async () => {
    // Mock unauthorized access
    const { authService } = require('../lib/firebase/auth');
    authService.getCurrentUser.mockReturnValue(null);

    const result = await ReceiverQueries.getTodaysExpectedSuppliers();
    
    expect(result).toEqual([]);
  });

  test('getTodaysRestockItems should return empty array when unauthorized', async () => {
    // Mock unauthorized access
    const { authService } = require('../lib/firebase/auth');
    authService.getCurrentUser.mockReturnValue(null);

    const result = await ReceiverQueries.getTodaysRestockItems();
    
    expect(result).toEqual([]);
  });

  test('subscribeTodaysExpectedSuppliers should call callback with empty array when unauthorized', () => {
    // Mock unauthorized access
    const { authService } = require('../lib/firebase/auth');
    authService.getCurrentUser.mockReturnValue(null);

    const mockCallback = jest.fn();
    const unsubscribe = ReceiverQueries.subscribeTodaysExpectedSuppliers(mockCallback);
    
    expect(mockCallback).toHaveBeenCalledWith([]);
    expect(typeof unsubscribe).toBe('function');
  });
}); 