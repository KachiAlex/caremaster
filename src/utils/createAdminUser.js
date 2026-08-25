// Utility to create admin user via the Express backend API

const API_BASE = () =>
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('authToken') || '';
}

export const createAdminUser = async (email, password, name) => {
  try {
    // Split name into first/last (simple split on first space)
    const parts = (name || '').trim().split(/\s+/);
    const firstName = parts[0] || 'Admin';
    const lastName = parts.slice(1).join(' ') || 'User';

    const res = await fetch(`${API_BASE()}/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
        userType: 'admin',
        sendEmail: true,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return { success: false, error: data.message || 'Failed to create admin' };
    }

    return { success: true, userId: data.data?.id };
  } catch (error) {
    console.error('Error creating admin user:', error);
    return { success: false, error: error.message };
  }
};

// For development - create default admin
export const createDefaultAdmin = () => {
  return createAdminUser('admin@Care Master.com', 'admin123456', 'Care Master Administrator');
};
