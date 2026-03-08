import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { UserOutlined, TeamOutlined, DollarOutlined, FileTextOutlined, CalendarOutlined, ShoppingCartOutlined } from '@ant-design/icons';

const { Sider } = Layout;

const Sidebar = ({ collapsed = false, onCollapse = () => {} }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = useMemo(() => [
        {
            key: '/patients',
            icon: <UserOutlined />,
            label: 'Patients',
            onClick: () => navigate('/patients'),
        },
        {
            key: '/employees',
            icon: <TeamOutlined />,
            label: 'Employees',
            onClick: () => navigate('/employees'),
        },
        {
            key: '/rooms',
            icon: <FileTextOutlined />,
            label: 'Rooms',
            onClick: () => navigate('/rooms'),
        },
        {
            key: '/invoices',
            icon: <DollarOutlined />,
            label: 'Invoices',
            onClick: () => navigate('/invoices'),
        },
        {
            key: '/leaves',
            icon: <CalendarOutlined />,
            label: 'Leaves',
            onClick: () => navigate('/leaves'),
        },
        {
            key: '/medicines',
            icon: <ShoppingCartOutlined />,
            label: 'Medicines',
            onClick: () => navigate('/medicines'),
        },
    ], [navigate]);

    // Get current selected key based on location
    const selectedKey = useMemo(() => {
        const pathname = location.pathname;
        return menuItems.find(item => pathname.includes(item.key))?.key || '/patients';
    }, [location.pathname, menuItems]);

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
                position: 'fixed',
                left: 0,
                top: 64,
                bottom: 0,
                zIndex: 100,
                overflow: 'auto',
            }}
            width={200}
            collapsedWidth={80}
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
