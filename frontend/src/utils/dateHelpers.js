import dayjs from 'dayjs';

/**
 * Format date string in YYYY-MM-DD format
 */
export const formatDateFromString = (dateStr) => {
    if (!dateStr) return 'N/A';
    
    try {
        const [year, month, day] = dateStr.split('-');
        if (year && month && day) {
            const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            return dateObj.toLocaleDateString();
        }
        return 'N/A';
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'N/A';
    }
};

/**
 * Format ISO date string or Date object
 */
export const formatDateISO = (date) => {
    if (!date) return 'N/A';
    try {
        return new Date(date).toLocaleDateString();
    } catch (error) {
        return 'N/A';
    }
};

/**
 * Parse date for form (supports dayjs objects, Date objects, and strings)
 */
export const parseDate = (dateValue) => {
    if (!dateValue) return null;

    try {
        if (dayjs.isDayjs(dateValue)) {
            return dateValue;
        }

        const parsed = dayjs(dateValue);

        if (!parsed.isValid()) {
            console.warn('Invalid date:', dateValue);
            return null;
        }

        return parsed;
    } catch (error) {
        console.error('Error parsing date:', error);
        return null;
    }
};

/**
 * Format date for API submission (ISO format)
 */
export const formatDateForAPI = (dateValue) => {
    if (!dateValue) {
        return null;
    }

    try {
        if (dateValue.format && typeof dateValue.format === 'function') {
            return dateValue.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
        }

        if (dateValue instanceof Date) {
            return dateValue.toISOString();
        }

        if (typeof dateValue === 'string') {
            return new Date(dateValue).toISOString();
        }

        return null;
    } catch (error) {
        console.error('Error formatting date for API:', error);
        return null;
    }
};
