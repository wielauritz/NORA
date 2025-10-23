// API Base URL
const API_BASE_URL = 'https://api.new.nora-nak.de/v1';

// API Request Helper
async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  };

  const finalOptions: RequestInit = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, finalOptions);

    // Handle unauthorized
    if (response.status === 401) {
      const isAuthEndpoint = endpoint === '/login' || endpoint === '/resend-email' ||
        endpoint === '/reset' || endpoint === '/reset-confirm';

      if (!isAuthEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true } as T;
    }

    // Parse JSON response
    const contentType = response.headers.get('content-type');
    let data: any;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage = typeof data === 'object' ? (data.detail || data.message) : data;
      throw new Error(errorMessage || `HTTP ${response.status}: API Request failed`);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Auth API
export const AuthAPI = {
  async login(mail: string, passwort: string) {
    return apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ mail, passwort }),
    });
  },

  async resendVerificationEmail(mail: string) {
    return apiRequest('/resend-email', {
      method: 'POST',
      body: JSON.stringify({ mail }),
    });
  },

  async verifyEmail(uuid: string) {
    return apiRequest(`/verify?uuid=${uuid}`, {
      method: 'GET',
    });
  },

  async resetPassword(mail: string) {
    return apiRequest('/reset', {
      method: 'POST',
      body: JSON.stringify({ mail }),
    });
  },

  async resetPasswordConfirm(uuid: string, new_password: string) {
    return apiRequest('/reset-confirm', {
      method: 'POST',
      body: JSON.stringify({ uuid, new_password }),
    });
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  async healthCheck() {
    return apiRequest('/health', {
      method: 'GET',
    });
  },
};

// User API
export const UserAPI = {
  async getProfile() {
    const sessionId = localStorage.getItem('token');
    if (!sessionId) throw new Error('Nicht eingeloggt');
    return apiRequest(`/user?session_id=${sessionId}`);
  },

  async getAllZenturien() {
    return apiRequest('/all_zenturie');
  },

  async setZenturie(zenturie: string) {
    const sessionId = localStorage.getItem('token');
    if (!sessionId) throw new Error('Nicht eingeloggt');
    return apiRequest(`/zenturie?session_id=${sessionId}`, {
      method: 'POST',
      body: JSON.stringify({ zenturie }),
    });
  },
};

// Schedule API
export const ScheduleAPI = {
  async getEvents(date: string) {
    const sessionId = localStorage.getItem('token');
    if (!sessionId) throw new Error('Nicht eingeloggt');
    return apiRequest(`/events?session_id=${sessionId}&date=${date}`);
  },

  async getFriendSchedule(zenturie: string, date: string) {
    return apiRequest(`/view?zenturie=${zenturie}&date=${date}`);
  },
};

// Exams API
export const ExamsAPI = {
  async getUpcomingExams() {
    const sessionId = localStorage.getItem('token');
    if (!sessionId) throw new Error('Nicht eingeloggt');
    return apiRequest(`/exams?session_id=${sessionId}`);
  },

  async addExam(course: string, start_time: string, duration: number, room?: string) {
    const sessionId = localStorage.getItem('token');
    if (!sessionId) throw new Error('Nicht eingeloggt');
    return apiRequest(`/add?session_id=${sessionId}`, {
      method: 'POST',
      body: JSON.stringify({ course, start_time, duration, room }),
    });
  },
};

// Room API
export const RoomAPI = {
  async getAllRooms() {
    return apiRequest('/rooms');
  },

  async getFreeRooms(startTime: string, endTime: string) {
    return apiRequest(`/free-rooms?start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`);
  },

  async getRoomDetails(roomNumber: string) {
    return apiRequest(`/room?room_number=${roomNumber}`);
  },
};

// Friends API
export const FriendsAPI = {
  async getFriends() {
    const sessionId = localStorage.getItem('token');
    if (!sessionId) throw new Error('Nicht eingeloggt');
    return apiRequest(`/friends?session_id=${sessionId}`);
  },

  async addFriend(friendMail: string) {
    const sessionId = localStorage.getItem('token');
    if (!sessionId) throw new Error('Nicht eingeloggt');
    return apiRequest(`/friends?session_id=${sessionId}`, {
      method: 'POST',
      body: JSON.stringify({ friend_mail: friendMail }),
    });
  },

  async removeFriend(friendUserId: number) {
    const sessionId = localStorage.getItem('token');
    if (!sessionId) throw new Error('Nicht eingeloggt');
    return apiRequest(`/friends?session_id=${sessionId}&friend_user_id=${friendUserId}`, {
      method: 'DELETE',
    });
  },
};

// Custom Hours API
export const CustomHoursAPI = {
  async createCustomHour(
    title: string,
    description: string | null,
    start_time: string,
    end_time: string,
    room?: string | null,
    custom_location?: string | null
  ) {
    const sessionId = localStorage.getItem('token');
    if (!sessionId) throw new Error('Nicht eingeloggt');
    return apiRequest(`/create?session_id=${sessionId}`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        start_time,
        end_time,
        room,
        custom_location
      }),
    });
  },

  async deleteCustomHour(custom_hour_id: number) {
    const sessionId = localStorage.getItem('token');
    if (!sessionId) throw new Error('Nicht eingeloggt');
    return apiRequest(`/delete?session_id=${sessionId}&custom_hour_id=${custom_hour_id}`, {
      method: 'DELETE',
    });
  },
};

// Search API
export const SearchAPI = {
  async search(parameter: string) {
    const sessionId = localStorage.getItem('token');
    if (!sessionId) throw new Error('Nicht eingeloggt');
    return apiRequest(`/search?session_id=${sessionId}&parameter=${encodeURIComponent(parameter)}`);
  },
};

// Courses API
export const CoursesAPI = {
  async getAllCourses() {
    const sessionId = localStorage.getItem('token');
    if (!sessionId) throw new Error('Nicht eingeloggt');
    return apiRequest(`/courses?session_id=${sessionId}`);
  },
};

// Calendar API
export const CalendarAPI = {
  getSubscriptionURL(subscriptionUuid: string) {
    return `${API_BASE_URL}/subscription/${subscriptionUuid}.ics`;
  },
};

// Utility Functions
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime(timeString: string): string {
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
