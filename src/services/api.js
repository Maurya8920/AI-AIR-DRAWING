const API_BASE = '/api';

/**
 * Centralized fetch wrapper with credentials (cookies) and safe JSON parsing.
 * Never calls res.json() blindly to prevent "Unexpected end of JSON input".
 */
async function request(endpoint, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    ...options,
  };

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, config);
  } catch (err) {
    throw new Error('Server not responding, please try again');
  }

  let data = {};
  const rawText = await res.text();

  if (rawText && rawText.trim().length > 0) {
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('Failed to parse response as JSON:', rawText);
      throw new Error('Server not responding, please try again');
    }
  }

  if (!res.ok) {
    throw new Error(data.message || 'Server not responding, please try again');
  }

  return data;
}

// ─── Auth API ───

export async function registerUser(name, email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function loginUser(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutUser() {
  return request('/auth/logout', { method: 'POST' });
}

export async function getCurrentUser() {
  return request('/auth/me');
}

// ─── Drawings API ───

export async function createDrawing({ title, imageData, thumbnail, brushColor, brushSize }) {
  return request('/drawings', {
    method: 'POST',
    body: JSON.stringify({ title, imageData, thumbnail, brushColor, brushSize }),
  });
}

export async function getDrawings(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return request(`/drawings${query}`);
}

export async function getDrawing(id) {
  return request(`/drawings/${id}`);
}

export async function updateDrawing(id, data) {
  return request(`/drawings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteDrawing(id) {
  return request(`/drawings/${id}`, { method: 'DELETE' });
}
