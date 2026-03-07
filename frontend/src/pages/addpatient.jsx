import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Form, Input, Button, Card, message, Layout, DatePicker, Select, InputNumber, Row, Col } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { patientService } from '../services/api';
import { parseDate, formatDateForAPI } from '../utils/dateHelpers';

dayjs.extend(utc);
dayjs.extend(timezone);

const { Content } = Layout;
const conditions = ['Hypertension', 'Diabetes', 'Heart Disease', 'Thyroid', 'Arthritis', 'Asthma', 'Other'];
const riskLevels = ['Low', 'Medium', 'High'];
const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const statusOptions = ['active', 'inactive', 'discharged'];

// Indian States and Cities data
const indianStatesAndCities = {
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Tirupati', 'Guntur', 'Nellore'],
    'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat'],
    'Assam': ['Guwahati', 'Nagaon', 'Silchar', 'Dibrugarh'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga'],
    'Chhattisgarh': ['Raipur', 'Bhilai', 'Durg', 'Bilaspur'],
    'Goa': ['Panaji', 'Margao', 'Vasco da Gama'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Jamnagar', 'Anand'],
    'Haryana': ['Faridabad', 'Gurgaon', 'Hisar', 'Rohtak', 'Panipat'],
    'Himachal Pradesh': ['Shimla', 'Mandi', 'Solan', 'Kangra'],
    'Jharkhand': ['Ranchi', 'Dhanbad', 'Giridih', 'Bokaro', 'Jamshedpur'],
    'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Tumkur'],
    'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Kottayam', 'Alappuzha'],
    'Madhya Pradesh': ['Indore', 'Bhopal', 'Gwalior', 'Jabalpur', 'Ujjain'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Aurangabad', 'Nashik', 'Thane', 'Kolhapur'],
    'Manipur': ['Imphal', 'Bishnupur'],
    'Meghalaya': ['Shillong', 'Tura'],
    'Mizoram': ['Aizawl', 'Lunglei'],
    'Nagaland': ['Kohima', 'Dimapur'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur'],
    'Punjab': ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner'],
    'Sikkim': ['Gangtok', 'Namchi'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salemi', 'Tiruppur', 'Erode'],
    'Telangana': ['Hyderabad', 'Secunderabad', 'Warangal', 'Nizamabad'],
    'Tripura': ['Agartala', 'Dharmanagar'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Meerut', 'Ghaziabad', 'Noida'],
    'Uttarakhand': ['Dehradun', 'Nainital', 'Rishikesh', 'Haldwani'],
    'West Bengal': ['Kolkata', 'Howrah', 'Asansol', 'Durgapur', 'Siliguri'],
    'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Leh'],
    'Ladakh': ['Leh', 'Kargil'],
    'Delhi': ['New Delhi', 'Central Delhi', 'East Delhi', 'North Delhi', 'South Delhi', 'West Delhi']
};



const AddPatient = () => {
    const [loading, setLoading] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [selectedState, setSelectedState] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { id: paramsId } = useParams();
    const [form] = Form.useForm();
    const isEditMode = location.pathname.includes('/edit-patient/');
    const existingPatient = location.state?.patient;

    // Extract and validate patient ID from URL params or state
    const patientIdFromUrl = useMemo(() => {
        let id = null;

        // First, try to get from state patient (most reliable)
        if (existingPatient?._id) {
            const stateId = existingPatient._id;
            if (typeof stateId === 'string') {
                id = stateId;
            } else if (stateId.toString && stateId.toString() !== '[object Object]') {
                id = stateId.toString();
            }
            if (id) return id;
        }

        // Then try useParams ID if available and valid
        if (paramsId && typeof paramsId === 'string' && paramsId !== '[object Object]' && paramsId !== '{}') {
            return paramsId;
        }

        return null;
    }, [paramsId, existingPatient?._id]);

    // Fetch patient data from API if in edit mode
    useEffect(() => {
        const loadPatientData = async () => {
            // Only load if in edit mode and we have a valid ID
            if (!isEditMode || !patientIdFromUrl) return;

            // Validate ID
            if (patientIdFromUrl === '[object Object]' || patientIdFromUrl === '{}') {
                message.error('Invalid patient ID');
                navigate('/patients');
                return;
            }

            setFormLoading(true);
            try {
                console.log('Fetching patient with ID:', patientIdFromUrl);
                const response = await patientService.getPatientById(patientIdFromUrl);
                const patient = response.data || response;

                if (!patient || !patient.name) {
                    throw new Error('Invalid patient data received');
                }

                console.log('Patient data loaded:', patient);

                const patientState = patient.address?.state || '';
                setSelectedState(patientState);

                form.setFieldsValue({
                    name: patient.name,
                    age: patient.age,
                    email: patient.email,
                    phone: patient.phone,
                    bloodType: patient.bloodType,
                    status: patient.status,
                    street: patient.address?.street || '',
                    city: patient.address?.city || '',
                    state: patientState,
                    postalCode: patient.address?.postalCode || '',
                    condition: patient.condition,
                    risk: patient.risk,
                    healthScore: patient.healthScore,
                    lastCheckup: parseDate(patient.lastCheckup),
                    joinDate: parseDate(patient.joinDate),
                    relievedDate: parseDate(patient.relievedDate),
                    allergies: patient.allergies && Array.isArray(patient.allergies)
                        ? patient.allergies.map(a => typeof a === 'string' ? a : a.name || a).join(', ')
                        : '',
                    notes: patient.notes,
                    emergencyName: patient.emergencyContact?.name || '',
                    emergencyRelationship: patient.emergencyContact?.relationship || '',
                    emergencyPhone: patient.emergencyContact?.phone || '',
                });
            } catch (error) {
                console.error('Error loading patient:', error);
                message.error(error.message || 'Failed to load patient data');
                navigate('/patients');
            } finally {
                setFormLoading(false);
            }
        };

        loadPatientData();
    }, [isEditMode, patientIdFromUrl, form, navigate]);



    const handleSubmit = async (values) => {
        setLoading(true);
        try {

            const basePayload = {
                name: values.name,
                age: values.age,
                email: values.email,
                phone: values.phone,
                bloodType: values.bloodType,
                status: values.status || 'active',
                condition: values.condition,
                risk: values.risk,
                healthScore: values.healthScore || 5,
                lastCheckup: formatDateForAPI(values.lastCheckup),
                joinDate: formatDateForAPI(values.joinDate),
                relievedDate: formatDateForAPI(values.relievedDate),
                allergies: values.allergies ? values.allergies.split(',').map((a) => a.trim()) : [],
                notes: values.notes,
            };

            if (isEditMode) {
                // For update, send address as nested object (backend will handle update)
                const id = existingPatient?._id || patientIdFromUrl;
                const updatePayload = {
                    ...basePayload,
                };

                // Only include address if all required fields are present
                if (values.street || values.city || values.state || values.postalCode || values.country) {
                    updatePayload.address = {
                        street: values.street || '',
                        city: values.city || '',
                        state: values.state || '',
                        postalCode: values.postalCode || '',
                        country: values.country || '',
                    };
                }

                // Only include emergencyContact if at least one field is present
                if (values.emergencyName || values.emergencyRelationship || values.emergencyPhone) {
                    updatePayload.emergencyContact = {
                        name: values.emergencyName || '',
                        relationship: values.emergencyRelationship || '',
                        phone: values.emergencyPhone || '',
                    };
                }

                console.log('Updating patient with ID:', id, 'Payload:', updatePayload);
                await patientService.updatePatient(id, updatePayload);
                message.success('Patient updated successfully!');
            } else {
                // For create, send address as nested object
                const createPayload = {
                    ...basePayload,
                    address: {
                        street: values.street,
                        city: values.city,
                        state: values.state,
                        postalCode: values.postalCode,
                        country: values.country,
                    },
                    emergencyContact: {
                        name: values.emergencyName,
                        relationship: values.emergencyRelationship,
                        phone: values.emergencyPhone,
                    },
                };

                console.log('Creating patient with payload:', createPayload);
                await patientService.createPatient(createPayload);
                message.success('Patient added successfully!');
            }

            navigate('/patients');
        } catch (err) {
            console.error('Submit error:', err);
            message.error(err.message || 'Error saving patient');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
            <Layout.Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/patients')} style={{ marginRight: '16px' }} />
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{isEditMode ? 'Edit Patient' : 'Add Patient'}</h1>
                </div>
            </Layout.Header>

            <Content style={{ padding: '24px' }}>
                <Card loading={formLoading}>
                    <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={formLoading}>
                        <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '500' }}>Personal Information</h3>
                        <Row gutter={16}>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Name is required' }]}>
                                    <Input placeholder="Dr. James Wilson" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="Age" name="age" rules={[{ required: true, message: 'Age is required' }]}>
                                    <InputNumber min={0} max={120} style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Valid email is required' }]}>
                                    <Input placeholder="doctor@example.com" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="Phone" name="phone" rules={[{ required: true, message: 'Phone is required' }]}>
                                    <Input placeholder="+1 (555) 123-4567" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <h3 style={{ marginTop: '24px', marginBottom: '16px', fontSize: '16px', fontWeight: '500' }}>Address</h3>
                        <Row gutter={16}>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="Street Address" name="street">
                                    <Input placeholder="123 Main Street" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="State/Province" name="state">
                                    <Select
                                        placeholder="Select State"
                                        showSearch
                                        filterOption={(input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                        options={Object.keys(indianStatesAndCities).map((state) => ({
                                            label: state,
                                            value: state,
                                        }))}
                                        onChange={(value) => {
                                            setSelectedState(value);
                                            form.setFieldValue('city', undefined);
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="City" name="city">
                                    <Select
                                        placeholder="Select City"
                                        showSearch
                                        filterOption={(input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                        disabled={!selectedState}
                                        options={selectedState
                                            ? indianStatesAndCities[selectedState].map((city) => ({
                                                label: city,
                                                value: city,
                                            }))
                                            : []
                                        }
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="Postal Code" name="postalCode">
                                    <Input placeholder="400001" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <h3 style={{ marginTop: '24px', marginBottom: '16px', fontSize: '16px', fontWeight: '500' }}>Medical Information</h3>
                        <Row gutter={16}>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="Blood Type" name="bloodType">
                                    <Select placeholder="Select blood type">
                                        {bloodTypes.map((type) => (
                                            <Select.Option key={type} value={type}>
                                                {type}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="Medical Condition" name="condition" rules={[{ required: true, message: 'Condition is required' }]}>
                                    <Select placeholder="Select condition">
                                        {conditions.map((cond) => (
                                            <Select.Option key={cond} value={cond}>
                                                {cond}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="Risk Level" name="risk">
                                    <Select placeholder="Select risk level">
                                        {riskLevels.map((risk) => (
                                            <Select.Option key={risk} value={risk}>
                                                {risk}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="Status" name="status" initialValue="active">
                                    <Select placeholder="Select status">
                                        {statusOptions.map((stat) => (
                                            <Select.Option key={stat} value={stat}>
                                                {stat === 'active' ? 'Active' : stat === 'inactive' ? 'Inactive' : 'Discharged'}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="Health Score (0-10)" name="healthScore">
                                    <InputNumber min={0} max={10} style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="Join Date" name="joinDate">
                                    <DatePicker
                                        style={{ width: '100%' }}
                                        format="YYYY-MM-DD"
                                        disabledDate={(current) => current && current > dayjs().endOf('day')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="Relieved Date" name="relievedDate">
                                    <DatePicker
                                        style={{ width: '100%' }}
                                        format="YYYY-MM-DD"
                                        disabledDate={(current) => current && current > dayjs().endOf('day')}
                                        placeholder="Optional - if patient has left"
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="Last Checkup Date" name="lastCheckup">
                                    <DatePicker
                                        style={{ width: '100%' }}
                                        format="YYYY-MM-DD"
                                        disabledDate={(current) => current && current > dayjs().endOf('day')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item label="Allergies" name="allergies">
                                    <Input placeholder="Enter allergies separated by commas" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item label="Additional Medical Notes" name="notes">
                            <Input.TextArea placeholder="Any relevant medical history or observations" rows={3} />
                        </Form.Item>

                        <h3 style={{ marginTop: '24px', marginBottom: '16px', fontSize: '16px', fontWeight: '500' }}>Emergency Contact</h3>
                        <Row gutter={16}>
                            <Col xs={24} sm={12} lg={8}>
                                <Form.Item label="Contact Name" name="emergencyName" rules={[{ required: true, message: 'Contact name is required' }]}>
                                    <Input placeholder="Emergency contact name" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={8}>
                                <Form.Item label="Relationship" name="emergencyRelationship" rules={[{ required: true, message: 'Relationship is required' }]}>
                                    <Input placeholder="e.g., Spouse, Parent" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={8}>
                                <Form.Item label="Phone Number" name="emergencyPhone" rules={[{ required: true, message: 'Phone number is required' }]}>
                                    <Input placeholder="+1 (555) 987-6543" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item style={{ marginTop: '24px' }}>
                            <Button onClick={() => navigate('/patients')} style={{ marginRight: '8px' }}>
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                {isEditMode ? 'Save Changes' : 'Add Patient'}
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            </Content>
        </Layout>
    );
};

export default AddPatient;
