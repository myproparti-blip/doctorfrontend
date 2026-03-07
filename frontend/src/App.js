import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Layout, Spin, Button } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import './App.css';
import GlobalLoader from './components/GlobalLoader.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import AppHeader from './components/AppHeader.jsx';
import Sidebar from './components/Sidebar.jsx';
import FloatingWhatsappButton from './components/FloatingWhatsappButton.jsx';

// Lazy load route components
const Login = lazy(() => import('./pages/login.jsx'));
const Register = lazy(() => import('./pages/register.jsx'));
const AddPatient = lazy(() => import('./pages/addpatient.jsx'));
const PatientsView = lazy(() => import('./pages/patients.jsx'));
const LabsPage = lazy(() => import('./pages/labs.jsx'));
const AddLabs = lazy(() => import('./pages/addlabs.jsx'));
const EmployeesPage = lazy(() => import('./pages/employees.jsx'));
const AddEmployee = lazy(() => import('./pages/addemployee.jsx'));
const RoomsView = lazy(() => import('./pages/rooms.jsx'));
const AddRoom = lazy(() => import('./pages/addrooms.jsx'));
const InvoicesView = lazy(() => import('./pages/invoices.jsx'));
const AddInvoice = lazy(() => import('./pages/addinvoice.jsx'));
const LeavesView = lazy(() => import('./pages/leaves.jsx'));
const AddLeave = lazy(() => import('./pages/addleave.jsx'));
const MedicinesView = lazy(() => import('./pages/medicines.jsx'));
const AddMedicine = lazy(() => import('./pages/addmedicine.jsx'));

// Loading fallback component
const LoadingFallback = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
    </div>
);

function App() {
    return (
        <ErrorBoundary>
            <Router>
                <GlobalLoader />
                <FloatingWhatsappButton />
                <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                         <Route path="/login" element={<Login />} />
                         <Route path="/register" element={<Register />} />
                         <Route path="/add-patient" element={<AddPatient />} />
                         <Route path="/edit-patient/:id" element={<AddPatient />} />
                         <Route path="/" element={<MainApp selectedMenuId="1" />} />
                         <Route path="/patients" element={<MainApp selectedMenuId="1" />} />
                         <Route path="/labs" element={<LabsPage />} />
                         <Route path="/addlabs" element={<AddLabs />} />
                         <Route path="/addlabs/:labId" element={<AddLabs />} />
                         <Route path="/employees" element={<MainApp selectedMenuId="2" />} />
                         <Route path="/addemployee" element={<AddEmployee />} />
                         <Route path="/addemployee/:id" element={<AddEmployee />} />
                         <Route path="/rooms" element={<MainApp selectedMenuId="3" />} />
                         <Route path="/addrooms" element={<AddRoom />} />
                         <Route path="/addrooms/:id" element={<AddRoom />} />
                         <Route path="/invoices" element={<MainApp selectedMenuId="4" />} />
                         <Route path="/addinvoice" element={<AddInvoice />} />
                         <Route path="/addinvoice/:id" element={<AddInvoice />} />
                         <Route path="/leaves" element={<MainApp selectedMenuId="5" />} />
                         <Route path="/addleave" element={<AddLeave />} />
                         <Route path="/addleave/:id" element={<AddLeave />} />
                         <Route path="/medicines" element={<MainApp selectedMenuId="6" />} />
                         <Route path="/addmedicine" element={<AddMedicine />} />
                         <Route path="/addmedicine/:id" element={<AddMedicine />} />
                         </Routes>
                </Suspense>
            </Router>
        </ErrorBoundary>
    );
}

function MainApp({ selectedMenuId = '1' }) {
    const [selectedMenu, setSelectedMenu] = useState(selectedMenuId);
    const [user, setUser] = useState(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (error) {
                console.error('Error parsing user data:', error);
                navigate('/login', { replace: true });
            }
        } else {
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    // Update selected menu when route changes
    useEffect(() => {
        setSelectedMenu(selectedMenuId);
    }, [selectedMenuId]);

    const renderContent = useMemo(() => {
        if (selectedMenu === '1') {
            return <PatientsView user={user} />;
        } else if (selectedMenu === '2') {
            return <EmployeesPage />;
        } else if (selectedMenu === '3') {
            return <RoomsView />;
        } else if (selectedMenu === '4') {
            return <InvoicesView />;
        } else if (selectedMenu === '5') {
            return <LeavesView />;
        } else if (selectedMenu === '6') {
            return <MedicinesView />;
        }
        return <PatientsView user={user} />;
    }, [selectedMenu, user]);

    return (
        <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 100%)' }}>
            <Layout.Header style={{ 
                background: '#ffffff', 
                padding: '0 24px', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 999,
                borderBottom: '1px solid #e8e8e8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Button
                        type="text"
                        icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        style={{ fontSize: '18px', color: '#0066cc' }}
                    />
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#0066cc' }}>MediCare</div>
                </div>
                <AppHeader selectedMenuId={selectedMenu} user={user} />
            </Layout.Header>

            <Layout style={{ marginTop: '64px', marginLeft: sidebarCollapsed ? '80px' : '200px', transition: 'margin-left 0.2s' }}>
                <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
                <Layout.Content style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 100%)' }}>
                    <div style={{ width: '100%' }}>
                        {renderContent}
                    </div>
                </Layout.Content>
            </Layout>
        </Layout>
    );
}

export default App;

