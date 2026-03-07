import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Table, Modal, Select, Tooltip, Space, message, Badge, Card, Pagination, Row, Col, Statistic } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, DollarOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { invoiceService } from '../services/api';
import { formatDateFromString } from '../utils/dateHelpers';

function InvoicesView() {
     const [invoices, setInvoices] = useState([]);
     const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [refetchTrigger, setRefetchTrigger] = useState(0);
    const [invoiceStats, setInvoiceStats] = useState({
        total: 0,
        paid: 0,
        pending: 0,
        outstanding: 0,
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

    // Fetch invoices data
     useEffect(() => {
         const fetchInvoices = async () => {
             try {
                 const response = await invoiceService.getAllInvoices(
                     currentPage,
                     itemsPerPage,
                     statusFilter === 'all' ? null : statusFilter
                 );

                 // Handle different response formats
                 let invoiceData = [];
                 let totalCount = 0;
                 
                 if (response.data && Array.isArray(response.data)) {
                   invoiceData = response.data;
                 } else if (response.invoices && Array.isArray(response.invoices)) {
                   invoiceData = response.invoices;
                 }
                 
                 totalCount = response.pagination?.total || response.total || 0;
                 
                 // Debug: Log invoices to check _id field
                 if (invoiceData.length > 0) {
                   console.log('First invoice:', invoiceData[0]);
                 }
                 
                 setInvoices(invoiceData);
                 setTotal(totalCount);

                 if (currentPage === 1 && statusFilter === 'all') {
                    const stats = {
                        total: invoiceData.length,
                        paid: invoiceData.filter(i => i.paymentStatus === 'paid').length,
                        pending: invoiceData.filter(i => i.paymentStatus === 'pending').length,
                        outstanding: invoiceData.filter(i => ['pending', 'partial', 'overdue'].includes(i.paymentStatus)).length,
                    };
                    setInvoiceStats(stats);
                 }
            } catch (error) {
                message.error(error.message || 'Failed to load invoices');
                console.error(error);
            }
        };

        fetchInvoices();
    }, [currentPage, itemsPerPage, debouncedSearch, statusFilter, refetchTrigger]);

    const handlePageSizeChange = useCallback((page, pageSize) => {
        setItemsPerPage(pageSize);
        setCurrentPage(1);
    }, []);

    const handleDeleteInvoice = useCallback(async (invoiceId) => {
         Modal.confirm({
             title: 'Delete Invoice',
             content: 'Are you sure you want to delete this invoice?',
             okText: 'Delete',
             okType: 'danger',
             cancelText: 'Cancel',
             onOk: async () => {
                 try {
                     await invoiceService.deleteInvoice(String(invoiceId).trim());
                     message.success('Invoice deleted successfully');
                     setRefetchTrigger(prev => prev + 1);
                 } catch (error) {
                     message.error(error.message || 'Failed to delete invoice');
                     console.error(error);
                 }
             },
         });
     }, []);

     const handleStatusUpdate = useCallback(async (invoiceId, newStatus) => {
          try {
              await invoiceService.updatePaymentStatus(invoiceId, { paymentStatus: newStatus });
              message.success(`Invoice status updated to ${newStatus}`);
              setRefetchTrigger(prev => prev + 1);
          } catch (error) {
              message.error(error.message || 'Failed to update invoice status');
              console.error(error);
          }
     }, []);

    const getPaymentStatusColor = (status) => {
        switch(status) {
            case 'paid': return 'green';
            case 'partial': return 'orange';
            case 'pending': return 'blue';
            case 'overdue': return 'red';
            case 'cancelled': return 'gray';
            default: return 'blue';
        }
    };

    const columns = useMemo(() => [
        {
            title: 'SL No',
            key: 'slNo',
            width: 60,
            render: (_, __, index) => ((currentPage - 1) * itemsPerPage) + index + 1,
        },
        { title: 'Invoice #', dataIndex: 'invoiceNumber', key: 'invoiceNumber', width: 120 },
        { 
            title: 'Patient', 
            dataIndex: ['patientId', 'name'], 
            key: 'patientName', 
            width: 130,
            render: (text, record) => {
                return record?.patientId?.name || 'N/A';
            }
        },
        { title: 'Total Amount', dataIndex: 'total', key: 'total', width: 110, render: (total) => `₹${total || 0}` },
        { title: 'Amount Paid', dataIndex: 'amountPaid', key: 'amountPaid', width: 110, render: (paid) => `₹${paid || 0}` },
        {
            title: 'Payment Status',
            dataIndex: 'paymentStatus',
            key: 'paymentStatus',
            width: 110,
            render: (status) => (
                <Badge color={getPaymentStatusColor(status)} text={status?.charAt(0).toUpperCase() + status?.slice(1)} />
            ),
        },
        {
            title: 'Due Date',
            dataIndex: 'dueDate',
            key: 'dueDate',
            width: 110,
            render: (date) => formatDateFromString(date),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_, record) => {
                const invoiceId = record?._id || record?.id;
                
                // Debug log
                if (!invoiceId) {
                    console.warn('Record missing ID:', record);
                }

                if (!invoiceId) {
                    return <span style={{ color: '#ff4d4f' }}>Invalid ID</span>;
                }

                const handleEditClick = () => {
                    navigate(`/addinvoice/${invoiceId}`, { state: { isEdit: true, invoiceData: record } });
                };

                const handleDeleteClick = () => {
                    handleDeleteInvoice(invoiceId);
                };

                const statusOptions = [
                    { label: 'Paid', value: 'paid' },
                    { label: 'Pending', value: 'pending' },
                    { label: 'Partial', value: 'partial' },
                    { label: 'Overdue', value: 'overdue' },
                    { label: 'Cancelled', value: 'cancelled' },
                ];

                return (
                     <Space size="small">
                          <Tooltip title="Update Status">
                              <Button
                                  type="text"
                                  icon={<DownloadOutlined />}
                                  size="small"
                                  onClick={() => {
                                      let selectedStatus = record.paymentStatus;
                                      Modal.confirm({
                                          title: 'Update Invoice Status',
                                          content: (
                                              <Select
                                                  defaultValue={record.paymentStatus}
                                                  style={{ width: '100%', marginTop: '12px' }}
                                                  options={statusOptions}
                                                  onChange={(value) => {
                                                      selectedStatus = value;
                                                  }}
                                              />
                                          ),
                                          okText: 'Update',
                                          onOk: () => {
                                              if (selectedStatus && selectedStatus !== record.paymentStatus) {
                                                  handleStatusUpdate(invoiceId, selectedStatus);
                                              }
                                          },
                                      });
                                  }}
                              />
                          </Tooltip>
                         <Tooltip title="Edit">
                             <Button
                                 type="text"
                                 icon={<EditOutlined />}
                                 size="small"
                                 onClick={handleEditClick}
                                 disabled={record.paymentStatus === 'paid'}
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
    ], [navigate, currentPage, itemsPerPage, handleDeleteInvoice, handleStatusUpdate]);

    return (
        <>
            {/* Invoice Status Cards */}
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
                            title={<span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Invoices</span>}
                            value={invoiceStats.total}
                            prefix={<FileTextOutlined style={{ color: '#1890ff', marginRight: '8px' }} />}
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
                            border: statusFilter === 'paid' ? '1px solid #52c41a' : '1px solid #f0f0f0',
                        }}
                        hoverable
                        onClick={() => {
                            setStatusFilter('paid');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title={<span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Paid Invoices</span>}
                            value={invoiceStats.paid}
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
                            border: statusFilter === 'pending' ? '1px solid #faad14' : '1px solid #f0f0f0',
                        }}
                        hoverable
                        onClick={() => {
                            setStatusFilter('pending');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title={<span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Pending Invoices</span>}
                            value={invoiceStats.pending}
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
                            border: statusFilter === 'outstanding' ? '1px solid #f5222d' : '1px solid #f0f0f0',
                        }}
                        hoverable
                        onClick={() => {
                            setStatusFilter('outstanding');
                            setCurrentPage(1);
                        }}
                    >
                        <Statistic
                            title={<span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Outstanding</span>}
                            value={invoiceStats.outstanding}
                            prefix={<DollarOutlined style={{ color: '#f5222d', marginRight: '8px' }} />}
                            valueStyle={{ color: '#f5222d', fontSize: '28px', fontWeight: '700' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Invoices Table Card */}
            <Card
                style={{ borderRadius: '12px' }}
                title={
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#000' }}>Invoices</span>
                        <Input
                        placeholder="Search invoices..."
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
                                { label: 'Paid', value: 'paid' },
                                { label: 'Pending', value: 'pending' },
                                { label: 'Partial', value: 'partial' },
                                { label: 'Overdue', value: 'overdue' },
                            ]}
                        />
                    </div>
                }
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/addinvoice')}
                        style={{
                            borderRadius: '6px',
                            fontWeight: '500',
                            height: '32px',
                            paddingInline: '16px',
                        }}
                    >
                        Create Invoice
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={invoices}
                    rowKey={(record) => record._id || Math.random()}
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

export default InvoicesView;
