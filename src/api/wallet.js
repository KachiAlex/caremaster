import api from './config';

export const walletAPI = {
  // Get wallet balance
  getBalance: async () => {
    const response = await api.get('/wallet/balance');
    return response.data;
  },

  // Get transaction history
  getTransactions: async (page = 1, limit = 20) => {
    const response = await api.get(`/wallet/transactions?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Initiate wallet funding
  fundWallet: async (amount, description) => {
    const response = await api.post('/wallet/fund', { amount, description });
    return response.data;
  },

  // Get transaction details
  getTransaction: async (transactionId) => {
    const response = await api.get(`/wallet/transactions/${transactionId}`);
    return response.data;
  },

  // Download receipt
  getReceipt: async (transactionId) => {
    const response = await api.get(`/wallet/receipt/${transactionId}`);
    return response.data;
  },

  // Verify payment status
  verifyPayment: async (reference) => {
    const response = await api.get(`/wallet/verify/${reference}`);
    return response.data;
  }
};
