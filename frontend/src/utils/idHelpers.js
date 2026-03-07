/**
 * Safely extract ID from various MongoDB ObjectId formats
 */
export const getIdFromRecord = (record) => {
    if (!record) {
        console.warn('Record is null/undefined');
        return null;
    }

    if (!record._id) {
        console.warn('Record has no _id field:', record);
        return null;
    }

    const id = record._id;
    ('Extracting ID from:', id, 'Type:', typeof id);

    // If it's already a string, return it
    if (typeof id === 'string') {
        ('ID is string:', id);
        return id;
    }

    // If it's an object with $oid (MongoDB Extended JSON format)
    if (id && typeof id === 'object' && id.$oid) {
        ('ID has $oid:', id.$oid);
        return id.$oid;
    }

    // Try to convert to string
    const idStr = String(id);
    if (idStr && idStr !== '[object Object]') {
        ('ID converted to string:', idStr);
        return idStr;
    }

    console.warn('Could not extract ID from:', id);
    return null;
};

/**
 * Safely convert ID to string with trimming
 */
export const idToString = (id) => {
    if (!id) return null;
    return String(id).trim();
};
