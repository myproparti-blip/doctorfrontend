import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Table, Modal, Select, Tooltip, Space, message, Badge, Card, Pagination, Row, Col, Statistic } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, AlertOutlined, CheckCircleOutlined, ClockCircleOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { medicineService } from '../services/api';
import { formatDateFromString } from '../utils/dateHelpers';
import { getIdFromRecord } from '../utils/idHelpers';

function MedicinesView() {
     const [medicines, setMedicines] = useState([]);
     const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [refetchTrigger, setRefetchTrigger] = useState(0);
    const [medicineStats, setMedicineStats] = useState({
        total: 0,
        lowStock: 0,
        expiring: 0,
        healthy: 0,
    });
    const navigate = useNavigate();

    const categories = ['Antibiotic', 'Painkiller', 'Antifever', 'Antacid', 'Vitamin', 'Cardiovascular', 'Respiratory', 'Gastrointestinal', 'Neurological', 'Other'];

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch medicines data
    useEffect(() => {
        const fetchMedicines = async () => {
            try {
                 const response = await medicineService.getAllMedicines(
                     currentPage,
                     itemsPerPage,
                     categoryFilter === 'all' ? null : categoryFilter,
                     debouncedSearch || null
                 );

                 const medicineData = response.data || (response.medicines ? response.medicines.data || [] : []);
                 setMedicines(Array.isArray(medicineData) ? medicineData : []);
                 setTotal(response.pagination?.total || response.total || 0);

                if (currentPage === 1 && categoryFilter === 'all') {
                    const medicinesData = response.data || [];
                    const lowStockCount = medicinesData.filter(m => m.quantity <= m.reorderLevel).length;
                    const expiringCount = medicinesData.filter(m => {
                        const expiry = new Date(m.expiryDate);
                        const future = new Date();
                        future.setDate(future.getDate() + 30);
                        return expiry <= future && expiry >= new Date();
                    }).length;

                    const stats = {
                        total: medicinesData.length,
                        lowStock: lowStockCount,
                        expiring: expiringCount,
                        healthy: medicinesData.length - lowStockCount - expiringCount,
                    };
                    setMedicineStats(stats);
                }
            } catch (error) {
                message.error(error.message || 'Failed to load medicines');
                console.error(error);
            }
        };

        fetchMedicines();
    }, [currentPage, itemsPerPage, debouncedSearch, categoryFilter, refetchTrigger]);

    const handlePageSizeChange = useCallback((page, pageSize) => {
        setItemsPerPage(pageSize);
        setCurrentPage(1);
    }, []);

    const handleDeleteMedicine = useCallback(async (medicineId) => {
        Modal.confirm({
            title: 'Delete Medicine',
            content: 'Are you sure you want to delete this medicine?',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await medicineService.deleteMedicine(String(medicineId).trim());
                    message.success('Medicine deleted successfully');
                    setRefetchTrigger(prev => prev + 1);
                } catch (error) {
                    message.error(error.message || 'Failed to delete medicine');
                    console.error(error);
                }
            },
        });
    }, []);

    const getStockStatus = (medicine) => {
        if (medicine.quantity <= medicine.reorderLevel) {
            return { color: 'red', text: 'Low Stock', icon: <AlertOutlined /> };
        }
        return { color: 'green', text: 'In Stock', icon: <CheckCircleOutlined /> };
    };

    const columns = useMemo(() => [
        {
            title: 'SL No',
            key: 'slNo',
            width: 60,
            render: (_, __, index) => ((currentPage - 1) * itemsPerPage) + index + 1,
        },
        { title: 'Medicine Name', dataIndex: 'medicineName', key: 'medicineName', width: 140 },
        { title: 'Generic Name', dataIndex: 'genericName', key: 'genericName', width: 130 },
        { title: 'Category', dataIndex: 'category', key: 'category', width: 120 },
        { title: 'Manufacturer', dataIndex: 'manufacturer', key: 'manufacturer', width: 120 },
        { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', width: 80 },
        { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', width: 100, render: (price) => `₹${price}` },
        {
            title: 'Stock Status',
            dataIndex: 'quantity',
            key: 'stockStatus',
            width: 110,
            render: (_, record) => {
                const status = getStockStatus(record);
                return <Badge icon={status.icon} color={status.color} text={status.text} />;
            },
        },
        {
            title: 'Expiry Date',
            dataIndex: 'expiryDate',
            key: 'expiryDate',
            width: 110,
            render: (date) => formatDateFromString(date),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_, record) => {
                const medicineId = getIdFromRecord(record);

                const handleEditClick = () => {
                    if (!medicineId) {
                        message.error('Medicine ID not found');
                        return;
                    }
                    navigate(`/addmedicine/${medicineId}`, { state: { isEdit: true, medicineData: record } });
                };

                const handleDeleteClick = () => {
                    if (!medicineId) {
                        message.error('Medicine ID not found');
                        return;
                    }
                    handleDeleteMedicine(medicineId);
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
    ], [navigate, currentPage, itemsPerPage, handleDeleteMedicine]);

    return (
        <>
            {/* Medicine Status Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                            background: '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: categoryFilter === 'all' ? '2px solid #1890ff' : '2px solid transparent',
                        }}
                        hoverable
                        onClick={() => {
                            setCategoryFilter('all');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title="Total Medicines"
                            value={medicineStats.total}
                            prefix={<ShoppingCartOutlined style={{ color: '#1890ff', marginRight: '8px' }} />}
                            valueStyle={{ color: '#1890ff', fontSize: '24px', fontWeight: '600' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                            background: '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: categoryFilter === 'all' ? '2px solid #52c41a' : '2px solid transparent',
                        }}
                        hoverable
                        onClick={() => {
                            setCategoryFilter('all');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title="Healthy Stock"
                            value={medicineStats.healthy}
                            prefix={<CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />}
                            valueStyle={{ color: '#52c41a', fontSize: '24px', fontWeight: '600' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                            background: '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: categoryFilter === 'all' ? '2px solid #f5222d' : '2px solid transparent',
                        }}
                        hoverable
                        onClick={() => {
                            setCategoryFilter('all');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title="Low Stock"
                            value={medicineStats.lowStock}
                            prefix={<AlertOutlined style={{ color: '#f5222d', marginRight: '8px' }} />}
                            valueStyle={{ color: '#f5222d', fontSize: '24px', fontWeight: '600' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                            background: '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: categoryFilter === 'all' ? '2px solid #faad14' : '2px solid transparent',
                        }}
                        hoverable
                        onClick={() => {
                            setCategoryFilter('all');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title="Expiring Soon"
                            value={medicineStats.expiring}
                            prefix={<ClockCircleOutlined style={{ color: '#faad14', marginRight: '8px' }} />}
                            valueStyle={{ color: '#faad14', fontSize: '24px', fontWeight: '600' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Medicines Table Card */}
            <Card
                title={
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <span>Medicines</span>
                        <Input
                             placeholder="Search medicines..."
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             size="small"
                             style={{ width: '200px' }}
                         />
                        <Select
                            placeholder="Filter by category"
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                            style={{ width: '150px' }}
                            options={[
                                { label: 'All', value: 'all' },
                                ...categories.map(cat => ({ label: cat, value: cat }))
                            ]}
                        />
                    </div>
                }
                extra={
                     <Button
                                           type="primary"
                                           icon={<PlusOutlined />}
                                           onClick={() => navigate('/addmedicine')}
                                           style={{
                                               borderRadius: '6px',
                                               fontWeight: '500',
                                               height: '32px',
                                               paddingInline: '16px',
                                           }}
                                       >
                                           Add Medicine
                                       </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={medicines}
                    rowKey="_id"
                    pagination={false}
                    style={{ marginBottom: '16px' }}
                    scroll={{ x: 1400 }}
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

export default MedicinesView;
