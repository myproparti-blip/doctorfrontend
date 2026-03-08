import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, Form, Input, Button, Select, DatePicker, Row, Col, message, Layout, InputNumber, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { employeeService, leaveService } from '../services/api';

const { Content } = Layout;

const AddLeave = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: leaveId } = useParams();
    const [form] = Form.useForm();
     const [loading, setLoading] = useState(false);
      const [fetchingData, setFetchingData] = useState(false);
      const [employees, setEmployees] = useState([]);
      const [selectedEmployee, setSelectedEmployee] = useState(null);
      const isEditMode = location.state?.isEdit || !!leaveId;
      const isViewMode = location.state?.isView;
      const leaveData = location.state?.leaveData;

    const leaveTypes = [
        'Casual Leave',
        'Sick Leave',
        'Earned Leave',
        'Maternity Leave',
        'Paternity Leave',
        'Unpaid Leave',
        'Study Leave',
    ];

    // Fetch employees
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await employeeService.getAllEmployees(1, 100);
                const employeeList = response.data || [];
                setEmployees(employeeList);
            } catch (error) {
                console.error('Failed to load employees:', error);
            }
        };
        fetchEmployees();
    }, []);

    // Load leave data if editing
    useEffect(() => {
        const fetchLeaveData = async () => {
            if (isEditMode && leaveId) {
                setFetchingData(true);
                try {
                    const response = await leaveService.getLeaveById(leaveId);
                    const leave = response.data || response;
                    
                    // Store employee data
                    if (leave.employeeId) {
                        setSelectedEmployee({
                            _id: String(leave.employeeId._id || leave.employeeId),
                            name: leave.employeeId.name
                        });
                    }
                    
                    // Convert employee ID to string for proper matching
                    const employeeId = leave.employeeId?._id ? String(leave.employeeId._id) : leave.employeeId;
                    
                    form.setFieldsValue({
                        employeeId: employeeId,
                        leaveType: leave.leaveType,
                        startDate: leave.startDate ? dayjs(leave.startDate) : null,
                        endDate: leave.endDate ? dayjs(leave.endDate) : null,
                        numberOfDays: leave.numberOfDays,
                        reason: leave.reason,
                    });
                } catch (error) {
                    message.error('Failed to load leave data');
                    console.error('Error fetching leave:', error);
                } finally {
                    setFetchingData(false);
                }
            } else if (isEditMode && leaveData) {
                // Fallback to location state data
                if (leaveData.employeeId) {
                    setSelectedEmployee({
                        _id: String(leaveData.employeeId._id || leaveData.employeeId),
                        name: leaveData.employeeId.name
                    });
                }
                
                const employeeId = leaveData.employeeId?._id ? String(leaveData.employeeId._id) : leaveData.employeeId;
                
                form.setFieldsValue({
                    employeeId: employeeId,
                    leaveType: leaveData.leaveType,
                    startDate: leaveData.startDate ? dayjs(leaveData.startDate) : null,
                    endDate: leaveData.endDate ? dayjs(leaveData.endDate) : null,
                    numberOfDays: leaveData.numberOfDays,
                    reason: leaveData.reason,
                });
            }
        };

        fetchLeaveData();
    }, [isEditMode, leaveId, leaveData, form]);

    const handleDateChange = () => {
        const startDate = form.getFieldValue('startDate');
        const endDate = form.getFieldValue('endDate');
        
        if (startDate && endDate) {
            const days = endDate.diff(startDate, 'day') + 1;
            form.setFieldValue('numberOfDays', days);
        }
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // Calculate numberOfDays if not already set
            let numberOfDays = values.numberOfDays;
            if (!numberOfDays && values.startDate && values.endDate) {
                numberOfDays = values.endDate.diff(values.startDate, 'day') + 1;
            }

            const payload = {
                employeeId: values.employeeId,
                leaveType: values.leaveType,
                startDate: values.startDate?.format('YYYY-MM-DD'),
                endDate: values.endDate?.format('YYYY-MM-DD'),
                numberOfDays: numberOfDays,
                reason: values.reason,
            };

            if (isEditMode && leaveId) {
                await leaveService.updateLeave(leaveId, payload);
                message.success('Leave updated successfully');
            } else {
                await leaveService.applyLeave(payload);
                message.success('Leave applied successfully');
            }
            navigate('/leaves');
        } catch (error) {
            message.error(error.message || 'Failed to save leave');
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
                        onClick={() => navigate('/leaves')} 
                        style={{ marginRight: '16px' }} 
                    />
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                        {isViewMode ? 'View Leave' : isEditMode ? 'Edit Leave' : 'Apply for Leave'}
                    </h1>
                </div>
            </Layout.Header>

            <Content style={{ padding: '24px' }}>
                <Card>
                    <Spin spinning={fetchingData}>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                    >
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="employeeId"
                                label="Employee"
                                rules={[{ required: true, message: 'Please select an employee' }]}
                            >
                                <Select
                                     placeholder="Select employee"
                                     optionLabelProp="label"
                                     disabled={isViewMode}
                                     options={[
                                         ...(selectedEmployee ? [{ label: selectedEmployee.name, value: selectedEmployee._id }] : []),
                                         ...employees.map(emp => ({ label: emp.name, value: String(emp._id) }))
                                     ].reduce((acc, opt) => {
                                         if (!acc.find(o => o.value === opt.value)) {
                                             acc.push(opt);
                                         }
                                         return acc;
                                     }, [])}
                                 />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="leaveType"
                                label="Leave Type"
                                rules={[{ required: true, message: 'Please select a leave type' }]}
                            >
                                <Select
                                    placeholder="Select leave type"
                                    disabled={isViewMode}
                                    options={leaveTypes.map(type => ({ label: type, value: type }))}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="startDate"
                                label="Start Date"
                                rules={[{ required: true, message: 'Please select start date' }]}
                            >
                                <DatePicker onChange={handleDateChange} disabled={isViewMode} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                 name="endDate"
                                 label="End Date"
                                 rules={[{ required: true, message: 'Please select end date' }]}
                             >
                                 <DatePicker onChange={handleDateChange} disabled={isViewMode} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="numberOfDays"
                                label="Number of Days"
                                rules={[
                                    { 
                                        validator: (_, value) => {
                                            const startDate = form.getFieldValue('startDate');
                                            const endDate = form.getFieldValue('endDate');
                                            if (startDate && endDate && !value) {
                                                return Promise.reject(new Error('Number of days is required'));
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                            >
                                <InputNumber disabled min={1} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="reason"
                        label="Reason for Leave"
                        rules={[{ required: true, message: 'Please provide a reason' }]}
                    >
                        <Input.TextArea placeholder="Enter reason for leave" rows={4} disabled={isViewMode} />
                    </Form.Item>

                    {!isViewMode && (
                        <Form.Item style={{ marginTop: '24px' }}>
                            <Button 
                                onClick={() => navigate('/leaves')} 
                                style={{ marginRight: '8px' }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                            >
                                {isEditMode ? 'Update Leave' : 'Apply for Leave'}
                            </Button>
                        </Form.Item>
                    )}
                    {isViewMode && (
                        <Form.Item style={{ marginTop: '24px' }}>
                            <Button 
                                onClick={() => navigate('/leaves')}
                            >
                                Back
                            </Button>
                        </Form.Item>
                    )}
                </Form>
                    </Spin>
                </Card>
                </Content>
        </Layout>
    );
};

export default AddLeave;
