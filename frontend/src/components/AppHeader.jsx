import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, message, Avatar } from 'antd';
import { UserOutlined, PoweroffOutlined } from '@ant-design/icons';
import { authService } from '../services/api';

const AppHeader = ({ selectedMenuId = '1', user = null }) => {
    const navigate = useNavigate();

    const handleLogout = useCallback(async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('refreshToken');
            message.success('Logged out successfully');
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    const userMenuItems = useMemo(() => [
        {
            key: 'profile',
            label: `${user?.name || 'User'}`,
            icon: <UserOutlined />,
            disabled: true,
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            label: 'Logout',
            icon: <PoweroffOutlined />,
            onClick: handleLogout,
        },
    ], [user?.name, handleLogout]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
                <Avatar
                    size={40}
                    style={{
                        backgroundColor: '#0066cc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600',
                    }}
                    icon={<UserOutlined style={{ fontSize: '20px' }} />}
                />
            </Dropdown>
        </div>
    );
};

export default AppHeader;
