import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Layout } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { authService } from '../services/api';

const { Content } = Layout;

const Register = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const handleRegister = async (values) => {
        if (values.password !== values.confirmPassword) {
            message.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const data = await authService.register({
                name: values.name,
                email: values.email,
                password: values.password,
            });

            if (data.accessToken) {
                localStorage.setItem('token', data.accessToken);
            }
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            message.success('Account created successfully!');
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 500);
        } catch (error) {
            message.error(error.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                <div style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
                    <Card style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏥</div>
                            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>MediCare</h1>
                            <p style={{ color: '#666' }}>Healthcare Platform</p>
                        </div>

                        <h2 style={{ marginBottom: '24px', textAlign: 'center', fontSize: '18px', fontWeight: '500' }}>Create Account</h2>

                        <Form form={form} layout="vertical" onFinish={handleRegister}>
                            <Form.Item
                                label="Full Name"
                                name="name"
                                rules={[{ required: true, message: 'Name is required' }]}
                            >
                                <Input placeholder="Dr. James Wilson" prefix={<UserOutlined />} />
                            </Form.Item>

                            <Form.Item
                                label="Email Address"
                                name="email"
                                rules={[
                                    { required: true, message: 'Email is required' },
                                    { type: 'email', message: 'Please enter a valid email' },
                                ]}
                            >
                                <Input placeholder="doctor@example.com" prefix={<MailOutlined />} />
                            </Form.Item>

                            <Form.Item
                                label="Password"
                                name="password"
                                rules={[
                                    { required: true, message: 'Password is required' },
                                    { min: 6, message: 'Password must be at least 6 characters' },
                                ]}
                            >
                                <Input.Password placeholder="••••••••" prefix={<LockOutlined />} />
                            </Form.Item>

                            <Form.Item
                                label="Confirm Password"
                                name="confirmPassword"
                                rules={[{ required: true, message: 'Please confirm your password' }]}
                            >
                                <Input.Password placeholder="••••••••" prefix={<LockOutlined />} />
                            </Form.Item>

                            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                                Create Account
                            </Button>
                        </Form>
                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <span style={{ color: '#666' }}>Already have an account? </span>
                            <Button type="link" onClick={() => navigate('/login')}>
                                Back to Login
                            </Button>
                        </div>
                    </Card>

                    <div style={{ marginTop: '24px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                         By creating an account, you agree to our
                         <button style={{ marginLeft: '4px', marginRight: '4px', background: 'none', border: 'none', color: '#1890ff', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => e.preventDefault()}>
                             Terms of Service
                         </button>
                         and
                         <button style={{ marginLeft: '4px', background: 'none', border: 'none', color: '#1890ff', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => e.preventDefault()}>
                             Privacy Policy
                         </button>
                     </div>
                </div>
            </Content>
        </Layout>
    );
};

export default Register;
