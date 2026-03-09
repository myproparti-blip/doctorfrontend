import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Card, Form, Input, Button, Select, Row, Col, message, Layout, InputNumber, Table, Space } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons';
import { roomService, patientService } from '../services/api';

const { Content } = Layout;

const AddRoom = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: roomId } = useParams();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [patients, setPatients] = useState([]);
    const [assignedPatients, setAssignedPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState('');
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

    // Fetch patients
    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const response = await patientService.getAllPatients(1, 1000);
                const patientList = response.data || [];
                console.log('Fetched patients:', patientList);
                setPatients(patientList);
            } catch (error) {
                console.error('Failed to load patients:', error);
                message.error('Failed to load patients');
            }
        };
        fetchPatients();
    }, []);

    // Load room data when in edit/view mode
    useEffect(() => {
        if ((isEditMode || isViewMode) && roomId) {
            const fetchRoom = async () => {
                try {
                    const response = await roomService.getRoomById(roomId);
                    const data = response.data || response;

                    console.log('Fetched room data:', data);

                    form.setFieldsValue({
                        roomNumber: data.roomNumber,
                        roomType: data.roomType,
                        floor: data.floor,
                        bedCapacity: data.bedCapacity,
                        costPerDay: data.costPerDay,
                        status: data.status || 'available',
                        features: data.features && Array.isArray(data.features)
                            ? data.features.join(', ')
                            : '',
                        notes: data.notes,
                    });

                    // Load assigned patients with proper structure
                    if (data.assignedPatients && Array.isArray(data.assignedPatients)) {
                        console.log('Assigned patients:', data.assignedPatients);
                        setAssignedPatients(data.assignedPatients);
                    } else {
                        console.log('No assigned patients found');
                        setAssignedPatients([]);
                    }
                } catch (error) {
                    message.error('Failed to load room details');
                    console.error('Error fetching room:', error);
                }
            };
            fetchRoom();
        } else if ((isEditMode || isViewMode) && roomData) {
            // Fallback to location state
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
            // Load assigned patients
            if (roomData.assignedPatients) {
                setAssignedPatients(roomData.assignedPatients || []);
            }
        }
    }, [isEditMode, isViewMode, roomId, roomData, form]);

    const handleAddPatient = () => {
        if (!selectedPatient) {
            message.warning('Please select a patient');
            return;
        }

        const alreadyAssigned = assignedPatients.some(ap => {
            const apId = typeof ap.patientId === 'string' ? ap.patientId : ap.patientId?._id;
            return apId === selectedPatient;
        });

        if (alreadyAssigned) {
            message.warning('This patient is already assigned to this room');
            return;
        }

        const newAssignment = {
            patientId: selectedPatient,
            bedNumber: `Bed ${assignedPatients.length + 1}`,
            assignedDate: new Date().toISOString(),
        };

        setAssignedPatients([...assignedPatients, newAssignment]);
        setSelectedPatient('');
    };

    const handleRemovePatient = (index) => {
        const newAssignments = assignedPatients.filter((_, i) => i !== index);
        setAssignedPatients(newAssignments);
    };

    const patientColumns = [
        {
            title: 'Patient Name',
            dataIndex: 'patientId',
            key: 'patientName',
            render: (patientId) => {
                const id = typeof patientId === 'string' ? patientId : patientId?._id;
                const patient = patients.find(p => p._id === id);
                return patient?.name || 'N/A';
            },
        },
        {
            title: 'Bed Number',
            dataIndex: 'bedNumber',
            key: 'bedNumber',
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, __, index) => !isViewMode && (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemovePatient(index)}
                />
            ),
        },
    ];

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // Parse features from comma-separated string
            const featuresList = values.features
                ? values.features.split(',').map((f) => f.trim()).filter((f) => f)
                : [];

            console.log('=== ROOM SUBMIT DEBUG ===');
            console.log('isEditMode:', isEditMode);
            console.log('assignedPatients:', JSON.stringify(assignedPatients, null, 2));

            const roomPayload = {
                roomNumber: values.roomNumber,
                roomType: values.roomType,
                floor: values.floor,
                bedCapacity: values.bedCapacity,
                costPerDay: values.costPerDay,
                features: featuresList,
                notes: values.notes || '',
            };

            // Only add fields that should be in edit mode
            if (isEditMode) {
                roomPayload.status = values.status;
                roomPayload.assignedPatients = assignedPatients;
                console.log('Adding edit mode fields - status:', values.status);
                console.log('Adding assignedPatients:', JSON.stringify(assignedPatients, null, 2));
            }

            console.log('Room payload being sent:', JSON.stringify(roomPayload, null, 2));
            console.log('=== END ROOM SUBMIT DEBUG ===');

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

                        {isEditMode && (
                            <>
                                <div style={{ marginTop: '24px', marginBottom: '16px' }}>
                                    <h3 style={{ marginBottom: '16px' }}>Assign Patients</h3>
                                    <Space style={{ width: '100%', marginBottom: '16px' }}>
                                        <Select
                                            placeholder="Select patient to assign"
                                            value={selectedPatient}
                                            onChange={setSelectedPatient}
                                            style={{ width: '250px' }}
                                            showSearch
                                            optionFilterProp="label"
                                            options={patients
                                                .filter(p => !assignedPatients.some(ap => {
                                                    const apId = typeof ap.patientId === 'string' ? ap.patientId : ap.patientId?._id;
                                                    return apId === p._id;
                                                }))
                                                .map(p => ({ label: p.name, value: p._id }))}
                                            disabled={isViewMode || patients.length === 0}
                                        />
                                        <Button
                                            type="primary"
                                            onClick={handleAddPatient}
                                            disabled={isViewMode || !selectedPatient}
                                        >
                                            Assign
                                        </Button>
                                    </Space>
                                </div>

                                <Form.Item label="Assigned Patients">
                                    <Table
                                        columns={patientColumns}
                                        dataSource={assignedPatients}
                                        rowKey={(_, index) => index}
                                        pagination={false}
                                        size="small"
                                    />
                                </Form.Item>
                            </>
                        )}

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
