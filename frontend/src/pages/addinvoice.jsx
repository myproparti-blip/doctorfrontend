import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, Form, Input, Button, Select, DatePicker, Row, Col, message, Layout, Table, InputNumber } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { patientService, medicineService, invoiceService } from '../services/api';

const { Content } = Layout;

const AddInvoice = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: invoiceId } = useParams();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [patients, setPatients] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [invoiceItems, setInvoiceItems] = useState([]);
    const isEditMode = location.state?.isEdit || !!invoiceId;
    const isViewMode = location.state?.isView;
    const invoiceData = location.state?.invoiceData;

    // Fetch patients
    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const response = await patientService.getAllPatients(1, 100);
                const patientList = response.data || [];
                setPatients(patientList);
            } catch (error) {
                console.error('Failed to load patients:', error);
            }
        };
        fetchPatients();
    }, []);

    // Fetch medicines
    useEffect(() => {
        const fetchMedicines = async () => {
            try {
                const response = await medicineService.getAllMedicines(1, 100);
                const medicineList = response.data || [];
                setMedicines(medicineList);
            } catch (error) {
                console.error('Failed to load medicines:', error);
            }
        };
        fetchMedicines();
    }, []);

    // Load invoice data if editing
    useEffect(() => {
        if (isEditMode && invoiceId) {
            const fetchInvoice = async () => {
                try {
                    const response = await invoiceService.getInvoiceById(invoiceId);
                    const data = response.data || response;
                    
                    console.log('Loaded invoice data:', data);
                    
                    // Extract patient ID safely
                    const patientId = typeof data.patientId === 'string' 
                        ? data.patientId 
                        : data.patientId?._id || data.patientId;
                    
                    form.setFieldsValue({
                        patientId: patientId,
                        treatmentDescription: data.treatmentDetails?.description || '',
                        dueDate: data.dueDate && data.dueDate !== '{}' ? dayjs(data.dueDate) : null,
                        notes: data.notes || '',
                    });
                    
                    // Set invoice items with proper structure
                    // Wait a moment to ensure medicines are loaded
                    setTimeout(() => {
                        const items = (data.items || []).map(item => {
                            // Try to find medicine by description/name
                            const medicine = medicines.find(m => m.medicineName === item.description);
                            return {
                                description: item.description || '',
                                quantity: item.quantity || 1,
                                unitPrice: item.unitPrice || 0,
                                medicineId: medicine?._id || item.medicineId || '',
                            };
                        });
                        setInvoiceItems(items);
                    }, 100);
                } catch (error) {
                    message.error('Failed to load invoice');
                    console.error(error);
                }
            };
            fetchInvoice();
        } else if (isEditMode && invoiceData) {
            // Fallback to location state if available
            const patientId = typeof invoiceData.patientId === 'string' 
                ? invoiceData.patientId 
                : invoiceData.patientId?._id || invoiceData.patientId;
                
            form.setFieldsValue({
                patientId: patientId,
                treatmentDescription: invoiceData.treatmentDetails?.description || '',
                dueDate: invoiceData.dueDate ? dayjs(invoiceData.dueDate) : null,
                notes: invoiceData.notes || '',
            });
            
            // Set invoice items with medicine IDs
            const items = (invoiceData.items || []).map(item => {
                const medicine = medicines.find(m => m.medicineName === item.description);
                return {
                    description: item.description || '',
                    quantity: item.quantity || 1,
                    unitPrice: item.unitPrice || 0,
                    medicineId: medicine?._id || item.medicineId || '',
                };
            });
            setInvoiceItems(items);
        }
    }, [isEditMode, invoiceId, invoiceData, form, medicines]);

    const handleAddItem = () => {
        setInvoiceItems([...invoiceItems, { medicineId: '', description: '', quantity: 1, unitPrice: 0 }]);
    };

    const handleRemoveItem = (index) => {
        const newItems = invoiceItems.filter((_, i) => i !== index);
        setInvoiceItems(newItems);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...invoiceItems];
        // If medicineId changes, auto-populate description and unitPrice
        if (field === 'medicineId' && value) {
            const selectedMedicine = medicines.find(m => m._id === value);
            if (selectedMedicine) {
                newItems[index].medicineId = value;
                newItems[index].description = selectedMedicine.medicineName;
                newItems[index].unitPrice = selectedMedicine.price || 0;
            }
        } else {
            newItems[index][field] = value;
        }
        setInvoiceItems(newItems);
    };

    const calculateTotal = () => {
        return invoiceItems.reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 0)), 0);
    };

    const handleSubmit = async (values) => {
        if (!values.dueDate) {
            message.error('Due date is required');
            return;
        }
        if (invoiceItems.length === 0) {
            message.error('At least one invoice item is required');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                patientId: values.patientId,
                treatmentDetails: {
                    description: values.treatmentDescription || 'Medical Services',
                },
                dueDate: values.dueDate?.format('YYYY-MM-DD'),
                notes: values.notes,
                items: invoiceItems,
                total: calculateTotal(),
            };

            if (isEditMode && invoiceId) {
                await invoiceService.updateInvoice(invoiceId, payload);
                message.success('Invoice updated successfully');
            } else {
                await invoiceService.createInvoice(payload);
                message.success('Invoice created successfully');
            }
            navigate('/invoices');
        } catch (error) {
            message.error(error.response?.data?.message || error.message || 'Failed to save invoice');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const itemColumns = [
        {
            title: 'Medicine',
            dataIndex: 'medicineId',
            render: (_, record, index) => (
                <Select
                    style={{ width: '100%' }}
                    placeholder="Select medicine"
                    value={record.medicineId}
                    onChange={(value) => handleItemChange(index, 'medicineId', value)}
                    options={medicines.map(m => ({ label: m.medicineName, value: m._id }))}
                    disabled={isViewMode}
                />
            ),
        },
        {
            title: 'Quantity',
            dataIndex: 'quantity',
            render: (quantity, _, index) => (
                <InputNumber
                    value={quantity}
                    onChange={(value) => handleItemChange(index, 'quantity', value)}
                    disabled={isViewMode}
                    min={1}
                />
            ),
        },
        {
            title: 'Unit Price',
            dataIndex: 'unitPrice',
            render: (unitPrice, _, index) => (
                <InputNumber
                    value={unitPrice}
                    onChange={(value) => handleItemChange(index, 'unitPrice', value)}
                    disabled={isViewMode}
                    prefix="₹"
                />
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            render: (_, record) => `₹${(record.quantity * (record.unitPrice || 0)).toFixed(2)}`,
        },
        {
            title: 'Action',
            render: (_, __, index) => !isViewMode && (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveItem(index)}
                />
            ),
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
            <Layout.Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Button 
                        type="text" 
                        icon={<ArrowLeftOutlined />} 
                        onClick={() => navigate('/invoices')} 
                        style={{ marginRight: '16px' }} 
                    />
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                        {isViewMode ? 'View Invoice' : isEditMode ? 'Edit Invoice' : 'Create Invoice'}
                    </h1>
                </div>
            </Layout.Header>

            <Content style={{ padding: '24px' }}>
                <Card>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        disabled={isViewMode}
                    >
                    <Row gutter={16}>
                         <Col xs={24} sm={12}>
                             <Form.Item
                                 name="patientId"
                                 label="Patient"
                                 rules={[{ required: true, message: 'Please select a patient' }]}
                             >
                                 <Select
                                     placeholder="Select patient"
                                     options={patients.map(p => ({ label: p.name, value: p._id }))}
                                 />
                             </Form.Item>
                         </Col>
                         <Col xs={24} sm={12}>
                             <Form.Item 
                                 name="dueDate" 
                                 label="Due Date"
                                 rules={[{ required: true, message: 'Please select a due date' }]}
                             >
                                 <DatePicker />
                             </Form.Item>
                         </Col>
                     </Row>

                    <Row gutter={16}>
                         <Col xs={24}>
                             <Form.Item 
                                 name="treatmentDescription" 
                                 label="Treatment Description"
                                 rules={[{ required: true, message: 'Please enter treatment description' }]}
                             >
                                 <Input.TextArea placeholder="e.g., Medical Services, Consultation, etc." rows={2} />
                             </Form.Item>
                         </Col>
                    </Row>

                    <Form.Item label="Invoice Items">
                        <Table
                            columns={itemColumns}
                            dataSource={invoiceItems}
                            rowKey={(_, index) => index}
                            pagination={false}
                        />
                        {!isViewMode && (
                            <Button
                                type="dashed"
                                block
                                icon={<PlusOutlined />}
                                onClick={handleAddItem}
                                style={{ marginTop: '16px' }}
                            >
                                Add Item
                            </Button>
                        )}
                    </Form.Item>

                    <Form.Item label="Total Amount">
                        <Input
                            value={`₹${calculateTotal().toFixed(2)}`}
                            disabled
                        />
                    </Form.Item>

                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea placeholder="Additional notes" />
                    </Form.Item>

                    {!isViewMode && (
                        <Form.Item style={{ marginTop: '24px' }}>
                            <Button 
                                onClick={() => navigate('/invoices')} 
                                style={{ marginRight: '8px' }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                            >
                                {isEditMode ? 'Update Invoice' : 'Create Invoice'}
                            </Button>
                        </Form.Item>
                    )}
                </Form>
                </Card>
            </Content>
        </Layout>
    );
};

export default AddInvoice;
