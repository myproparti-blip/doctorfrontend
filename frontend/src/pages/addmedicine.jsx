import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, Form, Input, Button, Select, DatePicker, Row, Col, message, Layout, InputNumber } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { medicineService } from '../services/api';

const { Content } = Layout;

const AddMedicine = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: medicineId } = useParams();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const isEditMode = location.state?.isEdit || !!medicineId;

    const categories = [
        'Antibiotic',
        'Painkiller',
        'Antifever',
        'Antacid',
        'Vitamin',
        'Cardiovascular',
        'Respiratory',
        'Gastrointestinal',
        'Neurological',
        'Other',
    ];

    // Fetch medicine data from API when in edit mode
    useEffect(() => {
        if (isEditMode && medicineId) {
            const fetchMedicine = async () => {
                try {
                    console.log('Fetching medicine with ID:', medicineId);
                    const response = await medicineService.getMedicineById(medicineId);
                    const data = response.data || response;
                    
                    console.log('Fetched medicine data:', data);
                    
                    if (data) {
                        // Parse date properly - handle various formats
                        let expiryDateValue = null;
                        if (data.expiryDate) {
                            const dateObj = new Date(data.expiryDate);
                            if (!isNaN(dateObj.getTime())) {
                                expiryDateValue = dayjs(dateObj);
                            }
                        }
                        
                        form.setFieldsValue({
                            medicineName: data.medicineName,
                            genericName: data.genericName,
                            category: data.category,
                            manufacturer: data.manufacturer,
                            batchNumber: data.batchNumber,
                            quantity: data.quantity,
                            reorderLevel: data.reorderLevel,
                            unitPrice: data.unitPrice,
                            expiryDate: expiryDateValue,
                            description: data.description,
                        });
                    }
                } catch (error) {
                    message.error('Failed to load medicine details');
                    console.error('Error fetching medicine:', error);
                }
            };
            fetchMedicine();
        }
    }, [isEditMode, medicineId, form]);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // Format the expiry date properly
            let formattedExpiryDate = null;
            if (values.expiryDate) {
                // If it's a dayjs object, format it; if it's a string, use as is
                if (values.expiryDate.format) {
                    formattedExpiryDate = values.expiryDate.format('YYYY-MM-DD');
                } else if (typeof values.expiryDate === 'string') {
                    formattedExpiryDate = values.expiryDate;
                }
            }

            const payload = {
                medicineName: values.medicineName,
                genericName: values.genericName,
                category: values.category,
                manufacturer: values.manufacturer,
                batchNumber: values.batchNumber,
                quantity: values.quantity,
                reorderLevel: values.reorderLevel,
                unitPrice: values.unitPrice,
                expiryDate: formattedExpiryDate,
                description: values.description,
            };

            console.log('Submitting payload:', payload);

            if (isEditMode && medicineId) {
                await medicineService.updateMedicine(medicineId, payload);
                message.success('Medicine updated successfully');
            } else {
                await medicineService.createMedicine(payload);
                message.success('Medicine created successfully');
            }
            navigate('/medicines');
        } catch (error) {
            message.error(error.message || 'Failed to save medicine');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
            <Layout.Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Button 
                        type="text" 
                        icon={<ArrowLeftOutlined />} 
                        onClick={() => navigate('/medicines')} 
                        style={{ marginRight: '16px' }} 
                    />
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                        {isEditMode ? 'Edit Medicine' : 'Add Medicine'}
                    </h1>
                </div>
            </Layout.Header>

            <Content style={{ padding: '24px' }}>
                <Card>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                    >
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="medicineName"
                                label="Medicine Name"
                                rules={[{ required: true, message: 'Please enter medicine name' }]}
                            >
                                <Input placeholder="Enter medicine name" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="genericName"
                                label="Generic Name"
                                rules={[{ required: true, message: 'Please enter generic name' }]}
                            >
                                <Input placeholder="Enter generic name" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="category"
                                label="Category"
                                rules={[{ required: true, message: 'Please select a category' }]}
                            >
                                <Select
                                    placeholder="Select category"
                                    options={categories.map(cat => ({ label: cat, value: cat }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="manufacturer"
                                label="Manufacturer"
                                rules={[{ required: true, message: 'Please enter manufacturer' }]}
                            >
                                <Input placeholder="Enter manufacturer name" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="batchNumber"
                                label="Batch Number"
                                rules={[{ required: true, message: 'Please enter batch number' }]}
                            >
                                <Input placeholder="Enter batch number" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="quantity"
                                label="Quantity"
                                rules={[{ required: true, message: 'Please enter quantity' }]}
                            >
                                <InputNumber placeholder="Enter quantity" min={0} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="reorderLevel"
                                label="Reorder Level"
                                rules={[{ required: true, message: 'Please enter reorder level' }]}
                            >
                                <InputNumber placeholder="Enter reorder level" min={0} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="unitPrice"
                                label="Unit Price (₹)"
                                rules={[{ required: true, message: 'Please enter unit price' }]}
                            >
                                <InputNumber placeholder="Enter unit price" min={0} precision={2} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="expiryDate"
                                label="Expiry Date"
                                rules={[{ required: true, message: 'Please select expiry date' }]}
                            >
                                <DatePicker />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <Input.TextArea placeholder="Enter medicine description" rows={4} />
                    </Form.Item>

                    <Form.Item style={{ marginTop: '24px' }}>
                        <Button 
                            onClick={() => navigate('/medicines')} 
                            style={{ marginRight: '8px' }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                        >
                            {isEditMode ? 'Update Medicine' : 'Add Medicine'}
                        </Button>
                    </Form.Item>
                </Form>
                </Card>
            </Content>
        </Layout>
    );
};

export default AddMedicine;
