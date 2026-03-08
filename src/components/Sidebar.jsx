import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { HomeOutlined, UserOutlined, TeamOutlined, DollarOutlined, FileTextOutlined, CalendarOutlined, ShoppingCartOutlined } from '@ant-design/icons';

const { Sider } = Layout;

const Sidebar = ({ collapsed = false, onCollapse = () => {}, isMobile = false }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = useMemo(() => [
        {
            key: '/dashboard',
            icon: <HomeOutlined />,
            label: 'Dashboard',
            onClick: () => {
                navigate('/dashboard');
                if (isMobile) onCollapse(true);
            },
        },
        {
            key: '/patients',
            icon: <UserOutlined />,
            label: 'Patients',
            onClick: () => {
                navigate('/patients');
                if (isMobile) onCollapse(true);
            },
        },
        {
            key: '/employees',
            icon: <TeamOutlined />,
            label: 'Employees',
            onClick: () => {
                navigate('/employees');
                if (isMobile) onCollapse(true);
            },
        },
        {
            key: '/rooms',
            icon: <FileTextOutlined />,
            label: 'Rooms',
            onClick: () => {
                navigate('/rooms');
                if (isMobile) onCollapse(true);
            },
        },
        {
            key: '/invoices',
            icon: <DollarOutlined />,
            label: 'Invoices',
            onClick: () => {
                navigate('/invoices');
                if (isMobile) onCollapse(true);
            },
        },
        {
            key: '/leaves',
            icon: <CalendarOutlined />,
            label: 'Leaves',
            onClick: () => {
                navigate('/leaves');
                if (isMobile) onCollapse(true);
            },
        },
        {
            key: '/medicines',
            icon: <ShoppingCartOutlined />,
            label: 'Medicines',
            onClick: () => {
                navigate('/medicines');
                if (isMobile) onCollapse(true);
            },
        },
    ], [navigate, isMobile, onCollapse]);

    // Get current selected key based on location
    const selectedKey = useMemo(() => {
        const pathname = location.pathname;
        // If path is "/" (root), select dashboard
        if (pathname === '/') {
            return '/dashboard';
        }
        return menuItems.find(item => pathname.includes(item.key))?.key || '/dashboard';
    }, [location.pathname, menuItems]);

    const headerHeight = isMobile ? '56px' : '64px';
    const sidebarWidth = isMobile ? 0 : 200;
    const sidebarDisplay = isMobile && collapsed ? 'none' : 'block';

    return (
        <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={onCollapse}
            trigger={null}
            style={{
                background: '#ffffff',
                boxShadow: '1px 0 3px rgba(0, 0, 0, 0.08)',
                borderRight: '1px solid #e8e8e8',
                position: isMobile ? 'fixed' : 'fixed',
                left: 0,
                top: headerHeight,
                bottom: 0,
                zIndex: isMobile ? 98 : 100,
                overflow: 'auto',
                display: isMobile && collapsed ? 'none' : 'block',
                width: isMobile && collapsed ? 0 : sidebarWidth,
            }}
            width={isMobile ? 200 : 200}
            collapsedWidth={isMobile ? 0 : 80}
        >
            <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                items={menuItems}
                style={{
                    border: 'none',
                    paddingTop: '16px',
                }}
                theme="light"
            />
        </Sider>
    );
};

export default Sidebar;
