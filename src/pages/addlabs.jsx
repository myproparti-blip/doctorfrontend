import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Card, Form, Input, Button, Select, DatePicker, Row, Col, message, Layout, Upload, Modal } from 'antd';
import { ArrowLeftOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { labService } from '../services/api';

const { Content } = Layout;

const AddLabs = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { labId: urlLabId } = useParams();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [uploadedPhotos, setUploadedPhotos] = useState([]);
    const [previewPhoto, setPreviewPhoto] = useState(null);
    const [previewModalVisible, setPreviewModalVisible] = useState(false);

    // Get labId from URL params for edit mode
    const labId = urlLabId;

    // Get data from location state as fallback
    const patientInfo = location.state?.patientData;
    const patientId = location.state?.patientId;
    const isEditMode = location.state?.isEdit || !!labId;
    const returnTo = location.state?.returnTo || 'patients';

    const testCategories = [
        'Hematology',
        'Biochemistry',
        'Lipid Profile',
        'Vitals',
        'Microbiology',
        'Immunology',
        'Serology',
        'Urinalysis',
    ];

    const statusOptions = ['pending', 'completed'];

    // Load lab data when in edit mode
    useEffect(() => {
        if (isEditMode) {
            setFormLoading(true);
            const fetchLabData = async () => {
                try {
                    // Get labId from URL params
                    if (!labId) {
                        message.error('Lab ID not found');
                        return;
                    }

                    // Fetch complete lab data using getLabById API
                    const response = await labService.getLabById(labId);
                    const fetchedLabData = response.data || response;

                    form.setFieldsValue({
                        testName: fetchedLabData.testName,
                        category: fetchedLabData.category,
                        doctor: fetchedLabData.doctor,
                        labName: fetchedLabData.labName,
                        date: fetchedLabData.date ? dayjs(fetchedLabData.date) : null,
                        result: fetchedLabData.result,
                        normalRange: fetchedLabData.normalRange,
                        units: fetchedLabData.units,
                        status: fetchedLabData.status || 'pending',
                        remarks: fetchedLabData.remarks,
                    });

                    // Load existing photos from Cloudinary if any
                    if (fetchedLabData.photos && Array.isArray(fetchedLabData.photos)) {
                        const existingPhotos = fetchedLabData.photos.map(photo => ({
                            filename: photo.filename,
                            url: photo.url, // Cloudinary URL
                            cloudinaryId: photo.cloudinaryId,
                            uploadedAt: photo.uploadedAt,
                            isExisting: true, // Mark as existing to differentiate from newly uploaded
                        }));
                        setUploadedPhotos(existingPhotos);
                    }
                } catch (error) {
                    console.error('Error loading lab data:', error);
                    message.error('Failed to load lab data');
                } finally {
                    setFormLoading(false);
                }
            };
            fetchLabData();
        }
    }, [isEditMode, labId, form]);

    // Handle photo upload with validation and compression
    const handlePhotoUpload = async (file) => {
        // Validate file size (max 5MB per image)
        const maxSizeMB = 5;
        const fileSizeMB = file.size / (1024 * 1024);
        
        if (fileSizeMB > maxSizeMB) {
            message.error(`Image "${file.name}" is ${fileSizeMB.toFixed(2)}MB. Maximum ${maxSizeMB}MB per image.`);
            return false;
        }

        // Validate total image count (max 10)
        if (uploadedPhotos.length >= 10) {
            message.error('Maximum 10 images allowed per lab test');
            return false;
        }

        // Compress image before converting to base64
        const img = new Image();
        img.onerror = () => {
            message.error('Failed to load image. Please try a different image.');
        };
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Resize if too large (max 1920x1080)
                const maxWidth = 1920;
                const maxHeight = 1080;
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to compressed base64 (quality 0.7 = 70%)
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                const base64Data = compressedDataUrl.split(',')[1];
                
                // Calculate compressed size in MB (base64 is roughly 4/3 of binary size)
                const compressedSizeMB = (base64Data.length * 0.75) / (1024 * 1024);
                if (compressedSizeMB > maxSizeMB) {
                    message.error(`Compressed image is still ${compressedSizeMB.toFixed(2)}MB. Try a smaller image.`);
                    return;
                }
                
                setUploadedPhotos(prev => [...prev, {
                    filename: file.name,
                    data: base64Data,
                    url: compressedDataUrl, // Store compressed data URL for preview
                }]);
            } catch (error) {
                message.error('Error processing image: ' + error.message);
            }
        };
        
        // Read the original file to get image dimensions
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        return false; // Prevent automatic upload
    };

    const removePhoto = (index) => {
        setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handlePhotoPreview = (photo) => {
        setPreviewPhoto({
            filename: photo.filename,
            url: photo.url, // Can be Cloudinary URL or data URL
        });
        setPreviewModalVisible(true);
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const labPayload = {
                patientId,
                testName: values.testName,
                category: values.category,
                doctor: values.doctor,
                labName: values.labName,
                date: values.date?.toISOString(),
                result: values.result,
                normalRange: values.normalRange,
                units: values.units,
                status: values.status || 'pending',
                remarks: values.remarks,
                photos: uploadedPhotos,
            };

            if (isEditMode) {
                if (!labId) {
                    message.error('Lab ID not found');
                    return;
                }
                await labService.updateLab(labId, labPayload);
                message.success('Lab test updated successfully');
            } else {
                await labService.createLab(labPayload);
                message.success('Lab test added successfully');
            }

            form.resetFields();
            setUploadedPhotos([]); // Reset photos

            // Navigate back after successful submission
            setTimeout(() => {
                if (returnTo === 'labs') {
                    navigate('/labs', { state: { patientId, patientData: patientInfo } });
                } else {
                    navigate('/patients');
                }
            }, 1500);
        } catch (error) {
            message.error(error.message || (isEditMode ? 'Failed to update lab test' : 'Failed to add lab test'));
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
                        onClick={() => {
                            if (returnTo === 'labs') {
                                navigate('/labs', { state: { patientId, patientData: patientInfo } });
                            } else {
                                navigate('/patients');
                            }
                        }} 
                        style={{ marginRight: '16px' }} 
                    />
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{isEditMode ? 'Edit Lab Test' : 'Add Lab Test'}</h1>
                </div>
            </Layout.Header>

            <Content style={{ padding: '24px' }}>
                <Card loading={formLoading}>
                    <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={formLoading}>
                        <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '500' }}>Test Information</h3>
                        <Row gutter={16}>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item
                                    label="Test Name"
                                    name="testName"
                                    rules={[{ required: true, message: 'Test name is required' }]}
                                >
                                    <Input placeholder="e.g., Blood Count" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item
                                    label="Category"
                                    name="category"
                                    rules={[{ required: true, message: 'Category is required' }]}
                                >
                                    <Select placeholder="Select category">
                                        {testCategories.map((cat) => (
                                            <Select.Option key={cat} value={cat}>
                                                {cat}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item
                                    label="Doctor Name"
                                    name="doctor"
                                    rules={[{ required: true, message: 'Doctor name is required' }]}
                                >
                                    <Input placeholder="e.g., Dr. Smith" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item
                                    label="Lab Name"
                                    name="labName"
                                    rules={[{ required: true, message: 'Lab name is required' }]}
                                >
                                    <Input placeholder="e.g., City Medical Lab" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <h3 style={{ marginTop: '24px', marginBottom: '16px', fontSize: '16px', fontWeight: '500' }}>Test Results</h3>
                        <Row gutter={16}>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item
                                    label="Date"
                                    name="date"
                                    rules={[{ required: true, message: 'Date is required' }]}
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
                                    label="Result"
                                    name="result"
                                    rules={[{ required: true, message: 'Result is required' }]}
                                >
                                    <Input placeholder="e.g., 5.2" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item
                                    label="Normal Range"
                                    name="normalRange"
                                    rules={[{ required: true, message: 'Normal range is required' }]}
                                >
                                    <Input placeholder="e.g., 4.5-5.5" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item
                                    label="Units"
                                    name="units"
                                    rules={[{ required: true, message: 'Units are required' }]}
                                >
                                    <Input placeholder="e.g., M/uL" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item
                                    label="Status"
                                    name="status"
                                    initialValue="pending"
                                >
                                    <Select placeholder="Select status">
                                        {statusOptions.map((stat) => (
                                            <Select.Option key={stat} value={stat}>
                                                {stat === 'pending' ? 'Pending' : 'Completed'}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={10}>
                                <Form.Item
                                    label="Remarks"
                                    name="remarks"
                                >
                                    <Input.TextArea
                                        placeholder="Additional notes or observations about the lab test results"
                                        rows={3}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24}>
                                <Form.Item
                                    label="Upload Lab Photos"
                                    name="photos"
                                >
                                    <Upload
                                        accept="image/*"
                                        beforeUpload={handlePhotoUpload}
                                        multiple
                                        maxCount={10}
                                        showUploadList={false}
                                    >
                                        <Button icon={<UploadOutlined />}>
                                            Upload
                                        </Button>
                                    </Upload>
                                </Form.Item>

                                {uploadedPhotos.length > 0 && (
                                    <div style={{ marginTop: '16px' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                            {uploadedPhotos.map((photo, index) => (
                                                <div
                                                    key={index}
                                                    style={{
                                                        position: 'relative',
                                                        borderRadius: '4px',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <img
                                                        src={photo.url}
                                                        alt={photo.filename}
                                                        style={{
                                                            width: '100px',
                                                            height: '100px',
                                                            objectFit: 'cover',
                                                            cursor: 'pointer',
                                                            border: '1px solid #d9d9d9',
                                                            borderRadius: '4px',
                                                        }}
                                                        onClick={() => handlePhotoPreview(photo)}
                                                    />
                                                    <Button
                                                        danger
                                                        size="small"
                                                        icon={<DeleteOutlined />}
                                                        onClick={() => removePhoto(index)}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '-8px',
                                                            right: '-8px',
                                                            borderRadius: '50%',
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Col>
                        </Row>

                        {/* Photo Preview Modal */}
                        <Modal
                            title={previewPhoto?.filename}
                            open={previewModalVisible}
                            footer={null}
                            onCancel={() => setPreviewModalVisible(false)}
                            width={800}
                        >
                            {previewPhoto && (
                                <img
                                    src={previewPhoto.url}
                                    alt={previewPhoto.filename}
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        borderRadius: '4px',
                                    }}
                                    loading="lazy"
                                />
                            )}
                        </Modal>

                        <Form.Item style={{ marginTop: '24px' }}>
                            <Button 
                                onClick={() => {
                                    if (returnTo === 'labs') {
                                        navigate('/labs', { state: { patientId, patientData: patientInfo } });
                                    } else {
                                        navigate('/patients');
                                    }
                                }} 
                                style={{ marginRight: '8px' }}
                            >
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                {isEditMode ? 'Save Changes' : 'Add Lab Test'}
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            </Content>
        </Layout>
    );
};

export default AddLabs;
