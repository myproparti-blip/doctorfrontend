import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Card, Form, Input, Button, Select, Row, Col, message, Layout, InputNumber } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { roomService } from '../services/api';

const { Content } = Layout;

const AddRoom = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: roomId } = useParams();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const isEditMode = location.state?.isEdit || !!roomId;
    const isViewMode = location.state?.isView;
    const roomData = location.state?.roomData;

    const roomTypes = [
        'ICU',
        'General',
        'Private',
        'Semi-Private',
        'Emergency',
    ];

    const statusOptions = ['available', 'occupied', 'maintenance', 'closed'];

    // Load room data when in edit/view mode
    useEffect(() => {
        if ((isEditMode || isViewMode) && roomData) {
            form.setFieldsValue({
                roomNumber: roomData.roomNumber,
                roomType: roomData.roomType,
                floor: roomData.floor,
                bedCapacity: roomData.bedCapacity,
                costPerDay: roomData.costPerDay,
                status: roomData.status || 'available',
                features: roomData.features && Array.isArray(roomData.features)
                    ? roomData.features.join(', ')
                    : '',
                notes: roomData.notes,
            });
        }
    }, [isEditMode, isViewMode, roomData, form]);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // Parse features from comma-separated string
            const featuresList = values.features
                ? values.features.split(',').map((f) => f.trim()).filter((f) => f)
                : [];

            const roomPayload = {
                roomNumber: values.roomNumber,
                roomType: values.roomType,
                floor: values.floor,
                bedCapacity: values.bedCapacity,
                costPerDay: values.costPerDay,
                features: featuresList,
                notes: values.notes || '',
                ...(isEditMode && { status: values.status }),
            };

            if (isEditMode && roomId) {
                await roomService.updateRoom(roomId, roomPayload);
                message.success('Room updated successfully');
            } else {
                await roomService.createRoom(roomPayload);
                message.success('Room created successfully');
            }
            navigate('/rooms');
        } catch (error) {
            message.error(error.message || 'Failed to save room');
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
                        onClick={() => navigate('/rooms')} 
                        style={{ marginRight: '16px' }} 
                    />
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                        {isViewMode ? 'View Room' : isEditMode ? 'Edit Room' : 'Add Room'}
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
                                label="Room Number"
                                name="roomNumber"
                                rules={[{ required: true, message: 'Room number is required' }]}
                            >
                                <Input placeholder="101" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                label="Room Type"
                                name="roomType"
                                rules={[{ required: true, message: 'Room type is required' }]}
                            >
                                <Select
                                    placeholder="Select room type"
                                    options={roomTypes.map(type => ({ label: type, value: type }))}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                label="Floor"
                                name="floor"
                                rules={[{ required: true, message: 'Floor is required' }]}
                            >
                                <InputNumber
                                    min={0}
                                    max={10}
                                    placeholder="1"
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                label="Bed Capacity"
                                name="bedCapacity"
                                rules={[{ required: true, message: 'Bed capacity is required' }]}
                            >
                                <InputNumber
                                    min={1}
                                    max={10}
                                    placeholder="2"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                label="Cost Per Day (₹)"
                                name="costPerDay"
                                rules={[{ required: true, message: 'Cost per day is required' }]}
                            >
                                <InputNumber
                                    min={0}
                                    placeholder="5000"
                                />
                            </Form.Item>
                        </Col>
                        {isEditMode && (
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    label="Status"
                                    name="status"
                                    rules={[{ required: true, message: 'Status is required' }]}
                                >
                                    <Select
                                        placeholder="Select status"
                                        options={statusOptions.map(status => ({
                                            label: status.charAt(0).toUpperCase() + status.slice(1),
                                            value: status
                                        }))}
                                    />
                                </Form.Item>
                            </Col>
                        )}
                    </Row>

                    <Form.Item
                        label="Features (comma-separated)"
                        name="features"
                    >
                        <Input
                            placeholder="e.g., AC, WiFi, TV, Attached Bathroom"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Notes"
                        name="notes"
                    >
                        <Input.TextArea
                            placeholder="Any relevant room information or observations"
                            rows={3}
                        />
                    </Form.Item>

                    {!isViewMode && (
                        <Form.Item style={{ marginTop: '24px' }}>
                            <Button 
                                onClick={() => navigate('/rooms')} 
                                style={{ marginRight: '8px' }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                            >
                                {isEditMode ? 'Update Room' : 'Add Room'}
                            </Button>
                        </Form.Item>
                    )}
                </Form>
                </Card>
            </Content>
        </Layout>
    );
};

export default AddRoom;
