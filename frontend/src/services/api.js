import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL
// const API_BASE_URL = 'http://localhost:5000/api';

// Loading state management
let loadingCount = 0;
let loadingCallback = null;

export const setLoadingCallback = (callback) => {
    loadingCallback = callback;
};

const setLoading = (isLoading) => {
    if (isLoading) {
        loadingCount++;
    } else {
        loadingCount = Math.max(0, loadingCount - 1);
    }

    // Only call the callback if it's registered
    if (typeof loadingCallback === 'function') {
        loadingCallback(loadingCount > 0);
    }
};

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to include token and show loader
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Show loader on request
        setLoading(true);
        return config;
    },
    (error) => {
        setLoading(false);
        return Promise.reject(error);
    }
);

// Helper function to recursively convert MongoDB ObjectIds to strings
const convertObjectIds = (obj) => {
    if (!obj) return obj;

    if (Array.isArray(obj)) {
        return obj.map(convertObjectIds);
    }

    if (typeof obj === 'object') {
        const converted = {};
        for (const key in obj) {
            if (key === '_id' && obj[key] && typeof obj[key] === 'object') {
                // Convert _id to string
                if (obj[key].$oid) {
                    converted[key] = obj[key].$oid;
                } else if (typeof obj[key].toString === 'function') {
                    const str = obj[key].toString();
                    // Only use toString if it produces a valid ObjectId string (24 hex chars)
                    if (str.match(/^[a-f0-9]{24}$/i)) {
                        converted[key] = str;
                    } else if (str === '[object Object]') {
                        // Empty object - try to get a valid ID from properties
                        converted[key] = null;
                    } else {
                        converted[key] = str;
                    }
                } else {
                    converted[key] = null;
                }
            } else {
                converted[key] = convertObjectIds(obj[key]);
            }
        }
        return converted;
    }

    return obj;
};

// Flag to prevent infinite retry loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    isRefreshing = false;
    failedQueue = [];
};

// Add response interceptor for error handling and loader management
apiClient.interceptors.response.use(
    (response) => {
        // Hide loader on success
        setLoading(false);

        const data = response.data;
        // Convert ObjectIds to strings
        return convertObjectIds(data);
    },
    (error) => {
        const originalRequest = error.config;

        // Handle token expiration with refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return apiClient(originalRequest);
                }).catch((err) => {
                    // Ensure loader is hidden on queue error
                    setLoading(false);
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                // No refresh token available, redirect to login
                setLoading(false);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject({ message: 'Token expired. Please login again.' });
            }

            return apiClient
                .post('/auth/refresh', { refreshToken })
                .then((response) => {
                    const { accessToken } = response;
                    localStorage.setItem('token', accessToken);
                    apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    processQueue(null, accessToken);
                    return apiClient(originalRequest);
                })
                .catch((err) => {
                    processQueue(err, null);
                    setLoading(false);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login';
                    return Promise.reject(err);
                });
        }

        // Hide loader on error
        setLoading(false);

        if (error.response) {
            return Promise.reject(error.response.data || error.message);
        } else if (error.request) {
            return Promise.reject({ message: 'No response from server' });
        } else {
            return Promise.reject(error);
        }
    }
);

const authService = {
    login: async (email, password) => {
        return apiClient.post('/auth/login', { email, password });
    },

    register: async (userData) => {
        return apiClient.post('/auth/register', userData);
    },

    getCurrentUser: async () => {
        return apiClient.get('/auth/me');
    },

    updateProfile: async (profileData) => {
        return apiClient.put('/auth/profile', profileData);
    },

    changePassword: async (currentPassword, newPassword) => {
        return apiClient.post('/auth/change-password', {
            currentPassword,
            newPassword,
        });
    },

    logout: async () => {
        return apiClient.post('/auth/logout');
    },
};

const employeeService = {
    getAllEmployees: async (page = 1, limit = 10, searchTerm = '', department = null, status = null) => {
        const params = { page, limit };
        if (searchTerm) params.searchTerm = searchTerm;
        if (department) params.department = department;
        if (status) params.status = status;
        return apiClient.get('/employees', { params });
    },

    getEmployeeById: async (id) => {
        return apiClient.get(`/employees/${id}`);
    },

    createEmployee: async (employeeData) => {
        return apiClient.post('/employees', employeeData);
    },

    updateEmployee: async (id, employeeData) => {
        return apiClient.put(`/employees/${id}`, employeeData);
    },

    deleteEmployee: async (id) => {
        return apiClient.delete(`/employees/${id}`);
    },

    getEmployeeStats: async () => {
        return apiClient.get('/employees/stats');
    },
};

const patientService = {
    getAllPatients: async (page = 1, limit = 20, searchTerm = '', filterStatus = 'all') => {
        return apiClient.get('/patients', {
            params: {
                page,
                limit,
                searchTerm,
                filterStatus,
            },
        });
    },

    getPatientById: async (id) => {
        return apiClient.get(`/patients/${id}`);
    },

    createPatient: async (patientData) => {
        return apiClient.post('/patients', patientData);
    },

    updatePatient: async (id, patientData) => {
        return apiClient.put(`/patients/${id}`, patientData);
    },

    deletePatient: async (id) => {
        return apiClient.delete(`/patients/${id}`);
    },

    getPatientStats: async () => {
        return apiClient.get('/patients/stats');
    },

    addMedication: async (patientId, medicationData) => {
        return apiClient.post(`/patients/${patientId}/medications`, medicationData);
    },
};

const labService = {
    getLabsByPatient: async (patientId, page = 1, limit = 20, status = 'all', category = 'all') => {
        return apiClient.get(`/labs/patient/${patientId}`, {
            params: {
                page,
                limit,
                status,
                category,
            },
        });
    },

    getLabById: async (id) => {
        return apiClient.get(`/labs/${id}`);
    },

    createLab: async (labData) => {
        return apiClient.post('/labs', labData);
    },

    updateLab: async (id, labData) => {
        return apiClient.put(`/labs/${id}`, labData);
    },

    deleteLab: async (id) => {
        return apiClient.delete(`/labs/${id}`);
    },

    getLabStats: async (patientId) => {
        return apiClient.get(`/labs/patient/${patientId}/stats`);
    },

    getLabsByCategory: async (patientId, category, page = 1, limit = 20) => {
        return apiClient.get(`/labs/patient/${patientId}/category/${category}`, {
            params: {
                page,
                limit,
            },
        });
    },
};

const appointmentService = {
    getAllAppointments: async (page = 1, limit = 20, filterStatus = 'all', date = null) => {
        const params = {
            page,
            limit,
            filterStatus,
        };
        if (date) {
            params.date = date;
        }
        return apiClient.get('/appointments', { params });
    },

    getAppointmentById: async (id) => {
        return apiClient.get(`/appointments/${id}`);
    },

    createAppointment: async (appointmentData) => {
        return apiClient.post('/appointments', appointmentData);
    },

    updateAppointment: async (id, appointmentData) => {
        return apiClient.put(`/appointments/${id}`, appointmentData);
    },

    deleteAppointment: async (id) => {
        return apiClient.delete(`/appointments/${id}`);
    },

    confirmAppointment: async (id) => {
        return apiClient.patch(`/appointments/${id}/confirm`);
    },

    cancelAppointment: async (id, reason = '') => {
        return apiClient.patch(`/appointments/${id}/cancel`, {
            cancellationReason: reason,
        });
    },

    completeAppointment: async (id, notes = '') => {
        return apiClient.patch(`/appointments/${id}/complete`, {
            completionNotes: notes,
        });
    },

    getAppointmentStats: async () => {
        return apiClient.get('/appointments/stats');
    },
};

const recordService = {
    getAllRecords: async (page = 1, limit = 20, filterType = 'all', searchTerm = '') => {
        return apiClient.get('/records', {
            params: {
                page,
                limit,
                filterType,
                searchTerm,
            },
        });
    },

    getRecordById: async (id) => {
        return apiClient.get(`/records/${id}`);
    },

    createRecord: async (recordData) => {
        return apiClient.post('/records', recordData);
    },

    updateRecord: async (id, recordData) => {
        return apiClient.put(`/records/${id}`, recordData);
    },

    deleteRecord: async (id) => {
        return apiClient.delete(`/records/${id}`);
    },

    shareRecord: async (id, userId, visibility = 'shared-with-doctors') => {
        return apiClient.post(`/records/${id}/share`, {
            userId,
            visibility,
        });
    },

    getRecordsByPatient: async (patientId) => {
        return apiClient.get(`/records/patient/${patientId}`);
    },

    getRecordStats: async () => {
        return apiClient.get('/records/stats');
    },
};

const dashboardService = {
    getRealTimeDashboard: async () => {
        try {
            return await apiClient.get('/dashboard');
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getAppointmentChartData: async () => {
        try {
            return await apiClient.get('/dashboard/appointment-chart');
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getHealthTrendData: async () => {
        try {
            return await apiClient.get('/dashboard/health-trend');
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getTopPatients: async () => {
        try {
            return await apiClient.get('/dashboard/top-patients');
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getQuickStats: async () => {
        try {
            return await apiClient.get('/dashboard/quick-stats');
        } catch (error) {
            return { success: false, message: error.message };
        }
    },
};

const analyticsService = {
    getDashboardAnalytics: async () => {
        return apiClient.get('/analytics/dashboard');
    },

    getPatientGrowthAnalytics: async () => {
        return apiClient.get('/analytics/patient-growth');
    },

    getAppointmentTrends: async () => {
        return apiClient.get('/analytics/appointment-trends');
    },

    getDepartmentDistribution: async () => {
        return apiClient.get('/analytics/department-distribution');
    },

    getKeyMetrics: async () => {
        return apiClient.get('/analytics/key-metrics');
    },

    getHealthScoreMetrics: async () => {
        return apiClient.get('/analytics/health-score');
    },

    getPatientRetention: async () => {
        return apiClient.get('/analytics/patient-retention');
    },
};

// Rooms Service
const roomService = {
    getAllRooms: async (page = 1, limit = 10, status = null, search = null) => {
        const params = { page, limit };
        if (status) params.status = status;
        if (search) params.search = search;
        return apiClient.get('/rooms', { params });
    },

    getRoomById: async (id) => {
        return apiClient.get(`/rooms/${id}`);
    },

    createRoom: async (roomData) => {
        return apiClient.post('/rooms', roomData);
    },

    updateRoom: async (id, roomData) => {
        return apiClient.put(`/rooms/${id}`, roomData);
    },

    updateRoomStatus: async (id, status) => {
        return apiClient.patch(`/rooms/${id}/status`, { status });
    },

    deleteRoom: async (id) => {
        return apiClient.delete(`/rooms/${id}`);
    },

    getAvailableRooms: async () => {
        return apiClient.get('/rooms/available');
    },

    getRoomOccupancyReport: async () => {
        return apiClient.get('/rooms/report/occupancy');
    },

    assignPatientToRoom: async (id, patientData) => {
        return apiClient.post(`/rooms/${id}/assign`, patientData);
    },

    releasePatientFromRoom: async (id, patientId) => {
        return apiClient.post(`/rooms/${id}/release`, { patientId });
    },
};

// Invoices Service
const invoiceService = {
    getAllInvoices: async (page = 1, limit = 10, paymentStatus = null) => {
        const params = { page, limit };
        if (paymentStatus) params.paymentStatus = paymentStatus;
        return apiClient.get('/invoices', { params });
    },

    getInvoiceById: async (id) => {
        return apiClient.get(`/invoices/${id}`);
    },

    createInvoice: async (invoiceData) => {
        return apiClient.post('/invoices', invoiceData);
    },

    updateInvoice: async (id, invoiceData) => {
        return apiClient.put(`/invoices/${id}`, invoiceData);
    },

    updatePaymentStatus: async (id, paymentData) => {
        return apiClient.patch(`/invoices/${id}/payment`, paymentData);
    },

    deleteInvoice: async (id) => {
        return apiClient.delete(`/invoices/${id}`);
    },

    getRevenueReport: async (period = 'month') => {
        return apiClient.get('/invoices/revenue-report', { params: { period } });
    },

    getOutstandingInvoices: async (page = 1, limit = 10) => {
        return apiClient.get('/invoices/outstanding', { params: { page, limit } });
    },
};

// Leaves Service
const leaveService = {
    getAllLeaves: async (page = 1, limit = 10, status = null) => {
        const params = { page, limit };
        if (status) params.status = status;
        return apiClient.get('/leaves', { params });
    },

    getLeaveById: async (id) => {
        return apiClient.get(`/leaves/${id}`);
    },

    applyLeave: async (leaveData) => {
        return apiClient.post('/leaves', leaveData);
    },

    updateLeave: async (id, leaveData) => {
        return apiClient.put(`/leaves/${id}`, leaveData);
    },

    approveLeave: async (id) => {
        return apiClient.patch(`/leaves/${id}/approve`);
    },

    rejectLeave: async (id, rejectionReason = '') => {
        return apiClient.patch(`/leaves/${id}/reject`, { rejectionReason });
    },

    cancelLeave: async (id) => {
        return apiClient.patch(`/leaves/${id}/cancel`);
    },

    getPendingLeaves: async (page = 1, limit = 10) => {
        return apiClient.get('/leaves/pending', { params: { page, limit } });
    },

    getEmployeeLeaveBalance: async (employeeId) => {
        return apiClient.get(`/leaves/employee/${employeeId}/balance`);
    },

    getLeaveSummaryReport: async () => {
        return apiClient.get('/leaves/report/summary');
    },
};

// Medicines Service
const medicineService = {
    getAllMedicines: async (page = 1, limit = 10, category = null, search = null) => {
        const params = { page, limit };
        if (category) params.category = category;
        if (search) params.search = search;
        return apiClient.get('/medicines', { params });
    },

    getMedicineById: async (id) => {
        return apiClient.get(`/medicines/${id}`);
    },

    createMedicine: async (medicineData) => {
        return apiClient.post('/medicines', medicineData);
    },

    updateMedicine: async (id, medicineData) => {
        return apiClient.put(`/medicines/${id}`, medicineData);
    },

    updateMedicineQuantity: async (id, quantity, operation) => {
        return apiClient.patch(`/medicines/${id}/quantity`, { quantity, operation });
    },

    deleteMedicine: async (id) => {
        return apiClient.delete(`/medicines/${id}`);
    },

    getLowStockMedicines: async () => {
        return apiClient.get('/medicines/report/low-stock');
    },

    getExpiringMedicines: async (days = 30) => {
        return apiClient.get('/medicines/report/expiring', { params: { days } });
    },

    getMedicineInventoryReport: async () => {
        return apiClient.get('/medicines/report/inventory');
    },
};

export {
    apiClient,
    authService,
    employeeService,
    patientService,
    labService,
    appointmentService,
    recordService,
    dashboardService,
    analyticsService,
    roomService,
    invoiceService,
    leaveService,
    medicineService,
};
