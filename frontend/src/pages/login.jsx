import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Layout, Checkbox } from 'antd';
import { authService } from '../services/api';

const { Content } = Layout;

const Login = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const handleLogin = async (values) => {
        setLoading(true);
        try {
            const data = await authService.login(values.email, values.password);

            if (data.accessToken) {
                localStorage.setItem('token', data.accessToken);
            }
            if (data.refreshToken) {
                localStorage.setItem('refreshToken', data.refreshToken);
            }
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            message.success('Login successful!');
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 500);
        } catch (error) {
            message.error(error.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
                <div style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
                    <Card style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏥</div>
                            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#333333' }}>MediCare</h1>
                            <p style={{ color: '#999999' }}>Healthcare Platform</p>
                        </div>

                        <h2 style={{ marginBottom: '24px', textAlign: 'center', fontSize: '18px', fontWeight: '500', color: '#333333' }}>Welcome Back</h2>

                        <Form form={form} layout="vertical" onFinish={handleLogin}>
                            <Form.Item
                                label="Email Address"
                                name="email"
                                rules={[
                                    { required: true, message: 'Email is required' },
                                    { type: 'email', message: 'Please enter a valid email' },
                                ]}
                            >
                                <Input placeholder="doctor@example.com" />
                            </Form.Item>

                            <Form.Item
                                label="Password"
                                name="password"
                                rules={[{ required: true, message: 'Password is required' }]}
                            >
                                <Input type="password" placeholder="••••••••" />
                            </Form.Item>

                            <Form.Item>
                                <Checkbox>Remember me</Checkbox>
                            </Form.Item>

                            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                                Sign In
                            </Button>
                        </Form>
                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <span style={{ color: '#999999' }}>Don't have an account? </span>
                            <Button type="link" onClick={() => navigate('/register')}>
                                Create Account
                            </Button>
                        </div>
                    </Card>

                    <div style={{ marginTop: '24px', textAlign: 'center', color: '#999999', fontSize: '12px' }}>
                         By signing in, you agree to our
                         <button style={{ marginLeft: '4px', marginRight: '4px', background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => e.preventDefault()}>
                             Terms of Service
                         </button>
                         and
                         <button style={{ marginLeft: '4px', background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => e.preventDefault()}>
                             Privacy Policy
                         </button>
                     </div>
                </div>
            </Content>
        </Layout>
    );
};

export default Login;
