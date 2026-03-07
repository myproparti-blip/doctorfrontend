import React from 'react';
import { Button, Space, Row, Col } from 'antd';
import { ChevronLeftOutlined, ChevronRightOutlined } from '@ant-design/icons';

function Pagination({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);

            if (currentPage > 3) {
                pages.push('...');
            }

            const startPage = Math.max(2, currentPage - 1);
            const endPage = Math.min(totalPages - 1, currentPage + 1);

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            pages.push(totalPages);
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
            <Row justify="space-between" align="middle">
                <Col>
                    <span style={{ fontSize: '14px', color: '#666' }}>
                        Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{totalItems}</strong> items
                    </span>
                </Col>
                <Col>
                    <Space>
                        <Button
                            icon={<ChevronLeftOutlined />}
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        />
                        {pageNumbers.map((page, idx) => (
                            <div key={idx}>
                                {page === '...' ? (
                                    <span style={{ padding: '8px 12px' }}>...</span>
                                ) : (
                                    <Button
                                        type={currentPage === page ? 'primary' : 'default'}
                                        onClick={() => onPageChange(page)}
                                    >
                                        {page}
                                    </Button>
                                )}
                            </div>
                        ))}
                        <Button
                            icon={<ChevronRightOutlined />}
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        />
                    </Space>
                </Col>
            </Row>
        </div>
    );
}

export default Pagination;
