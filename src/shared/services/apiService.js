// API Service - Handles all HTTP requests
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_ENDPOINTS, REQUEST_TIMEOUT } from '../config/api';
import { logError } from '../utils/logger';

class APIService {
  constructor() {
    this.token = null;
    // Set by AuthProvider: called when the server rejects our saved session (expired, revoked, user removed).
    this.onUnauthorized = null;
  }

  async setToken(token) {
    this.token = token;
    if (token) {
      await AsyncStorage.setItem('authToken', token);
    }
  }

  async getToken() {
    if (!this.token) {
      this.token = await AsyncStorage.getItem('authToken');
    }
    return this.token;
  }

  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem('authToken');
  }

  async request(endpoint, method = 'GET', data = null, headers = {}) {
    try {
      const defaultHeaders = {
        'Content-Type': 'application/json',
      };

      const token = await this.getToken();
      if (token) {
        defaultHeaders.Authorization = `Bearer ${token}`;
      }

      const config = {
        method,
        headers: { ...defaultHeaders, ...headers },
      };

      if (data) {
        config.body = JSON.stringify(data);
      }

      const response = await Promise.race([
        fetch(endpoint.startsWith('/') ? `${API_BASE_URL}${endpoint}` : endpoint, config),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
        ),
      ]);

      const responseData = await response.json();

      // A 401 while we were sending a token means the saved session is no longer valid.
      // (A 401 from login itself has no token, so wrong-password errors are unaffected.)
      if (response.status === 401 && token) {
        await this.clearToken();
        await AsyncStorage.removeItem('userData');
        if (typeof this.onUnauthorized === 'function') this.onUnauthorized();
        throw new Error('Your session has expired. Please sign in again.');
      }

      if (!response.ok) {
        throw new Error(responseData.message || `API Error: ${response.status}`);
      }

      if (method === 'GET') this.syncOfflineQueue().catch(() => {});
      return responseData;
    } catch (error) {
      logError('API Error:', error);
      throw error;
    }
  }

  // School APIs
  async getSchools(filters = {}) {
    const cacheKey = `schoolsCache:${JSON.stringify(filters)}`;
    try {
      const result = await this.request(`${API_ENDPOINTS.SCHOOLS}?${this.buildQueryString(filters)}`);
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data: result }));
      return result;
    } catch (error) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached).data;
      throw error;
    }
  }

  async getSchoolLocations({ country, home } = {}) {
    const q = this.buildQueryString({ country, home });
    return this.request(`/schools/locations${q ? `?${q}` : ''}`);
  }

  async syncOfflineQueue() {
    const raw = await AsyncStorage.getItem('offlineMutationQueue');
    if (!raw) return;
    const queue = JSON.parse(raw);
    const remaining = [];
    for (const item of queue) {
      try { await this.request(item.endpoint, item.method, item.data); }
      catch { remaining.push(item); }
    }
    if (remaining.length) await AsyncStorage.setItem('offlineMutationQueue', JSON.stringify(remaining));
    else await AsyncStorage.removeItem('offlineMutationQueue');
  }

  async queueMutation(endpoint, method, data) {
    const raw = await AsyncStorage.getItem('offlineMutationQueue');
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({ endpoint, method, data, queuedAt: Date.now() });
    await AsyncStorage.setItem('offlineMutationQueue', JSON.stringify(queue.slice(-100)));
    return { queued: true };
  }

  async getSchoolDetail(id) {
    return this.request(API_ENDPOINTS.SCHOOL_DETAIL(id));
  }

  async claimSchool(schoolId, claim) {
    return this.request(`/schools/${schoolId}/claim`, 'POST', claim);
  }

  async getAdminClaims(status = 'pending') {
    return this.request(`/admin/claims?status=${status}`);
  }

  async approveClaim(claimId, note = '') {
    return this.request(`/admin/claims/${claimId}/approve`, 'PUT', { note });
  }

  async rejectClaim(claimId, reason) {
    return this.request(`/admin/claims/${claimId}/reject`, 'PUT', { reason });
  }

  async addSchoolReview(schoolId, rating, comment) {
    return this.request(API_ENDPOINTS.SCHOOL_REVIEWS(schoolId), 'POST', { rating, comment });
  }

  async searchSchools(query) {
    return this.request(`${API_ENDPOINTS.SCHOOL_SEARCH}?q=${query}`);
  }

  // radius (km) is optional: omit it to get the nearest schools anywhere, closest first.
  async getNearbySchools(latitude, longitude, radius = null) {
    const radiusPart = radius ? `&radius=${radius}` : '';
    return this.request(
      `${API_ENDPOINTS.SCHOOLS_NEARBY}?lat=${latitude}&lng=${longitude}${radiusPart}`
    );
  }

  // User APIs
  async signup(userData) {
    return this.request(API_ENDPOINTS.USER_SIGNUP, 'POST', userData);
  }

  async login(email, password) {
    return this.request(API_ENDPOINTS.USER_LOGIN, 'POST', { email, password });
  }

  async exchangeSocialTicket(ticket) {
    return this.request(API_ENDPOINTS.AUTH_SOCIAL_EXCHANGE, 'POST', { ticket });
  }

  async socialLogin(provider, idToken) {
    const endpoint = provider === 'google' ? API_ENDPOINTS.AUTH_GOOGLE : API_ENDPOINTS.AUTH_APPLE;
    return this.request(endpoint, 'POST', { idToken });
  }

  async logout() {
    try {
      await this.request(API_ENDPOINTS.USER_LOGOUT, 'POST');
    } finally {
      // Always clear the local token, even if the server call fails
      // (e.g. offline), so the user isn't stuck "logged in" on-device.
      await this.clearToken();
    }
  }

  async requestPasswordReset(email) {
    return this.request(API_ENDPOINTS.PASSWORD_FORGOT, 'POST', { email });
  }

  async resetPassword(email, code, password) {
    return this.request(API_ENDPOINTS.PASSWORD_RESET, 'POST', { email, code, password });
  }

  async getUserProfile(id) {
    return this.request(API_ENDPOINTS.USER_PROFILE(id));
  }

  async getMyProfile() { return this.request(API_ENDPOINTS.MY_PROFILE); }
  async updateMyProfile(profile) { return this.request(API_ENDPOINTS.MY_PROFILE, 'PUT', profile); }
  async getSubscriptionPlans() { return this.request(API_ENDPOINTS.SUBSCRIPTION_PLANS); }
  async getMySubscriptions() { return this.request(API_ENDPOINTS.MY_SUBSCRIPTIONS); }
  async startSubscriptionCheckout(planKey, redirectUrl) { return this.request(API_ENDPOINTS.SUBSCRIPTION_CHECKOUT, 'POST', { planKey, redirectUrl }); }
  async verifySubscriptionPayment(transactionId) { return this.request(API_ENDPOINTS.SUBSCRIPTION_VERIFY(transactionId)); }

  // Mentorship marketplace
  async getMentors(params = {}) {
    const q = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    return this.request(`/mentors${q ? `?${q}` : ''}`);
  }
  async getMentor(id) { return this.request(`/mentors/${id}`); }
  async getMentorSlots(id, duration = 60) { return this.request(`/mentors/${id}/slots?duration=${duration}`); }
  async getMyMentorProfile() { return this.request('/me/mentor'); }
  async saveMyMentorProfile(body) { return this.request('/me/mentor', 'PUT', body); }
  async createMentorBooking(id, body) { return this.request(`/mentors/${id}/bookings`, 'POST', body); }
  async startMentorCheckout(bookingId, redirectUrl) { return this.request(`/mentor-bookings/${bookingId}/checkout`, 'POST', { redirectUrl }); }
  async verifyMentorPayment(transactionId) { return this.request(`/mentor-bookings/verify/${encodeURIComponent(transactionId)}`); }
  async getMyBookings(role = 'student') { return this.request(`/me/bookings?role=${role}`); }
  async cancelMentorBooking(id) { return this.request(`/mentor-bookings/${id}/cancel`, 'PUT'); }
  async completeMentorBooking(id) { return this.request(`/mentor-bookings/${id}/complete`, 'PUT'); }
  async reviewMentorBooking(id, rating, comment) { return this.request(`/mentor-bookings/${id}/review`, 'POST', { rating, comment }); }
  async startConversation(userId) { return this.request('/conversations', 'POST', { userId }); }

  // Community events
  async getEvents(params = {}) {
    const q = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    return this.request(`/events${q ? `?${q}` : ''}`);
  }
  async getMyEvents(role = 'going') { return this.request(`/me/events?role=${role}`); }
  async getEvent(id) { return this.request(`/events/${id}`); }
  async createEvent(body) { return this.request('/events', 'POST', body); }
  async updateEvent(id, body) { return this.request(`/events/${id}`, 'PUT', body); }
  async cancelEvent(id) { return this.request(`/events/${id}`, 'DELETE'); }
  async rsvpEvent(id) { return this.request(`/events/${id}/rsvp`, 'POST'); }
  async cancelRsvp(id) { return this.request(`/events/${id}/rsvp`, 'DELETE'); }

  // Messages APIs
  async sendMessage(conversationId, message) {
    return this.request(API_ENDPOINTS.MESSAGES, 'POST', {
      conversationId,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  async getConversations() {
    return this.request(API_ENDPOINTS.CONVERSATIONS);
  }

  async getMessages(conversationId) {
    return this.request(`${API_ENDPOINTS.MESSAGES}/${conversationId}`);
  }

  async getJobs() { return this.request(API_ENDPOINTS.JOBS); }
  async createJob(job) { return this.request(API_ENDPOINTS.JOB_CREATE, 'POST', job); }
  async getEmployerJobs() { return this.request(API_ENDPOINTS.EMPLOYER_JOBS); }
  async getEmployerJobApplications(jobId) { return this.request(API_ENDPOINTS.EMPLOYER_JOB_APPLICATIONS(jobId)); }
  async updateJob(jobId, data) { return this.request(API_ENDPOINTS.JOB_UPDATE(jobId), 'PUT', data); }

  async applyForJob(jobId) {
    try { return await this.request(API_ENDPOINTS.JOB_APPLY(jobId), 'POST'); }
    catch (error) { if (error.message === 'Request timeout' || /Network|Failed to fetch/i.test(error.message)) return this.queueMutation(API_ENDPOINTS.JOB_APPLY(jobId), 'POST'); throw error; }
  }

  async getApplications(userId) { return this.request(API_ENDPOINTS.GRADUATE_APPLICATIONS(userId)); }

  async updateApplicationStatus(applicationId, status) { return this.request(API_ENDPOINTS.APPLICATION_STATUS(applicationId), 'PUT', { status }); }

  async getFavorites() {
    const key = 'favoritesCache';
    try {
      const result = await this.request(API_ENDPOINTS.FAVORITES);
      await AsyncStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data: result }));
      return result;
    } catch (error) {
      const cached = await AsyncStorage.getItem(key);
      if (cached) return JSON.parse(cached).data;
      throw error;
    }
  }

  async addFavorite(schoolId) {
    try { return await this.request(API_ENDPOINTS.FAVORITE(schoolId), 'POST'); }
    catch (error) { if (error.message === 'Request timeout' || /Network|Failed to fetch/i.test(error.message)) return this.queueMutation(API_ENDPOINTS.FAVORITE(schoolId), 'POST'); throw error; }
  }

  async removeFavorite(schoolId) {
    try { return await this.request(API_ENDPOINTS.FAVORITE(schoolId), 'DELETE'); }
    catch (error) { if (error.message === 'Request timeout' || /Network|Failed to fetch/i.test(error.message)) return this.queueMutation(API_ENDPOINTS.FAVORITE(schoolId), 'DELETE'); throw error; }
  }

  async createPayment(paymentData) {
    return this.request(API_ENDPOINTS.PAYMENTS, 'POST', paymentData);
  }

  async getPayments() {
    return this.request(API_ENDPOINTS.PAYMENTS);
  }

  async getReceiptInfo(paymentId) {
    return this.request(API_ENDPOINTS.PAYMENT_RECEIPT_INFO(paymentId));
  }

  getReceiptUrl(paymentId) {
    return API_ENDPOINTS.PAYMENT_RECEIPT(paymentId);
  }

  async getNotifications() { return this.request(API_ENDPOINTS.NOTIFICATIONS); }

  async markNotificationRead(notificationId) { return this.request(API_ENDPOINTS.NOTIFICATION_READ(notificationId), 'PUT'); }
  async registerPushToken(token, platform) { return this.request(API_ENDPOINTS.PUSH_TOKEN, 'POST', { token, platform }); }
  async getCareerDocuments() { return this.request(API_ENDPOINTS.CAREER_DOCUMENTS); }
  async createCareerDocument(data) { return this.request(API_ENDPOINTS.CAREER_DOCUMENTS, 'POST', data); }
  async deleteCareerDocument(id) { return this.request(API_ENDPOINTS.CAREER_DOCUMENT(id), 'DELETE'); }
  async getUserCareerDocuments(id) { return this.request(API_ENDPOINTS.USER_CAREER_DOCUMENTS(id)); }
  async likePost(id) { return this.request(API_ENDPOINTS.POST_LIKE(id), 'POST'); }
  async commentPost(id, text) { return this.request(API_ENDPOINTS.POST_COMMENTS(id), 'POST', { text }); }
  async getInterviews() { return this.request(API_ENDPOINTS.INTERVIEWS); }
  async scheduleInterview(data) { return this.request(API_ENDPOINTS.EMPLOYER_INTERVIEWS, 'POST', data); }
  async updateInterview(id, data) { return this.request(API_ENDPOINTS.INTERVIEW(id), 'PUT', data); }
  async startPaymentCheckout(id, data) { return this.request(API_ENDPOINTS.PAYMENT_CHECKOUT(id), 'POST', data); }
  async verifyPayment(transactionId) { return this.request(API_ENDPOINTS.PAYMENT_VERIFY(transactionId)); }

  async getGraduateProfile() {
    return this.request(API_ENDPOINTS.GRADUATE_PROFILE_ME);
  }

  async updateGraduateProfile(profile) {
    return this.request(API_ENDPOINTS.GRADUATE_PROFILE_ME, 'PUT', profile);
  }

  async getConnectUsers() {
    return this.request(API_ENDPOINTS.CONNECT_USERS);
  }

  async getConnectionRequests() {
    return this.request(API_ENDPOINTS.CONNECT_REQUESTS);
  }

  async sendConnectionRequest(userId) {
    return this.request(API_ENDPOINTS.CONNECT_REQUESTS, 'POST', { userId });
  }

  async updateConnectionRequest(requestId, status) {
    return this.request(API_ENDPOINTS.CONNECT_REQUEST(requestId), 'PUT', { status });
  }

  async getConnectSuggestions(limit = 10) {
    return this.request(`${API_ENDPOINTS.CONNECT_SUGGESTIONS}?limit=${limit}`);
  }

  async getConnections() {
    return this.request(API_ENDPOINTS.CONNECT_CONNECTIONS);
  }

  async endorseSkill(userId, skill) {
    return this.request(API_ENDPOINTS.USER_ENDORSE(userId), 'POST', { skill });
  }

  async removeEndorsement(userId, skill) {
    return this.request(API_ENDPOINTS.USER_UNENDORSE(userId, skill), 'DELETE');
  }

  async sendRecommendation(userId, text) {
    return this.request(API_ENDPOINTS.USER_RECOMMEND(userId), 'POST', { text });
  }

  async createPost(text, mediaUrls = [], mediaTypes = [], visibility = 'connections') {
    return this.request(API_ENDPOINTS.POSTS, 'POST', { text, mediaUrls, mediaTypes, visibility });
  }

  async getFeed(limit = 20) {
    return this.request(`${API_ENDPOINTS.FEED}?limit=${limit}`);
  }

  async getSchoolGroups(schoolId) {
    return this.request(API_ENDPOINTS.SCHOOL_GROUPS(schoolId));
  }

  async createSchoolGroup(schoolId, { name, description, type }) {
    return this.request(API_ENDPOINTS.SCHOOL_GROUPS(schoolId), 'POST', { name, description, type });
  }

  async joinGroup(groupId) {
    return this.request(API_ENDPOINTS.GROUP_JOIN(groupId), 'POST');
  }

  async leaveGroup(groupId) {
    return this.request(API_ENDPOINTS.GROUP_LEAVE(groupId), 'POST');
  }

  async deleteGroup(groupId) {
    return this.request(API_ENDPOINTS.GROUP(groupId), 'DELETE');
  }

  async getGroupPosts(groupId) {
    return this.request(API_ENDPOINTS.GROUP_POSTS(groupId));
  }

  async createGroupPost(groupId, text) {
    return this.request(API_ENDPOINTS.GROUP_POSTS(groupId), 'POST', { text });
  }

  async removeConnection(requestId) {
    return this.request(API_ENDPOINTS.CONNECT_REQUEST(requestId), 'DELETE');
  }

  async getAdminSchools(query = '') {
    return this.request(`${API_ENDPOINTS.ADMIN_SCHOOLS}${query ? `?${query}` : ''}`);
  }

  async verifySchool(schoolId) {
    return this.request(API_ENDPOINTS.ADMIN_VERIFY_SCHOOL(schoolId), 'PUT', { verified: true });
  }

  async rejectSchool(schoolId, reason) {
    return this.request(API_ENDPOINTS.ADMIN_REJECT_SCHOOL(schoolId), 'PUT', { reason });
  }

  // Revoke verification (uses the reject endpoint, which sets the school back to unverified/claimed).
  async unverifySchool(schoolId, reason = 'Verification revoked by an administrator') {
    return this.rejectSchool(schoolId, reason);
  }

  async deleteSchool(schoolId) {
    return this.request(`/admin/schools/${schoolId}`, 'DELETE');
  }

  async getAdminUsers() {
    return this.request(API_ENDPOINTS.ADMIN_USERS);
  }

  async getAdminReports() { return this.request(`${API_ENDPOINTS.ADMIN_REPORTS}`); }
  async updateAdminReport(reportId, status) { return this.request(API_ENDPOINTS.ADMIN_REPORT_STATUS(reportId), 'PUT', { status }); }

  async setUserRole(userId, role) {
    return this.request(API_ENDPOINTS.ADMIN_SET_ROLE(userId), 'PUT', { role });
  }

  async getAdminAnalytics() {
    return this.request(API_ENDPOINTS.ADMIN_ANALYTICS);
  }

  async getAdminPayments() { return this.request(API_ENDPOINTS.ADMIN_PAYMENTS); }

  async reportUser(targetUserId, reason) {
    return this.request(API_ENDPOINTS.CONNECT_REPORT, 'POST', { targetUserId, reason });
  }

  async blockUser(userId) {
    return this.request(API_ENDPOINTS.CONNECT_BLOCK(userId), 'POST');
  }

  // File uploads need multipart/form-data, not the JSON body request() sends,
  // so this bypasses that helper and builds the request directly.
  async uploadFile(fileUri, fileName, mimeType, options = {}) {
    const token = await this.getToken();
    const formData = new FormData();
    formData.append('file', { uri: fileUri, name: fileName, type: mimeType });

    const response = await Promise.race([
      fetch(options.private ? `${API_ENDPOINTS.UPLOAD}?private=1` : API_ENDPOINTS.UPLOAD, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
      ),
    ]);

    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.message || `API Error: ${response.status}`);
    }
    return responseData;
  }

  // ---- v3.2: capabilities, journey, saved items, activities ----
  async getCapabilities() { return this.request('/me/capabilities'); }
  async updateCapabilities({ add = [], remove = [] }) { return this.request('/me/capabilities', 'PUT', { add, remove }); }
  async getJourney() { return this.request('/me/journey'); }
  async updateJourney(patch) { return this.request('/me/journey', 'PUT', patch); }
  async toggleSaved(itemType, itemId) { return this.request('/saved/toggle', 'POST', { itemType, itemId: String(itemId) }); }
  async getSaved(itemType) { return this.request(`/saved${itemType ? `?itemType=${encodeURIComponent(itemType)}` : ''}`); }
  async getActivitiesSummary() { return this.request('/activities/summary'); }

  // ---- v3.2: freelance projects ----
  async getProjects(params = {}) { const q = this.buildQueryString(params); return this.request(`/projects${q ? `?${q}` : ''}`); }
  async getMyProjects() { return this.request('/projects/mine'); }
  async getProject(id) { return this.request(`/projects/${id}`); }
  async createProject(project) { return this.request('/projects', 'POST', project); }
  async updateProjectStatus(id, status) { return this.request(`/projects/${id}/status`, 'PUT', { status }); }
  async submitProposal(projectId, proposal) { return this.request(`/projects/${projectId}/proposals`, 'POST', proposal); }
  async getProposals(projectId) { return this.request(`/projects/${projectId}/proposals`); }
  async selectProposal(proposalId) { return this.request(`/proposals/${proposalId}/select`, 'PUT'); }
  async getFreelancers(params = {}) { const q = this.buildQueryString(params); return this.request(`/freelancers${q ? `?${q}` : ''}`); }
  async getMyFreelancerProfile() { return this.request('/me/freelancer'); }
  async updateMyFreelancerProfile(profile) { return this.request('/me/freelancer', 'PUT', profile); }

  // ---- v3.2: local services ----
  async getServices(params = {}) { const q = this.buildQueryString(params); return this.request(`/services${q ? `?${q}` : ''}`); }
  async getMyServices() { return this.request('/services/mine'); }
  async getIncomingServiceRequests() { return this.request('/services/requests/incoming'); }
  async getService(id) { return this.request(`/services/${id}`); }
  async createService(service) { return this.request('/services', 'POST', service); }
  async updateService(id, service) { return this.request(`/services/${id}`, 'PUT', service); }
  async deleteService(id) { return this.request(`/services/${id}`, 'DELETE'); }
  async createServiceRequest(serviceId, data) { return this.request(`/services/${serviceId}/requests`, 'POST', data); }
  async updateServiceRequest(id, data) { return this.request(`/service-requests/${id}`, 'PUT', data); }

  // ---- v3.2: scholarships & training ----
  async getScholarships(params = {}) { const q = this.buildQueryString(params); return this.request(`/scholarships${q ? `?${q}` : ''}`); }

  // ---- School administrator portal ----
  async getSchoolAdminMe() { return this.request('/school-admin/me'); }
  async saveSchoolProfile(body) { return this.request('/school-admin/profile', 'PUT', body); }
  async saveSchoolAcademics(body) { return this.request('/school-admin/academics', 'PUT', body); }
  async saveSchoolAdmissions(body) { return this.request('/school-admin/admissions', 'PUT', body); }
  async updateSchoolImages(body) { return this.request('/school-admin/images', 'PUT', body); }
  async addSchoolGalleryPhoto(url, caption) { return this.request('/school-admin/gallery', 'POST', { url, caption }); }
  async deleteSchoolGalleryPhoto(id) { return this.request(`/school-admin/gallery/${id}`, 'DELETE'); }
  async getSchoolAnnouncements() { return this.request('/school-admin/announcements'); }
  async createSchoolAnnouncement(body) { return this.request('/school-admin/announcements', 'POST', body); }
  async deleteSchoolAnnouncement(id) { return this.request(`/school-admin/announcements/${id}`, 'DELETE'); }
  async getSchoolEnquiries() { return this.request('/school-admin/enquiries'); }
  async updateSchoolEnquiry(id, body) { return this.request(`/school-admin/enquiries/${id}`, 'PUT', body); }
  // Verification documents are private: ask the server for a short-lived link, then open it in the browser.
  async openPrivateFile(url) {
    const { Linking } = require('react-native');
    const res = await this.request('/private-files/link', 'POST', { url });
    const origin = String(API_BASE_URL).replace(/\/api\/?$/, '');
    await Linking.openURL(`${origin}${res.path}`);
  }
  async getSchoolVerificationDocs(id) { return this.request(`/admin/schools/${id}/verification-docs`); }
  async addVerificationDocument(body) { return this.request('/school-admin/verification-documents', 'POST', body); }
  async submitVerification() { return this.request('/school-admin/verification/submit', 'POST', {}); }
  async getSchoolStaff() { return this.request('/school-admin/staff'); }
  async inviteSchoolStaff(body) { return this.request('/school-admin/staff', 'POST', body); }
  async removeSchoolStaff(id) { return this.request(`/school-admin/staff/${id}`, 'DELETE'); }
  async getSchoolAnalytics() { return this.request('/school-admin/analytics'); }
  // Public: parents/students contact a school, and the school's published announcements.
  async sendSchoolEnquiry(schoolId, subject, message) { return this.request(`/schools/${schoolId}/enquiries`, 'POST', { subject, message }); }
  async getSchoolPublicAnnouncements(schoolId) { return this.request(`/schools/${schoolId}/announcements`); }
  async recordSchoolContact(schoolId) { return this.request(`/schools/${schoolId}/events`, 'POST', { type: 'contact' }); }

  // Helper method to build query strings
  buildQueryString(params) {
    return Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== null)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  }
}

export default new APIService();
