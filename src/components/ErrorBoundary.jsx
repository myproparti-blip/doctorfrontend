import React from 'react';
import { Result, Button } from 'antd';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <Result
                    status="error"
                    title="Something went wrong"
                    subTitle="Please try refreshing the page or go back to the home page."
                    extra={
                        <Button type="primary" onClick={this.handleReset}>
                            Go Home
                        </Button>
                    }
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
