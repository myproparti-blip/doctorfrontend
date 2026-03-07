import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Table, Modal, Select, Tooltip, Space, message, Badge, Card, Pagination, Row, Col, Statistic } from 'antd';
import { EditOutlined, DeleteOutlined, FileTextOutlined, UserOutlined, CheckCircleOutlined, StopOutlined, LogoutOutlined, PlusOutlined } from '@ant-design/icons';
import { patientService } from '../services/api';
import { formatDateFromString, formatDateISO } from '../utils/dateHelpers';
import { getIdFromRecord } from '../utils/idHelpers';
import { extractPatientStats } from '../utils/statsHelpers';

function PatientsView({ user }) {
     const [patients, setPatients] = useState([]);
     const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [statusFilter, setStatusFilter] = useState('all');
    const [refetchTrigger, setRefetchTrigger] = useState(0);
    const [patientStats, setPatientStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        discharged: 0,
    });
    const navigate = useNavigate();

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch patients data
    useEffect(() => {
        const fetchPatients = async () => {
            setLoading(true);
            try {
                const response = await patientService.getAllPatients(
                    currentPage,
                    itemsPerPage,
                    debouncedSearch,
                    statusFilter === 'all' ? 'all' : statusFilter
                );

                setPatients(response.data || []);
                setTotal(response.total || response.pagination?.total || 0);

                // Fetch stats only on initial load (page 1, no filters)
                if (currentPage === 1 && statusFilter === 'all' && !debouncedSearch) {
                    try {
                        const statsResponse = await patientService.getPatientStats();
                        const extractedStats = extractPatientStats(statsResponse);
                        
                        if (extractedStats) {
                            setPatientStats(extractedStats);
                        }
                    } catch (error) {
                        console.error('Error fetching patient stats:', error);
                    }
                }
            } catch (error) {
                message.error(error.message || 'Failed to load patients');
                console.error(error);
            }
        };

        fetchPatients();
    }, [currentPage, itemsPerPage, debouncedSearch, statusFilter, refetchTrigger]);

    const handlePageSizeChange = useCallback((page, pageSize) => {
        setItemsPerPage(pageSize);
        setCurrentPage(1);
    }, []);

    const handleToggleStatus = useCallback(async (patientId, currentStatus) => {
        let newStatus = 'active';
        let statusLabel = 'activate';
        
        if (currentStatus === 'active') {
            newStatus = 'inactive';
            statusLabel = 'deactivate';
        } else if (currentStatus === 'inactive') {
            newStatus = 'discharged';
            statusLabel = 'discharge';
        } else if (currentStatus === 'discharged') {
            newStatus = 'active';
            statusLabel = 'reactivate';
        }
        
        Modal.confirm({
            title: `${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)} Patient`,
            content: `Are you sure you want to ${statusLabel} this patient?`,
            okText: 'Yes',
            okType: statusLabel === 'deactivate' ? 'danger' : 'primary',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await patientService.updatePatient(String(patientId).trim(), { status: newStatus });
                    message.success(`Patient ${statusLabel}d successfully`);
                    setCurrentPage(1);
                    setStatusFilter('all');
                    setSearchTerm('');
                    setRefetchTrigger(prev => prev + 1);
                } catch (error) {
                    message.error(error.message || `Failed to ${statusLabel} patient`);
                    console.error(error);
                }
            },
        });
    }, []);

    const handleDeletePatient = useCallback(async (patientId) => {
        Modal.confirm({
            title: 'Delete Patient',
            content: 'Are you sure you want to delete this patient?',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await patientService.deletePatient(String(patientId).trim());
                    message.success('Patient deleted successfully');
                    setCurrentPage(1);
                    setStatusFilter('all');
                    setSearchTerm('');
                    setRefetchTrigger(prev => prev + 1);
                } catch (error) {
                    message.error(error.message || 'Failed to delete patient');
                    console.error(error);
                }
            },
        });
    }, []);

    const columns = useMemo(() => [
        {
            title: 'SL No',
            key: 'slNo',
            width: 60,
            render: (_, __, index) => ((currentPage - 1) * itemsPerPage) + index + 1,
        },
        { title: 'Name', dataIndex: 'name', key: 'name', width: 130 },
        { title: 'Email', dataIndex: 'email', key: 'email', width: 160 },
        { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 120 },
        { title: 'City', dataIndex: 'city', key: 'city', width: 110 },
        { title: 'State', dataIndex: 'state', key: 'state', width: 110 },
        { title: 'Condition', dataIndex: 'condition', key: 'condition', width: 120 },
        { title: 'Risk', dataIndex: 'risk', key: 'risk', width: 100, render: (risk) => <Badge color={risk === 'High' ? 'red' : risk === 'Medium' ? 'orange' : 'green'} text={risk} /> },
        { 
            title: 'Join Date', 
            dataIndex: 'joinDate', 
            key: 'joinDate',
            render: (date) => formatDateFromString(date),
        },
        { 
            title: 'Relieved Date', 
            dataIndex: 'relievedDate', 
            key: 'relievedDate',
            render: (date) => formatDateFromString(date),
        },
        { 
            title: 'Last Checkup', 
            dataIndex: 'lastCheckup', 
            key: 'lastCheckup',
            render: (date) => formatDateISO(date),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'red';
                let text = 'Inactive';
                if (status === 'active') {
                    color = 'green';
                    text = 'Active';
                } else if (status === 'discharged') {
                    color = 'blue';
                    text = 'Discharged';
                }
                return <Badge color={color} text={text} />;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => {
                const patientId = getIdFromRecord(record);

                const handleEdit = () => {
                    if (!patientId) {
                        message.error('Patient ID not found');
                        return;
                    }
                    navigate(`/edit-patient/${patientId}`, { state: { patient: record } });
                };

                const handleDelete = () => {
                    if (!patientId) {
                        message.error('Patient ID not found');
                        return;
                    }
                    handleDeletePatient(patientId);
                };

                const handleToggle = () => {
                    if (!patientId) {
                        message.error('Patient ID not found');
                        return;
                    }
                    handleToggleStatus(patientId, record.status);
                };

                return (
                    <Space>
                        <Tooltip title={record.status === 'active' ? 'Deactivate' : record.status === 'inactive' ? 'Discharge' : 'Reactivate'}>
                            <Button
                                type="text"
                                icon={record.status === 'active' ? '✓' : record.status === 'inactive' ? '✕' : '↻'}
                                size="small"
                                style={{
                                    color: record.status === 'active' ? 'green' : record.status === 'inactive' ? 'red' : 'blue',
                                }}
                                onClick={handleToggle}
                            />
                        </Tooltip>
                        <Tooltip title="View Labs">
                            <Button
                                type="text"
                                icon={<FileTextOutlined />}
                                size="small"
                                onClick={() => navigate('/labs', { state: { patientId, patientData: record } })}
                            />
                        </Tooltip>
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            size="small"
                            title="Edit"
                            onClick={handleEdit}
                        />
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            title="Delete"
                            onClick={handleDelete}
                        />
                    </Space>
                );
            },
        },
    ], [navigate, currentPage, itemsPerPage, handleDeletePatient, handleToggleStatus]);

    return (
        <>
            {/* Patient Status Cards */}
            <Row gutter={[12, 12]} style={{ marginBottom: '16px' }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: statusFilter === 'all' ? '1px solid #0066cc' : '1px solid #e8e8e8',
                        }}
                        hoverable
                        onClick={() => {
                            setStatusFilter('all');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title={<span style={{ fontSize: '12px', color: '#999999', fontWeight: '500' }}>Total Patients</span>}
                            value={patientStats.total}
                            prefix={<UserOutlined style={{ color: '#0066cc', marginRight: '8px' }} />}
                            valueStyle={{ color: '#0066cc', fontSize: '28px', fontWeight: '700' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: statusFilter === 'active' ? '1px solid #00a854' : '1px solid #e8e8e8',
                        }}
                        hoverable
                        onClick={() => {
                            setStatusFilter('active');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title={<span style={{ fontSize: '12px', color: '#999999', fontWeight: '500' }}>Active Patients</span>}
                            value={patientStats.active}
                            prefix={<CheckCircleOutlined style={{ color: '#00a854', marginRight: '8px' }} />}
                            valueStyle={{ color: '#00a854', fontSize: '28px', fontWeight: '700' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: statusFilter === 'inactive' ? '1px solid #d9534f' : '1px solid #e8e8e8',
                        }}
                        hoverable
                        onClick={() => {
                            setStatusFilter('inactive');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title={<span style={{ fontSize: '12px', color: '#999999', fontWeight: '500' }}>Inactive Patients</span>}
                            value={patientStats.inactive}
                            prefix={<StopOutlined style={{ color: '#d9534f', marginRight: '8px' }} />}
                            valueStyle={{ color: '#d9534f', fontSize: '28px', fontWeight: '700' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: statusFilter === 'discharged' ? '1px solid #0066cc' : '1px solid #e8e8e8',
                        }}
                        hoverable
                        onClick={() => {
                            setStatusFilter('discharged');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title={<span style={{ fontSize: '12px', color: '#999999', fontWeight: '500' }}>Discharged Patients</span>}
                            value={patientStats.discharged}
                            prefix={<LogoutOutlined style={{ color: '#0066cc', marginRight: '8px' }} />}
                            valueStyle={{ color: '#0066cc', fontSize: '28px', fontWeight: '700' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Patients Table Card */}
            <Card
                style={{ borderRadius: '12px' }}
                title={
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#333333' }}>Patients</span>
                        <Input placeholder="Search patients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} size="small" style={{ width: '200px' }} />
                        <Select
                            placeholder="Filter by status"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            style={{ width: '150px', borderRadius: '6px' }}
                            options={[
                                { label: 'All', value: 'all' },
                                { label: 'Active', value: 'active' },
                                { label: 'Inactive', value: 'inactive' },
                                { label: 'Discharged', value: 'discharged' },
                            ]}
                        />
                    </div>
                }
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/add-patient')}
                        style={{
                            borderRadius: '6px',
                            fontWeight: '500',
                            height: '32px',
                            paddingInline: '16px',
                        }}
                    >
                        Add Patient
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={patients}
                    rowKey="_id"
                    pagination={false}
                    style={{ marginBottom: '16px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                    <Pagination
                        current={currentPage}
                        pageSize={itemsPerPage}
                        total={total}
                        onChange={(page) => setCurrentPage(page)}
                        onShowSizeChange={handlePageSizeChange}
                        pageSizeOptions={['10', '20', '50', '100']}
                        showSizeChanger
                        showQuickJumper={false}
                        disabled={Math.ceil(total / itemsPerPage) <= 1}
                    />
                </div>
            </Card>
        </>
    );
    }
export default PatientsView;
