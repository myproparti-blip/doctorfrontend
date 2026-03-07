import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Table, Modal, Select, Tooltip, Space, message, Badge, Card, Pagination, Row, Col, Statistic, Dropdown } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, HomeOutlined, SwapOutlined } from '@ant-design/icons';
import { roomService } from '../services/api';
import { getIdFromRecord } from '../utils/idHelpers';

function RoomsView() {
     const [rooms, setRooms] = useState([]);
     const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [refetchTrigger, setRefetchTrigger] = useState(0);
    const [roomStats, setRoomStats] = useState({
        total: 0,
        available: 0,
        occupied: 0,
        maintenance: 0,
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

    // Fetch rooms data
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const response = await roomService.getAllRooms(
                    currentPage,
                    itemsPerPage,
                    statusFilter === 'all' ? null : statusFilter,
                    debouncedSearch || null
                );

                const roomData = response.data || (response.rooms ? response.rooms.data || [] : []);
                setRooms(Array.isArray(roomData) ? roomData : []);
                setTotal(response.pagination?.total || response.total || 0);

                // Calculate stats on first page load
                if (currentPage === 1 && statusFilter === 'all' && !debouncedSearch) {
                    try {
                        await roomService.getRoomOccupancyReport();
                        const roomsData = response.data || [];
                        
                        const stats = {
                            total: roomsData.length,
                            available: roomsData.filter(r => r.status === 'available').length,
                            occupied: roomsData.filter(r => r.status === 'occupied').length,
                            maintenance: roomsData.filter(r => r.status === 'maintenance').length,
                        };
                        
                        setRoomStats(stats);
                    } catch (error) {
                        console.error('Error fetching room stats:', error);
                        const roomsData = response.data || [];
                        setRoomStats({
                            total: roomsData.length,
                            available: roomsData.filter(r => r.status === 'available').length,
                            occupied: roomsData.filter(r => r.status === 'occupied').length,
                            maintenance: roomsData.filter(r => r.status === 'maintenance').length,
                        });
                    }
                }
            } catch (error) {
                message.error(error.message || 'Failed to load rooms');
                console.error(error);
            }
        };

        fetchRooms();
    }, [currentPage, itemsPerPage, debouncedSearch, statusFilter, refetchTrigger]);

    const handlePageSizeChange = useCallback((page, pageSize) => {
        setItemsPerPage(pageSize);
        setCurrentPage(1);
    }, []);

    const handleDeleteRoom = useCallback(async (roomId) => {
        Modal.confirm({
            title: 'Delete Room',
            content: 'Are you sure you want to delete this room?',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await roomService.deleteRoom(String(roomId).trim());
                    message.success('Room deleted successfully');
                    setCurrentPage(1);
                    setStatusFilter('all');
                    setSearchTerm('');
                    setRefetchTrigger(prev => prev + 1);
                } catch (error) {
                    message.error(error.message || 'Failed to delete room');
                    console.error(error);
                }
            },
        });
    }, []);

    const handleStatusChange = useCallback(async (roomId, currentStatus, newStatus) => {
        // Can't toggle occupied status - needs to release patients first
        if (currentStatus === 'occupied') {
            message.error('Cannot change status of occupied room. Release all patients first.');
            return;
        }

        const statusLabels = {
            'available': 'Available',
            'maintenance': 'Maintenance',
            'closed': 'Closed'
        };

        Modal.confirm({
            title: `Change Status to ${statusLabels[newStatus]}`,
            content: `Are you sure you want to change this room status to ${statusLabels[newStatus]}?`,
            okText: 'Yes',
            okType: newStatus === 'closed' ? 'danger' : 'primary',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await roomService.updateRoomStatus(String(roomId).trim(), newStatus);
                    message.success(`Room status updated to ${statusLabels[newStatus]}`);
                    
                    // Update room status in local state immediately
                    setRooms(prevRooms => 
                        prevRooms.map(room => 
                            getIdFromRecord(room) === String(roomId).trim() 
                                ? { ...room, status: newStatus }
                                : room
                        )
                    );
                    
                    // Also refetch to ensure data is fresh
                    setRefetchTrigger(prev => prev + 1);
                } catch (error) {
                    message.error(error.message || `Failed to update room status`);
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
        { title: 'Room Number', dataIndex: 'roomNumber', key: 'roomNumber', width: 120 },
        { title: 'Room Type', dataIndex: 'roomType', key: 'roomType', width: 120 },
        { title: 'Floor', dataIndex: 'floor', key: 'floor', width: 80 },
        { title: 'Bed Capacity', dataIndex: 'bedCapacity', key: 'bedCapacity', width: 110 },
        { title: 'Beds Occupied', dataIndex: 'bedsOccupied', key: 'bedsOccupied', width: 110 },
        { 
            title: 'Cost/Day', 
            dataIndex: 'costPerDay', 
            key: 'costPerDay',
            width: 100,
            render: (cost) => `₹${cost || 0}`,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status) => {
                let color = 'red';
                let text = 'Closed';
                let icon = <CloseCircleOutlined />;
                
                if (status === 'available') {
                    color = 'green';
                    text = 'Available';
                    icon = <CheckCircleOutlined />;
                } else if (status === 'occupied') {
                    color = 'orange';
                    text = 'Occupied';
                } else if (status === 'maintenance') {
                    color = 'blue';
                    text = 'Maintenance';
                }
                
                return <Badge icon={icon} color={color} text={text} />;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_, record) => {
                const roomId = getIdFromRecord(record);
                
                const statusMenuItems = [
                    {
                        key: 'available',
                        label: 'Available',
                        onClick: () => {
                            if (record.status !== 'available') {
                                handleStatusChange(roomId, record.status, 'available');
                            }
                        }
                    },
                    {
                        key: 'maintenance',
                        label: 'Maintenance',
                        onClick: () => {
                            if (record.status !== 'maintenance') {
                                handleStatusChange(roomId, record.status, 'maintenance');
                            }
                        }
                    },
                    {
                        key: 'closed',
                        label: 'Closed',
                        onClick: () => {
                            if (record.status !== 'closed') {
                                handleStatusChange(roomId, record.status, 'closed');
                            }
                        }
                    }
                ];

                const handleEditClick = () => {
                     if (!roomId) {
                         message.error('Room ID not found');
                         return;
                     }
                     navigate(`/addrooms/${roomId}`, { state: { isEdit: true, roomData: record } });
                 };

                 const handleDeleteClick = () => {
                     if (!roomId) {
                         message.error('Room ID not found');
                         return;
                     }
                     handleDeleteRoom(roomId);
                 };

                 return (
                      <Space size="small">
                          <Tooltip title="Edit">
                              <Button
                                  type="text"
                                  icon={<EditOutlined />}
                                  size="small"
                                  onClick={handleEditClick}
                              />
                          </Tooltip>
                          <Tooltip title="Change Status">
                              <Dropdown
                                  menu={{ items: statusMenuItems }}
                                  placement="bottomRight"
                              >
                                  <Button
                                      type="text"
                                      icon={<SwapOutlined />}
                                      size="small"
                                      disabled={record.status === 'occupied'}
                                  />
                              </Dropdown>
                          </Tooltip>
                         <Tooltip title="Delete">
                             <Button
                                 type="text"
                                 danger
                                 icon={<DeleteOutlined />}
                                 size="small"
                                 onClick={handleDeleteClick}
                                 disabled={record.bedsOccupied > 0}
                             />
                         </Tooltip>
                     </Space>
                 );
            },
        },
    ], [navigate, currentPage, itemsPerPage, handleDeleteRoom, handleStatusChange]);

    return (
        <>
            {/* Room Status Cards */}
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
                            title={<span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Rooms</span>}
                            value={roomStats.total}
                            prefix={<HomeOutlined style={{ color: '#1890ff', marginRight: '8px' }} />}
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
                            border: statusFilter === 'available' ? '1px solid #52c41a' : '1px solid #f0f0f0',
                        }}
                        hoverable
                        onClick={() => {
                            setStatusFilter('available');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title={<span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Available Rooms</span>}
                            value={roomStats.available}
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
                            border: statusFilter === 'occupied' ? '1px solid #f5222d' : '1px solid #f0f0f0',
                        }}
                        hoverable
                        onClick={() => {
                            setStatusFilter('occupied');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title={<span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Occupied Rooms</span>}
                            value={roomStats.occupied}
                            prefix={<CloseCircleOutlined style={{ color: '#f5222d', marginRight: '8px' }} />}
                            valueStyle={{ color: '#f5222d', fontSize: '28px', fontWeight: '700' }}
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
                            border: statusFilter === 'maintenance' ? '1px solid #faad14' : '1px solid #f0f0f0',
                        }}
                        hoverable
                        onClick={() => {
                            setStatusFilter('maintenance');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title={<span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Maintenance Rooms</span>}
                            value={roomStats.maintenance}
                            prefix={<HomeOutlined style={{ color: '#faad14', marginRight: '8px' }} />}
                            valueStyle={{ color: '#faad14', fontSize: '28px', fontWeight: '700' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Rooms Table Card */}
            <Card
                style={{ borderRadius: '12px' }}
                title={
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#000' }}>Rooms</span>
                        <Input
                             placeholder="Search rooms..."
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
                                { label: 'Available', value: 'available' },
                                { label: 'Occupied', value: 'occupied' },
                                { label: 'Maintenance', value: 'maintenance' },
                            ]}
                        />
                    </div>
                }
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/addrooms')}
                        style={{
                            borderRadius: '6px',
                            fontWeight: '500',
                            height: '32px',
                            paddingInline: '16px',
                        }}
                    >
                        Add Room
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={rooms}
                    rowKey="_id"
                    pagination={false}
                    style={{ marginBottom: '16px' }}
                    scroll={{ x: 1200 }}
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

export default RoomsView;
