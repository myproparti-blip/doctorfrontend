import React, { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { setLoadingCallback } from '../services/api';

const GlobalLoader = () => {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Register the loading callback with the API client
        const callback = (loading) => {
            setIsLoading(loading);
        };
        setLoadingCallback(callback);

        // Cleanup to prevent memory leaks
        return () => {
            setLoadingCallback(null);
        };
    }, []);

    return (
        <>
            {isLoading && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                    }}
                >
                    <Spin 
                        size="large" 
                        tip="Loading..."
                        style={{
                            backgroundColor: 'white',
                            padding: '40px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                        }}
                    />
                </div>
            )}
        </>
    );
};

export default GlobalLoader;
