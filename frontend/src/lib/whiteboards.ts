const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Whiteboard {
  _id: string;
  roomId: string;
  name: string;
  owner: string;
  isProtected: boolean;
  collaborators: Array<{
    userId: string;
    email: string;
    username: string;
    invitedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const getWhiteboards = async (token: string): Promise<{ whiteboards: Whiteboard[] }> => {
  const response = await fetch(`${API_URL}/api/whiteboards`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch whiteboards');
  }

  return response.json();
};

export const getWhiteboard = async (roomId: string, token: string): Promise<{ whiteboard: Whiteboard }> => {
  const response = await fetch(`${API_URL}/api/whiteboards/${roomId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch whiteboard');
  }

  return response.json();
};

export const createWhiteboard = async (
  name: string,
  isProtected: boolean,
  token: string
): Promise<{ whiteboard: Whiteboard }> => {
  const response = await fetch(`${API_URL}/api/whiteboards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, isProtected }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create whiteboard');
  }

  return response.json();
};

export const updateWhiteboard = async (
  roomId: string,
  name: string,
  isProtected: boolean,
  token: string
): Promise<{ whiteboard: Whiteboard }> => {
  const response = await fetch(`${API_URL}/api/whiteboards/${roomId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, isProtected }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update whiteboard');
  }

  return response.json();
};

export const inviteCollaborator = async (
  roomId: string,
  email: string,
  token: string
): Promise<{ whiteboard: Whiteboard; message: string }> => {
  const response = await fetch(`${API_URL}/api/whiteboards/${roomId}/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to invite collaborator');
  }

  return response.json();
};

export const removeCollaborator = async (
  roomId: string,
  collaboratorId: string,
  token: string
): Promise<{ whiteboard: Whiteboard; message: string }> => {
  const response = await fetch(`${API_URL}/api/whiteboards/${roomId}/collaborators/${collaboratorId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove collaborator');
  }

  return response.json();
};

export const deleteWhiteboard = async (roomId: string, token: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/api/whiteboards/${roomId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete whiteboard');
  }

  return response.json();
};

