import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Table, Modal, Select, Tooltip, Space, message, Badge, Card, Pagination, Row, Col, Statistic, Dropdown } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, TeamOutlined, EyeOutlined } from '@ant-design/icons';
import { leaveService } from '../services/api';
import { formatDateFromString } from '../utils/dateHelpers';

function LeavesView() {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [refetchTrigger, setRefetchTrigger] = useState(0);
    const [leaveStats, setLeaveStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
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

    // Fetch leaves data
     useEffect(() => {
         const fetchLeaves = async () => {
             setLoading(true);
             try {
                 const response = await leaveService.getAllLeaves(
                     currentPage,
                     itemsPerPage,
                     statusFilter === 'all' ? null : statusFilter
                 );

                 const leaveData = response.data || (response.leaves ? response.leaves.data || [] : []);
                 setLeaves(Array.isArray(leaveData) ? leaveData : []);
                 setTotal(response.pagination?.total || response.total || 0);

                if (currentPage === 1 && statusFilter === 'all') {
                    const leavesData = response.data || [];
                    const stats = {
                        total: leavesData.length,
                        pending: leavesData.filter(l => l.status === 'pending').length,
                        approved: leavesData.filter(l => l.status === 'approved').length,
                        rejected: leavesData.filter(l => l.status === 'rejected').length,
                    };
                    setLeaveStats(stats);
                }
            } catch (error) {
                message.error(error.message || 'Failed to load leaves');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaves();
    }, [currentPage, itemsPerPage, debouncedSearch, statusFilter, refetchTrigger]);

    const handlePageSizeChange = useCallback((page, pageSize) => {
        setItemsPerPage(pageSize);
        setCurrentPage(1);
    }, []);

    const handleApproveLeave = useCallback(async (leaveId) => {
        if (!leaveId) {
            message.error('Leave ID not found');
            return;
        }
        
        Modal.confirm({
            title: 'Approve Leave',
            content: 'Are you sure you want to approve this leave application?',
            okText: 'Approve',
            okType: 'primary',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    const idString = String(leaveId).trim();
                    console.log('Approving leave with ID:', idString);
                    await leaveService.approveLeave(idString);
                    message.success('Leave approved successfully');
                    setRefetchTrigger(prev => prev + 1);
                } catch (error) {
                    message.error(error.message || 'Failed to approve leave');
                    console.error('Approve error:', error);
                }
            },
            });
            }, []);

            const handleRejectLeave = useCallback(async (leaveId) => {
            if (!leaveId) {
            message.error('Leave ID not found');
            return;
            }
            
            Modal.confirm({
            title: 'Reject Leave',
            content: 'Are you sure you want to reject this leave application?',
            okText: 'Reject',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    const idString = String(leaveId).trim();
                    console.log('Rejecting leave with ID:', idString);
                    await leaveService.rejectLeave(idString, 'Rejected by admin');
                    message.success('Leave rejected successfully');
                    setRefetchTrigger(prev => prev + 1);
                } catch (error) {
                    message.error(error.message || 'Failed to reject leave');
                    console.error('Reject error:', error);
                }
            },
            });
            }, []);

            const handleReviewRejected = useCallback((leaveId) => {
            if (!leaveId) {
            message.error('Leave ID not found');
            return;
            }
            
            const leaveRecord = leaves.find(l => l._id === leaveId || l.id === leaveId);
            
            Modal.confirm({
            title: 'Review Rejected Leave',
            icon: <CloseCircleOutlined />,
            content: `Reason: ${leaveRecord?.rejectionReason || 'No reason provided'}`,
            okText: 'Approve',
            okType: 'primary',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    const idString = String(leaveId).trim();
                    console.log('Approving rejected leave with ID:', idString);
                    await leaveService.approveLeave(idString);
                    message.success('Leave approved successfully');
                    setRefetchTrigger(prev => prev + 1);
                } catch (error) {
                    message.error(error.message || 'Failed to approve leave');
                    console.error('Approve error:', error);
                }
            },
        });
    }, [leaves]);

    const getLeaveStatusColor = (status) => {
        switch(status) {
            case 'pending': return 'processing';
            case 'approved': return 'success';
            case 'rejected': return 'error';
            case 'cancelled': return 'default';
            default: return 'processing';
        }
    };

    const columns = useMemo(() => [
        {
            title: 'SL No',
            key: 'slNo',
            width: 60,
            render: (_, __, index) => ((currentPage - 1) * itemsPerPage) + index + 1,
        },
        { title: 'Leave #', dataIndex: 'leaveNumber', key: 'leaveNumber', width: 110 },
        { 
            title: 'Employee', 
            dataIndex: ['employeeId', 'name'], 
            key: 'employeeName', 
            width: 130,
            render: (text, record) => record?.employeeId?.name || 'N/A'
        },
        { title: 'Leave Type', dataIndex: 'leaveType', key: 'leaveType', width: 110 },
        { 
            title: 'Start Date', 
            dataIndex: 'startDate', 
            key: 'startDate', 
            width: 110, 
            render: (date) => date ? formatDateFromString(date) : 'N/A'
        },
        { 
            title: 'End Date', 
            dataIndex: 'endDate', 
            key: 'endDate', 
            width: 110, 
            render: (date) => date ? formatDateFromString(date) : 'N/A'
        },
        { title: 'Days', dataIndex: 'numberOfDays', key: 'numberOfDays', width: 70 },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (status) => <Badge status={getLeaveStatusColor(status)} text={status?.charAt(0).toUpperCase() + status?.slice(1)} />,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 160,
            render: (_, record) => {
                const leaveId = record?._id || record?.id;
                
                // Debug logging
                if (!leaveId) {
                    console.warn('Leave record missing ID:', record);
                }

                const handleEditClick = () => {
                    if (!leaveId) {
                        message.error('Leave ID not found');
                        return;
                    }
                    navigate(`/addleave/${leaveId}`, { state: { isEdit: true, leaveData: record } });
                };

                const handleDeleteClick = () => {
                    if (!leaveId) {
                        message.error('Leave ID not found');
                        return;
                    }
                    Modal.confirm({
                        title: 'Delete Leave',
                        content: 'Are you sure you want to delete this leave application?',
                        okText: 'Delete',
                        okType: 'danger',
                        cancelText: 'Cancel',
                        onOk: async () => {
                            try {
                                const idString = String(leaveId).trim();
                                console.log('Deleting leave with ID:', idString);
                                await leaveService.cancelLeave(idString);
                                message.success('Leave deleted successfully');
                                setRefetchTrigger(prev => prev + 1);
                            } catch (error) {
                                message.error(error.message || 'Failed to delete leave');
                                console.error('Delete error:', error);
                            }
                        },
                    });
                };

                if (!leaveId) {
                    return <span style={{ color: '#ff4d4f' }}>Invalid ID</span>;
                }

                const pendingActionItems = [
                    {
                        key: 'approve',
                        label: 'Approve',
                        onClick: () => handleApproveLeave(leaveId),
                    },
                    {
                        key: 'reject',
                        label: 'Reject',
                        onClick: () => handleRejectLeave(leaveId),
                    },
                ];

                return (
                    <Space size="small">
                        {record.status === 'pending' && (
                            <>
                                <Dropdown menu={{ items: pendingActionItems }}>
                                    <Tooltip title="Approve/Reject Leave">
                                        <Button
                                            type="text"
                                            icon={<CheckCircleOutlined />}
                                            size="small"
                                            style={{ color: '#1890ff', fontSize: '16px' }}
                                        />
                                    </Tooltip>
                                </Dropdown>
                                <Tooltip title="Edit Leave">
                                    <Button
                                        type="text"
                                        icon={<EditOutlined />}
                                        size="small"
                                        style={{ fontSize: '16px' }}
                                        onClick={handleEditClick}
                                    />
                                </Tooltip>
                                <Tooltip title="Delete Leave">
                                    <Button
                                        type="text"
                                        icon={<DeleteOutlined />}
                                        size="small"
                                        danger
                                        style={{ fontSize: '16px' }}
                                        onClick={handleDeleteClick}
                                    />
                                </Tooltip>
                            </>
                        )}
                        {record.status === 'approved' && (
                            <>
                                <Tooltip title="View Leave">
                                    <Button
                                        type="text"
                                        icon={<EyeOutlined />}
                                        size="small"
                                        style={{ fontSize: '16px' }}
                                        onClick={() => {
                                            if (!leaveId) {
                                                message.error('Leave ID not found');
                                                return;
                                            }
                                            navigate(`/addleave/${leaveId}`, { state: { isEdit: false, isView: true, leaveData: record } });
                                        }}
                                    />
                                </Tooltip>
                                <Tooltip title="Delete Leave">
                                    <Button
                                        type="text"
                                        icon={<DeleteOutlined />}
                                        size="small"
                                        danger
                                        style={{ fontSize: '16px' }}
                                        onClick={handleDeleteClick}
                                    />
                                </Tooltip>
                            </>
                        )}
                        {record.status === 'rejected' && (
                            <>
                                <Tooltip title="Review & Update">
                                    <Button
                                        type="text"
                                        icon={<CloseCircleOutlined />}
                                        size="small"
                                        style={{ color: '#ff4d4f', fontSize: '16px' }}
                                        onClick={() => {
                                            console.log('Review rejected leave ID:', leaveId);
                                            handleReviewRejected(leaveId);
                                        }}
                                    />
                                </Tooltip>
                                <Tooltip title="Edit Leave">
                                    <Button
                                        type="text"
                                        icon={<EditOutlined />}
                                        size="small"
                                        style={{ fontSize: '16px' }}
                                        onClick={handleEditClick}
                                    />
                                </Tooltip>
                                <Tooltip title="Delete Leave">
                                    <Button
                                        type="text"
                                        icon={<DeleteOutlined />}
                                        size="small"
                                        danger
                                        style={{ fontSize: '16px' }}
                                        onClick={handleDeleteClick}
                                    />
                                </Tooltip>
                            </>
                        )}
                    </Space>
                );
            },
        },
    ], [navigate, currentPage, itemsPerPage, handleApproveLeave, handleRejectLeave, handleReviewRejected]);

    return (
        <>
            {/* Leave Status Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} lg={6}>
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
                        onClick={() => {
                            setStatusFilter('all');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title={<span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Leaves</span>}
                            value={leaveStats.total}
                            prefix={<TeamOutlined style={{ color: '#1890ff', marginRight: '8px' }} />}
                            valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: '700' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
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
                        onClick={() => {
                            setStatusFilter('pending');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title={<span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Pending</span>}
                            value={leaveStats.pending}
                            prefix={<ClockCircleOutlined style={{ color: '#faad14', marginRight: '8px' }} />}
                            valueStyle={{ color: '#faad14', fontSize: '28px', fontWeight: '700' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: statusFilter === 'approved' ? '1px solid #52c41a' : '1px solid #f0f0f0',
                        }}
                        hoverable
                        onClick={() => {
                            setStatusFilter('approved');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title={<span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Approved</span>}
                            value={leaveStats.approved}
                            prefix={<CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />}
                            valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: '700' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: statusFilter === 'rejected' ? '1px solid #f5222d' : '1px solid #f0f0f0',
                        }}
                        hoverable
                        onClick={() => {
                            setStatusFilter('rejected');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title={<span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Rejected</span>}
                            value={leaveStats.rejected}
                            prefix={<CloseCircleOutlined style={{ color: '#f5222d', marginRight: '8px' }} />}
                            valueStyle={{ color: '#f5222d', fontSize: '28px', fontWeight: '700' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Leaves Table Card */}
            <Card
                style={{ borderRadius: '12px' }}
                title={
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#000' }}>Leaves</span>
                        <Input
                             placeholder="Search leaves..."
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
                                { label: 'Approved', value: 'approved' },
                                { label: 'Rejected', value: 'rejected' },
                            ]}
                        />
                    </div>
                }
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/addleave')}
                        style={{
                            borderRadius: '6px',
                            fontWeight: '500',
                            height: '32px',
                            paddingInline: '16px',
                        }}
                    >
                        Apply Leave
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={leaves}
                    rowKey={(record) => record._id || Math.random()}
                    pagination={false}
                    style={{ marginBottom: '16px' }}
                    scroll={{ x: 1300 }}
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

export default LeavesView;
