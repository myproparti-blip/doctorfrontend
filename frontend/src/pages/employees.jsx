import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Table, Modal, Select, Tooltip, Space, message, Badge, Card, Pagination, Row, Col, Statistic } from 'antd';
import { SearchOutlined, EditOutlined, DeleteOutlined, PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { employeeService } from '../services/api';
import { formatDateFromString } from '../utils/dateHelpers';
import { getIdFromRecord } from '../utils/idHelpers';
import { extractEmployeeStats } from '../utils/statsHelpers';

function EmployeesPage() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [refetchTrigger, setRefetchTrigger] = useState(0);
    const [employeeStats, setEmployeeStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
    });
    const navigate = useNavigate();



    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch employees data
    useEffect(() => {
        const fetchEmployees = async () => {
            setLoading(true);
            try {
                const response = await employeeService.getAllEmployees(
                    currentPage,
                    itemsPerPage,
                    debouncedSearch,
                    null,
                    statusFilter === 'all' ? null : statusFilter
                );

                setEmployees(response.data || []);
                setTotal(response.pagination?.total || 0);

                // Calculate stats on first page load
                if (currentPage === 1 && statusFilter === 'all' && !debouncedSearch) {
                    try {
                        const statsResponse = await employeeService.getEmployeeStats();
                        const extractedStats = extractEmployeeStats(statsResponse);
                        
                        if (extractedStats) {
                            setEmployeeStats(extractedStats);
                        } else {
                            setEmployeeStats({
                                total: response.pagination?.total || 0,
                                active: 0,
                                inactive: 0,
                            });
                        }
                    } catch (error) {
                        console.error('Error fetching employee stats:', error);
                        // Fallback: use total from response
                        setEmployeeStats({
                            total: response.pagination?.total || 0,
                            active: 0,
                            inactive: 0,
                        });
                    }
                }
            } catch (error) {
                message.error(error.message || 'Failed to load employees');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployees();
    }, [currentPage, itemsPerPage, debouncedSearch, statusFilter, refetchTrigger]);

    const handlePageSizeChange = useCallback((page, pageSize) => {
        setItemsPerPage(pageSize);
        setCurrentPage(1);
    }, []);

    const handleDeleteEmployee = useCallback(async (employeeId) => {
        Modal.confirm({
            title: 'Delete Employee',
            content: 'Are you sure you want to delete this employee?',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await employeeService.deleteEmployee(String(employeeId).trim());
                    message.success('Employee deleted successfully');
                    setCurrentPage(1);
                    setStatusFilter('all');
                    setSearchTerm('');
                    setRefetchTrigger(prev => prev + 1);
                } catch (error) {
                    message.error(error.message || 'Failed to delete employee');
                    console.error(error);
                }
            },
        });
    }, []);

    const handleToggleStatus = useCallback(async (employeeId, currentStatus) => {
        let newStatus = 'active';
        let statusLabel = 'activate';

        if (currentStatus === 'active') {
            newStatus = 'inactive';
            statusLabel = 'deactivate';
        } else if (currentStatus === 'inactive') {
            newStatus = 'active';
            statusLabel = 'activate';
        }

        Modal.confirm({
            title: `${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)} Employee`,
            content: `Are you sure you want to ${statusLabel} this employee?`,
            okText: 'Yes',
            okType: statusLabel === 'deactivate' ? 'danger' : 'primary',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await employeeService.updateEmployee(String(employeeId).trim(), { status: newStatus });
                    message.success(`Employee ${statusLabel}d successfully`);
                    setCurrentPage(1);
                    setStatusFilter('all');
                    setSearchTerm('');
                    setRefetchTrigger(prev => prev + 1);
                } catch (error) {
                    message.error(error.message || `Failed to ${statusLabel} employee`);
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
        }, // eslint-disable-next-line react-hooks/exhaustive-deps
        { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
        { title: 'Email', dataIndex: 'email', key: 'email', width: 180 },
        { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 120 },
        { title: 'Department', dataIndex: 'department', key: 'department', width: 130 },
        { title: 'Position', dataIndex: 'position', key: 'position', width: 130 },
        { 
            title: 'Join Date', 
            dataIndex: 'joinDate', 
            key: 'joinDate', 
            width: 120, 
            render: (date) => formatDateFromString(date),
        },
        { 
            title: 'Relieved Date', 
            dataIndex: 'relievedDate', 
            key: 'relievedDate', 
            width: 120, 
            render: (date) => formatDateFromString(date),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status) => {
                const isActive = status === 'active';
                const color = isActive ? 'green' : 'red';
                const text = isActive ? 'Active' : 'Inactive';
                const icon = isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />;
                return <Badge icon={icon} color={color} text={text} />;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_, record) => {
                const employeeId = getIdFromRecord(record);
                
                const handleStatusClick = () => {
                    if (!employeeId) {
                        message.error('Employee ID not found');
                        return;
                    }
                    handleToggleStatus(employeeId, record.status);
                };

                const handleEditClick = () => {
                    if (!employeeId) {
                        message.error('Employee ID not found');
                        return;
                    }
                    navigate(`/addemployee/${employeeId}`, { state: { isEdit: true, employeeData: record } });
                };

                const handleDeleteClick = () => {
                    if (!employeeId) {
                        message.error('Employee ID not found');
                        return;
                    }
                    handleDeleteEmployee(employeeId);
                };

                return (
                    <Space size="small">
                        <Tooltip title={record.status === 'active' ? 'Deactivate' : 'Activate'}>
                            <Button
                                type="text"
                                icon={record.status === 'active' ? '✓' : '✕'}
                                size="small"
                                style={{
                                    color: record.status === 'active' ? 'green' : 'red',
                                }}
                                onClick={handleStatusClick}
                            />
                        </Tooltip>
                        <Tooltip title="Edit">
                            <Button
                                type="text"
                                icon={<EditOutlined />}
                                size="small"
                                onClick={handleEditClick}
                            />
                        </Tooltip>
                        <Tooltip title="Delete">
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                size="small"
                                onClick={handleDeleteClick}
                            />
                        </Tooltip>
                    </Space>
                );
            },
        },
    ], [navigate, currentPage, itemsPerPage, handleDeleteEmployee, handleToggleStatus]);

    return (
        <>
            {/* Employee Status Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} lg={8}>
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
                            title={<span style={{ fontSize: '12px', color: '#999999', fontWeight: '500' }}>Total Employees</span>}
                            value={employeeStats.total}
                            prefix={<TeamOutlined style={{ color: '#0066cc', marginRight: '8px' }} />}
                            valueStyle={{ color: '#0066cc', fontSize: '28px', fontWeight: '700' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
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
                            title={<span style={{ fontSize: '12px', color: '#999999', fontWeight: '500' }}>Active Employees</span>}
                            value={employeeStats.active}
                            prefix={<CheckCircleOutlined style={{ color: '#00a854', marginRight: '8px' }} />}
                            valueStyle={{ color: '#00a854', fontSize: '28px', fontWeight: '700' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
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
                            title={<span style={{ fontSize: '12px', color: '#999999', fontWeight: '500' }}>Inactive Employees</span>}
                            value={employeeStats.inactive}
                            prefix={<CloseCircleOutlined style={{ color: '#d9534f', marginRight: '8px' }} />}
                            valueStyle={{ color: '#d9534f', fontSize: '28px', fontWeight: '700' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Employees Table Card */}
            <Card
                style={{ borderRadius: '12px' }}
                title={
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#333333' }}>Employees</span>
                       <Input placeholder="Search employees..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} size="small" style={{ width: '200px' }} />
                        <Select
                            placeholder="Filter by status"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            style={{ width: '150px', borderRadius: '6px' }}
                            options={[
                                { label: 'All', value: 'all' },
                                { label: 'Active', value: 'active' },
                                { label: 'Inactive', value: 'inactive' },
                            ]}
                        />
                    </div>
                }
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/addemployee')}
                        style={{
                            borderRadius: '6px',
                            fontWeight: '500',
                            height: '32px',
                            paddingInline: '16px',
                        }}
                    >
                        Add Employee
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={employees}
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

export default EmployeesPage;
