import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Table, Button, Input, Select, Tooltip, Space, message, Tag, Modal, Layout, Row, Col, Statistic } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, CheckCircleOutlined, HourglassOutlined, FileTextOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { labService } from '../services/api';
import { formatDateISO } from '../utils/dateHelpers';
import { getIdFromRecord } from '../utils/idHelpers';
import { extractLabStats, calculateLabStatsFromArray } from '../utils/statsHelpers';
import AppHeader from '../components/AppHeader.jsx';
import Sidebar from '../components/Sidebar.jsx';

const { Content } = Layout;

const LabsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const patientId = location.state?.patientId;
    const patientData = location.state?.patientData;
    const [user, setUser] = useState(null);
    const [labs, setLabs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [refetchTrigger, setRefetchTrigger] = useState(0);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [labStats, setLabStats] = useState({
        total: 0,
        pending: 0,
        completed: 0,
    });

    const fetchPatientLabs = useCallback(async (filterStatus = statusFilter) => {
        try {
            const result = await labService.getLabsByPatient(patientId, 1, 100, filterStatus);
            let labData = [];
            if (result && result.data && Array.isArray(result.data)) {
                labData = result.data;
            } else if (result && Array.isArray(result)) {
                labData = result;
            } else {
                message.error('Failed to load labs');
                return;
            }
            setLabs(labData);

            // Calculate stats when showing all labs
            if (filterStatus === 'all') {
                try {
                    const statsResponse = await labService.getLabStats(patientId);
                    const extractedStats = extractLabStats(statsResponse);
                    if (extractedStats && (extractedStats.total > 0 || extractedStats.pending > 0 || extractedStats.completed > 0)) {
                        setLabStats(extractedStats);
                    } else {
                        // Fallback to client-side calculation if API returns empty
                        const calculatedStats = calculateLabStatsFromArray(labData);
                        setLabStats(calculatedStats);
                    }
                } catch (error) {
                    // Fallback to client-side calculation
                    console.error('Error fetching lab stats:', error);
                    const calculatedStats = calculateLabStatsFromArray(labData);
                    setLabStats(calculatedStats);
                }
            }
        } catch (error) {
            if (error.status !== 429) {
                message.error(error.message || 'Failed to load labs');
            }
            }
    }, [patientId, statusFilter]);

    useEffect(() => {
        if (!patientId) {
            navigate('/patients', { replace: true });
            return;
        }
        fetchPatientLabs('all');
    }, [patientId, navigate, refetchTrigger, fetchPatientLabs]);

    useEffect(() => {
        // Get user data from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        } else {
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    const handleDeleteLab = useCallback((labId) => {
        Modal.confirm({
            title: 'Delete Lab Test',
            content: 'Are you sure you want to delete this lab test?',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await labService.deleteLab(labId);
                    message.success('Lab test deleted successfully');
                    setSearchTerm('');
                    setStatusFilter('all');
                    setRefetchTrigger(prev => prev + 1);
                } catch (error) {
                    message.error(error.message || 'Failed to delete lab test');
                }
            },
        });
    }, []);

    const handleEditLab = useCallback((lab) => {
        const labId = getIdFromRecord(lab);
        navigate(`/addlabs/${labId}`, { state: { patientId, patientData, isEdit: true, labData: lab, returnTo: 'labs' } });
    }, [navigate, patientId, patientData]);

    const handleToggleStatus = useCallback(async (labId, currentStatus) => {
        const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
        const statusLabel = newStatus === 'completed' ? 'Mark as Completed' : 'Mark as Pending';

        Modal.confirm({
            title: statusLabel,
            content: `Are you sure you want to ${statusLabel.toLowerCase()}?`,
            okText: 'Yes',
            okType: 'primary',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await labService.updateLab(labId, { status: newStatus });
                    message.success(`Status updated to ${newStatus}`);
                    setSearchTerm('');
                    setStatusFilter('all');
                    setRefetchTrigger(prev => prev + 1);
                } catch (error) {
                    message.error(error.message || 'Failed to update status');
                }
            },
        });
    }, []);

    const filteredLabs = labs.filter(lab => {
        const matchesSearch = (lab.testName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                            (lab.category?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                            (lab.doctor?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || lab.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const columns = useMemo(() => [
        {
            title: 'SL No',
            key: 'slNo',
            width: 60,
            render: (_, __, index) => index + 1,
        },
        { 
            title: 'Test ID', 
            dataIndex: '_id', 
            key: '_id', 
            width: 100, 
            render: (id) => {
                if (!id) return 'N/A';
                const idStr = typeof id === 'string' ? id : id?.toString?.() || '';
                return idStr.slice(-8) || 'N/A';
            }
        },
        { title: 'Test Name', dataIndex: 'testName', key: 'testName', width: 130 },
        { title: 'Category', dataIndex: 'category', key: 'category', width: 120 },
        { title: 'Doctor', dataIndex: 'doctor', key: 'doctor', width: 120 },
        { title: 'Lab Name', dataIndex: 'labName', key: 'labName', width: 150 },
        { title: 'Date', dataIndex: 'date', key: 'date', width: 110, render: (date) => formatDateISO(date) },
        { title: 'Result', dataIndex: 'result', key: 'result', width: 100 },
        { title: 'Normal Range', dataIndex: 'normalRange', key: 'normalRange', width: 130 },
        { title: 'Units', dataIndex: 'units', key: 'units', width: 80 },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (status) => {
                if (!status) return <Tag>N/A</Tag>;
                const color = status === 'completed' ? 'green' : 'orange';
                return <Tag color={color}>{status?.toUpperCase() || 'N/A'}</Tag>;
            },
        },
        { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', width: 140 },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_, record) => (
                <Space>
                    <Tooltip title={record.status === 'completed' ? 'Mark as Pending' : 'Mark as Completed'}>
                        <Button
                            type="text"
                            icon={record.status === 'completed' ? '✓' : '◯'}
                            size="small"
                            style={{
                                color: record.status === 'completed' ? 'green' : 'orange',
                            }}
                            onClick={() => handleToggleStatus(record._id, record.status)}
                        />
                    </Tooltip>
                    <Tooltip title="Edit">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => handleEditLab(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            onClick={() => handleDeleteLab(record._id)}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ], [handleToggleStatus, handleEditLab, handleDeleteLab]);

    return (
        <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #eef2f5 100%)' }}>
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
                <AppHeader selectedMenuId="1" user={user} />
            </Layout.Header>

            <Layout style={{ marginTop: '64px', marginLeft: sidebarCollapsed ? '80px' : '200px', transition: 'margin-left 0.2s' }}>
                <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
                <Content style={{ padding: '24px' }}>
                {!patientId ? (
                    <Card><p>No patient selected</p></Card>
                ) : (
                    <>
                        {/* Lab Test Status Cards */}
                        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                            <Col xs={24} sm={12} lg={8}>
                                <Card
                                    bordered={false}
                                    style={{
                                        borderRadius: '12px',
                                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                        background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        border: statusFilter === 'all' ? '1px solid #1890ff' : '1px solid #f0f0f0',
                                    }}
                                    hoverable
                                    onClick={() => setStatusFilter('all')}
                                >
                                    <Statistic
                                        title={<span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Tests</span>}
                                        value={labStats.total}
                                        prefix={<FileTextOutlined style={{ color: '#1890ff', marginRight: '8px' }} />}
                                        valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: '700' }}
                                    />
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} lg={8}>
                                <Card
                                    bordered={false}
                                    style={{
                                        borderRadius: '12px',
                                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                        background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        border: statusFilter === 'pending' ? '1px solid #faad14' : '1px solid #f0f0f0',
                                    }}
                                    hoverable
                                    onClick={() => setStatusFilter('pending')}
                                >
                                    <Statistic
                                        title={<span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Pending Tests</span>}
                                        value={labStats.pending}
                                        prefix={<HourglassOutlined style={{ color: '#faad14', marginRight: '8px' }} />}
                                        valueStyle={{ color: '#faad14', fontSize: '28px', fontWeight: '700' }}
                                    />
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} lg={8}>
                                <Card
                                    bordered={false}
                                    style={{
                                        borderRadius: '12px',
                                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                        background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        border: statusFilter === 'completed' ? '1px solid #52c41a' : '1px solid #f0f0f0',
                                    }}
                                    hoverable
                                    onClick={() => setStatusFilter('completed')}
                                >
                                    <Statistic
                                        title={<span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Completed Tests</span>}
                                        value={labStats.completed}
                                        prefix={<CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />}
                                        valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: '700' }}
                                    />
                                </Card>
                            </Col>
                        </Row>

                        {/* Lab Tests Table Card */}
                        <Card
                            style={{ borderRadius: '12px' }}
                            title={
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#000' }}>Lab Tests</span>
                                   <Input
                                    placeholder="Search tests..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    size="small"
                                    style={{ width: '200px' }}
                                   />
                                    <Select
                                        placeholder="Filter by status"
                                        value={statusFilter}
                                        onChange={setStatusFilter}
                                        style={{ width: '150px', borderRadius: '6px' }}
                                        options={[
                                            { label: 'All', value: 'all' },
                                            { label: 'Pending', value: 'pending' },
                                            { label: 'Completed', value: 'completed' },
                                        ]}
                                    />
                                </div>
                            }
                            extra={
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => navigate('/addlabs', { state: { patientId, patientData, returnTo: 'labs' } })}
                                    style={{
                                        borderRadius: '6px',
                                        fontWeight: '500',
                                        height: '32px',
                                        paddingInline: '16px',
                                    }}
                                >
                                    Add Lab Test
                                </Button>
                            }
                        >
                            <Table
                                columns={columns}
                                dataSource={filteredLabs}
                                rowKey="_id"
                                pagination={false}
                                style={{ marginBottom: '16px' }}
                            />
                        </Card>
                    </>
                )}
                </Content>
            </Layout>
        </Layout>
    );
};

export default LabsPage;
