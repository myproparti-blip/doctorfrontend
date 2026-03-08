import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Card, Form, Input, Button, Select, DatePicker, Row, Col, message, Layout } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { employeeService } from '../services/api';

const { Content } = Layout;

const AddEmployee = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: urlEmployeeId } = useParams();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const isEditMode = location.state?.isEdit || !!urlEmployeeId;
    const employeeData = location.state?.employeeData;
    const employeeId = urlEmployeeId || employeeData?._id;

    const departments = [
        'Cardiology',
        'Pediatrics',
        'Nursing',
        'Laboratory',
        'Administration',
        'Surgery',
        'Radiology',
        'Emergency',
        'Psychiatry',
        'Oncology',
    ];

    const positions = [
        'Doctor',
        'Senior Doctor',
        'Nurse',
        'Head Nurse',
        'Lab Technician',
        'Administrator',
        'Surgeon',
        'Radiologist',
        'Receptionist',
        'Pharmacist',
    ];

    const statusOptions = ['active', 'inactive'];

    // Load employee data when in edit mode
    useEffect(() => {
        if (isEditMode && employeeId) {
            setFormLoading(true);
            const fetchEmployeeData = async () => {
                try {
                    if (!employeeId) {
                        throw new Error('Employee ID not found');
                    }

                    const response = await employeeService.getEmployeeById(String(employeeId).trim());
                    const employee = response.data || response;

                    // Parse and validate joinDate (format: YYYY-MM-DD)
                    let parsedJoinDate = null;
                    if (employee.joinDate) {
                        const parsedDate = dayjs(employee.joinDate, 'YYYY-MM-DD');
                        if (parsedDate.isValid()) {
                            parsedJoinDate = parsedDate;
                        } else {
                            console.warn('Invalid date received from API:', employee.joinDate);
                        }
                    }

                    // Parse and validate relievedDate (format: YYYY-MM-DD)
                    let parsedRelievedDate = null;
                    if (employee.relievedDate) {
                        const parsedDate = dayjs(employee.relievedDate, 'YYYY-MM-DD');
                        if (parsedDate.isValid()) {
                            parsedRelievedDate = parsedDate;
                        } else {
                            console.warn('Invalid date received from API:', employee.relievedDate);
                        }
                    }

                    form.setFieldsValue({
                        name: employee.name,
                        email: employee.email,
                        phone: employee.phone,
                        department: employee.department,
                        position: employee.position,
                        joinDate: parsedJoinDate,
                        relievedDate: parsedRelievedDate,
                        status: employee.status || 'active',
                    });
                } catch (error) {
                    console.error('Error loading employee data:', error);
                    message.error(error.message || 'Failed to load employee data');
                } finally {
                    setFormLoading(false);
                }
            };

            fetchEmployeeData();
        }
    }, [isEditMode, employeeId, form]);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // Validate joinDate
            let formattedJoinDate = null;
            if (values.joinDate) {
                if (!values.joinDate.isValid()) {
                    throw new Error('Invalid join date. Please select a valid date.');
                }
                formattedJoinDate = values.joinDate.format('YYYY-MM-DD');
            }

            // Validate relievedDate
            let formattedRelievedDate = null;
            if (values.relievedDate) {
                if (!values.relievedDate.isValid()) {
                    throw new Error('Invalid relieved date. Please select a valid date.');
                }
                formattedRelievedDate = values.relievedDate.format('YYYY-MM-DD');
            }

            const employeePayload = {
                name: values.name,
                email: values.email,
                phone: values.phone,
                department: values.department,
                position: values.position,
                joinDate: formattedJoinDate,
                relievedDate: formattedRelievedDate,
                status: values.status || 'active',
            };

            if (isEditMode && employeeId) {
                await employeeService.updateEmployee(String(employeeId).trim(), employeePayload);
                message.success('Employee updated successfully');
            } else {
                await employeeService.createEmployee(employeePayload);
                message.success('Employee added successfully');
            }

            form.resetFields();

            // Navigate back to employees after successful submission
            setTimeout(() => {
                navigate('/employees');
            }, 1500);
        } catch (error) {
            message.error(error.message || (isEditMode ? 'Failed to update employee' : 'Failed to add employee'));
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
                        onClick={() => navigate('/employees')} 
                        style={{ marginRight: '16px' }} 
                    />
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                        {isEditMode ? 'Edit Employee' : 'Add Employee'}
                    </h1>
                </div>
            </Layout.Header>

            <Content style={{ padding: '24px' }}>
                <Card loading={formLoading}>
                    <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={formLoading}>
                        <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '500' }}>Personal Information</h3>
                        <Row gutter={16}>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item 
                                    label="Full Name" 
                                    name="name" 
                                    rules={[{ required: true, message: 'Name is required' }]}
                                >
                                    <Input placeholder="Dr. James Wilson" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item 
                                    label="Email" 
                                    name="email" 
                                    rules={[
                                        { required: true, message: 'Email is required' },
                                        { type: 'email', message: 'Valid email is required' }
                                    ]}
                                >
                                    <Input placeholder="doctor@hospital.com" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item 
                                    label="Phone" 
                                    name="phone" 
                                    rules={[{ required: true, message: 'Phone is required' }]}
                                >
                                    <Input placeholder="+1 (555) 123-4567" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item 
                                    label="Join Date" 
                                    name="joinDate" 
                                    rules={[{ required: true, message: 'Join date is required' }]}
                                >
                                    <DatePicker
                                        style={{ width: '100%' }}
                                        format="YYYY-MM-DD"
                                        disabledDate={(current) => current && current > dayjs().endOf('day')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item 
                                    label="Relieved Date" 
                                    name="relievedDate"
                                >
                                    <DatePicker
                                        style={{ width: '100%' }}
                                        format="YYYY-MM-DD"
                                        disabledDate={(current) => current && current > dayjs().endOf('day')}
                                        placeholder="Optional - if employee has left"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <h3 style={{ marginTop: '24px', marginBottom: '16px', fontSize: '16px', fontWeight: '500' }}>Professional Information</h3>
                        <Row gutter={16}>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item 
                                    label="Department" 
                                    name="department" 
                                    rules={[{ required: true, message: 'Department is required' }]}
                                >
                                    <Select placeholder="Select department">
                                        {departments.map((dept) => (
                                            <Select.Option key={dept} value={dept}>
                                                {dept}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item 
                                    label="Position" 
                                    name="position" 
                                    rules={[{ required: true, message: 'Position is required' }]}
                                >
                                    <Select placeholder="Select position">
                                        {positions.map((pos) => (
                                            <Select.Option key={pos} value={pos}>
                                                {pos}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item 
                                    label="Status" 
                                    name="status" 
                                    initialValue="active"
                                >
                                    <Select placeholder="Select status">
                                        {statusOptions.map((status) => (
                                            <Select.Option key={status} value={status}>
                                                {status === 'active' ? 'Active' : 'Inactive'}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item style={{ marginTop: '24px' }}>
                            <Button 
                                onClick={() => navigate('/employees')} 
                                style={{ marginRight: '8px' }}
                            >
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                {isEditMode ? 'Save Changes' : 'Add Employee'}
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            </Content>
        </Layout>
    );
};

export default AddEmployee;
