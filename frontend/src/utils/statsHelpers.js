// Helper function to safely extract stats from API responses
export const extractPatientStats = (response) => {
    if (!response) {
        return null;
    }

    // API returns: { success: true, data: { summary: { totalPatients, ... }, ... } }
    let statsData = response;

    // Unwrap nested structure
    if (response.data && typeof response.data === 'object') {
        statsData = response.data;
    }

    // Check for summary object (main structure from backend)
    if (statsData.summary && typeof statsData.summary === 'object') {
        const summary = statsData.summary;
        return {
            total: Number(summary.totalPatients) || 0,
            active: Number(summary.activePatients) || 0,
            inactive: Number(summary.inactivePatients) || 0,
            discharged: Number(summary.dischargedPatients) || 0,
        };
    }

    // Fallback for direct properties
    return {
        total: Number(statsData.totalPatients || statsData.total || 0),
        active: Number(statsData.activePatients || statsData.active || 0),
        inactive: Number(statsData.inactivePatients || statsData.inactive || 0),
        discharged: Number(statsData.dischargedPatients || statsData.discharged || 0),
    };
};

export const extractEmployeeStats = (response) => {
    if (!response) {
        console.warn('extractEmployeeStats: No response provided');
        return null;
    }

    ('DEBUG - Employee stats response:', JSON.stringify(response, null, 2));

    // API returns: { success: true, data: { total, active, inactive, byDepartment, ... } }
    const data = response.data || response;

    ('DEBUG - Extracted data:', JSON.stringify(data, null, 2));

    const result = {
        total: Number(data.total) || 0,
        active: Number(data.active) || 0,
        inactive: Number(data.inactive) || 0,
    };
    
    ('DEBUG - Final employee stats:', result);
    return result;
};

export const extractLabStats = (response) => {
    if (!response) {
        console.warn('extractLabStats: No response provided');
        return null;
    }

    ('DEBUG - Lab stats response:', JSON.stringify(response, null, 2));

    // API returns: { success: true, data: { totalTests, pendingTests, completedTests, ... } }
    const data = response.data || response;

    ('DEBUG - Lab stats data:', JSON.stringify(data, null, 2));

    const result = {
        total: Number(data.totalTests) || 0,
        pending: Number(data.pendingTests) || 0,
        completed: Number(data.completedTests) || 0,
    };
    
    ('DEBUG - Final lab stats:', result);
    return result;
};

export const calculateLabStatsFromArray = (labs = []) => {
    const total = labs.length;
    const completed = labs.filter(lab => lab.status === 'completed').length;
    const pending = total - completed;

    return {
        total,
        pending,
        completed,
    };
};
