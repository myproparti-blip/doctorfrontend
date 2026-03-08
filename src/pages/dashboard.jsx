import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Row, Col, Card, Button, Table, Input, Select, Pagination, Badge, Space, Tooltip, message, Modal } from 'antd';
import { XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../services/api';
import { formatDateFromString, formatDateISO } from '../utils/dateHelpers';
import { getIdFromRecord } from '../utils/idHelpers';
import './dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [patientsData, setPatientsData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ active: 0, discharged: 0, inactive: 0 });

  // Patients Activity Data with comprehensive metrics
  const activityData = [
    { month: 'Jan', totalPatients: 240, newAdmissions: 120, discharged: 45, icu: 28, surgery: 35, cardio: 42, orthopedic: 38, pediatric: 22, recovery: 180 },
    { month: 'Feb', totalPatients: 320, newAdmissions: 145, discharged: 32, icu: 35, surgery: 48, cardio: 52, orthopedic: 45, pediatric: 28, recovery: 235 },
    { month: 'Mar', totalPatients: 450, newAdmissions: 210, discharged: 55, icu: 42, surgery: 62, cardio: 68, orthopedic: 58, pediatric: 35, recovery: 310 },
    { month: 'Apr', totalPatients: 380, newAdmissions: 165, discharged: 48, icu: 38, surgery: 52, cardio: 58, orthopedic: 50, pediatric: 30, recovery: 265 },
    { month: 'May', totalPatients: 420, newAdmissions: 185, discharged: 50, icu: 40, surgery: 58, cardio: 62, orthopedic: 55, pediatric: 32, recovery: 290 },
    { month: 'Jun', totalPatients: 360, newAdmissions: 155, discharged: 42, icu: 32, surgery: 45, cardio: 50, orthopedic: 48, pediatric: 28, recovery: 250 },
    { month: 'Jul', totalPatients: 280, newAdmissions: 120, discharged: 38, icu: 25, surgery: 38, cardio: 42, orthopedic: 40, pediatric: 24, recovery: 195 },
    { month: 'Aug', totalPatients: 300, newAdmissions: 135, discharged: 40, icu: 28, surgery: 42, cardio: 48, orthopedic: 44, pediatric: 26, recovery: 210 },
    { month: 'Sep', totalPatients: 250, newAdmissions: 110, discharged: 35, icu: 22, surgery: 32, cardio: 38, orthopedic: 35, pediatric: 20, recovery: 175 },
    { month: 'Oct', totalPatients: 220, newAdmissions: 95, discharged: 28, icu: 20, surgery: 28, cardio: 32, orthopedic: 30, pediatric: 18, recovery: 155 },
    { month: 'Nov', totalPatients: 290, newAdmissions: 140, discharged: 38, icu: 26, surgery: 40, cardio: 45, orthopedic: 42, pediatric: 22, recovery: 205 },
    { month: 'Dec', totalPatients: 380, newAdmissions: 175, discharged: 52, icu: 35, surgery: 52, cardio: 58, orthopedic: 52, pediatric: 28, recovery: 270 }
  ];

  // Gender Distribution Data
  const genderData = [
    { name: 'Male', value: 45 },
    { name: 'Female', value: 35 },
    { name: 'Child', value: 20 }
  ];

  const genderColors = ['#0ea5e9', '#d946ef', '#10b981'];

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch patients data
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await patientService.getAllPatients(
          currentPage,
          itemsPerPage,
          debouncedSearch,
          statusFilter === 'all' ? 'all' : statusFilter
        );

        setPatientsData(response.data || []);
        setTotal(response.total || response.pagination?.total || 0);
      } catch (error) {
        message.error(error.message || 'Failed to load patients');
        console.error(error);
      }
    };

    fetchPatients();
  }, [currentPage, itemsPerPage, debouncedSearch, statusFilter, refetchTrigger]);

  // Fetch status counts
  useEffect(() => {
    const fetchStatusCounts = async () => {
      try {
        const activeRes = await patientService.getAllPatients(1, 1, '', 'active');
        const dischargedRes = await patientService.getAllPatients(1, 1, '', 'discharged');
        const inactiveRes = await patientService.getAllPatients(1, 1, '', 'inactive');
        
        setStatusCounts({
          active: activeRes.total || 0,
          discharged: dischargedRes.total || 0,
          inactive: inactiveRes.total || 0,
        });
      } catch (error) {
        console.error('Failed to fetch status counts:', error);
      }
    };

    fetchStatusCounts();
  }, [refetchTrigger]);

  const handlePageSizeChange = useCallback((page, pageSize) => {
    setItemsPerPage(pageSize);
    setCurrentPage(1);
  }, []);

  const handleDeletePatient = useCallback(async (patientId) => {
    Modal.confirm({
      title: 'Delete Patient',
      content: 'Are you sure you want to delete this patient?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await patientService.deletePatient(String(patientId).trim());
          message.success('Patient deleted successfully');
          setCurrentPage(1);
          setStatusFilter('all');
          setSearchTerm('');
          setRefetchTrigger(prev => prev + 1);
        } catch (error) {
          message.error(error.message || 'Failed to delete patient');
          console.error(error);
        }
      },
    });
  }, []);

  const columns = useMemo(() => [
    {
      title: 'SL No',
      key: 'slNo',
      width: 60,
      render: (_, __, index) => ((currentPage - 1) * itemsPerPage) + index + 1,
    },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 130 },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 160 },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 120 },
    { title: 'City', dataIndex: 'city', key: 'city', width: 110 },
    { title: 'State', dataIndex: 'state', key: 'state', width: 110 },
    { title: 'Condition', dataIndex: 'condition', key: 'condition', width: 120 },
    { 
      title: 'Risk', 
      dataIndex: 'risk', 
      key: 'risk', 
      width: 100, 
      render: (risk) => <Badge color={risk === 'High' ? 'red' : risk === 'Medium' ? 'orange' : 'green'} text={risk} /> 
    },
    { 
      title: 'Join Date', 
      dataIndex: 'joinDate', 
      key: 'joinDate',
      render: (date) => formatDateFromString(date),
    },
    { 
      title: 'Relieved Date', 
      dataIndex: 'relievedDate', 
      key: 'relievedDate',
      render: (date) => formatDateFromString(date),
    },
    { 
      title: 'Last Checkup', 
      dataIndex: 'lastCheckup', 
      key: 'lastCheckup',
      render: (date) => formatDateISO(date),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'red';
        let text = 'Inactive';
        if (status === 'active') {
          color = 'green';
          text = 'Active';
        } else if (status === 'discharged') {
          color = 'blue';
          text = 'Discharged';
        }
        return <Badge color={color} text={text} />;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const patientId = getIdFromRecord(record);

        const handleEdit = () => {
          if (!patientId) {
            message.error('Patient ID not found');
            return;
          }
          navigate(`/edit-patient/${patientId}`, { state: { patient: record } });
        };

        const handleDelete = () => {
          if (!patientId) {
            message.error('Patient ID not found');
            return;
          }
          handleDeletePatient(patientId);
        };

        const handleToggleStatus = async (currentStatus) => {
          if (!patientId) {
            message.error('Patient ID not found');
            return;
          }

          let newStatus = 'active';
          let statusLabel = 'activate';
          
          if (currentStatus === 'active') {
            newStatus = 'inactive';
            statusLabel = 'deactivate';
          } else if (currentStatus === 'inactive') {
            newStatus = 'discharged';
            statusLabel = 'discharge';
          } else if (currentStatus === 'discharged') {
            newStatus = 'active';
            statusLabel = 'reactivate';
          }
          
          Modal.confirm({
            title: `${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)} Patient`,
            content: `Are you sure you want to ${statusLabel} this patient?`,
            okText: 'Yes',
            okType: statusLabel === 'deactivate' ? 'danger' : 'primary',
            cancelText: 'Cancel',
            onOk: async () => {
              try {
                await patientService.updatePatient(String(patientId).trim(), { status: newStatus });
                message.success(`Patient ${statusLabel}d successfully`);
                setRefetchTrigger(prev => prev + 1);
              } catch (error) {
                message.error(error.message || `Failed to ${statusLabel} patient`);
              }
            },
          });
        };

        return (
          <Space>
            <Tooltip title={record.status === 'active' ? 'Deactivate' : record.status === 'inactive' ? 'Discharge' : 'Reactivate'}>
              <Button
                type="text"
                icon={record.status === 'active' ? '✓' : record.status === 'inactive' ? '✕' : '↻'}
                size="small"
                style={{
                  color: record.status === 'active' ? 'green' : record.status === 'inactive' ? 'red' : 'blue',
                }}
                onClick={() => handleToggleStatus(record.status)}
              />
            </Tooltip>
            <Tooltip title="View Labs">
              <Button
                type="text"
                icon={<FileTextOutlined />}
                size="small"
                onClick={() => navigate('/labs', { state: { patientId, patientData: record } })}
              />
            </Tooltip>
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              title="Edit"
              onClick={handleEdit}
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              title="Delete"
              onClick={handleDelete}
            />
          </Space>
        );
      },
    },
  ], [currentPage, itemsPerPage, handleDeletePatient, navigate]);

  return (
    <div className="dashboard-container">
      <Row gutter={[16, 16]}>
        {/* Combined Charts Card */}
        <Col xs={24}>
          <div className="analytics-card">
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '48px', alignItems: 'flex-start' }}>
              {/* Left: Patients Activity Chart */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                 <span style={{ fontSize: '16px', fontWeight: '600', color: '#333333' }}>Patients Activity</span>
                  <span className="chart-subtitle">This Year</span>
                </div>
                <ResponsiveContainer width="100%" height={360}>
                   <AreaChart data={activityData} margin={{ top: 15, right: 30, left: -15, bottom: 10 }}>
                     <defs>
                       <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="colorDischarged" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid 
                       strokeDasharray="6 3" 
                       stroke="#e5e7eb" 
                       vertical={false}
                       opacity={0.7}
                     />
                     <XAxis 
                       dataKey="month" 
                       stroke="none"
                       style={{ fontSize: 12 }}
                       tick={{ fill: '#6b7280', fontWeight: 500 }}
                       axisLine={false}
                     />
                     <YAxis 
                       stroke="none"
                       style={{ fontSize: 12 }}
                       tick={{ fill: '#6b7280', fontWeight: 500 }}
                       axisLine={false}
                       grid={{ horizontal: true }}
                     />
                     <ChartTooltip 
                       contentStyle={{ 
                         backgroundColor: 'white', 
                         border: '1px solid #e5e7eb',
                         borderRadius: '10px',
                         boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
                         padding: '12px 16px'
                       }}
                       labelStyle={{ color: '#1f2937', fontWeight: 600 }}
                       formatter={(value) => [`${value}`, '']}
                     />
                     <Legend 
                       wrapperStyle={{ paddingTop: '20px', display: 'none' }}
                       iconType="line"
                     />
                     <Area
                       type="monotone"
                       dataKey="patients"
                       stroke="#0ea5e9"
                       strokeWidth={3}
                       fillOpacity={1}
                       fill="url(#colorPatients)"
                       dot={{ fill: '#0ea5e9', r: 4, strokeWidth: 2, stroke: 'white' }}
                       activeDot={{ r: 6, fill: '#0ea5e9' }}
                       isAnimationActive={true}
                       name="Total Patients"
                     />
                     <Area
                       type="monotone"
                       dataKey="newPatients"
                       stroke="#10b981"
                       strokeWidth={2.5}
                       fillOpacity={1}
                       fill="url(#colorNew)"
                       dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                       isAnimationActive={true}
                       name="New Patients"
                     />
                     <Area
                       type="monotone"
                       dataKey="discharged"
                       stroke="#f59e0b"
                       strokeWidth={2.5}
                       fillOpacity={1}
                       fill="url(#colorDischarged)"
                       dot={{ fill: '#f59e0b', r: 3, strokeWidth: 0 }}
                       isAnimationActive={true}
                       name="Discharged"
                     />
                   </AreaChart>
                 </ResponsiveContainer>
                 <div style={{ display: 'flex', gap: '32px', marginTop: '20px', justifyContent: 'center' }}>
                   <div style={{ fontSize: '12px', color: '#6b7280' }}>
                     <span style={{ fontWeight: '500' }}>Active:</span> {statusCounts.active}
                   </div>
                   <div style={{ fontSize: '12px', color: '#6b7280' }}>
                     <span style={{ fontWeight: '500' }}>Discharged:</span> {statusCounts.discharged}
                   </div>
                   <div style={{ fontSize: '12px', color: '#6b7280' }}>
                     <span style={{ fontWeight: '500' }}>Inactive:</span> {statusCounts.inactive}
                   </div>
                 </div>
                 </div>

                 {/* Right: Gender Distribution Chart */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                 <span style={{ fontSize: '16px', fontWeight: '600', color: '#333333' }}>Patients By Gender</span>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="48%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      isAnimationActive={true}
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={genderColors[index]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="gender-stats-horizontal">
                  {genderData.map((item, index) => (
                    <div key={index} className="gender-stat-badge">
                      <div className="gender-stat-dot" style={{ backgroundColor: genderColors[index] }} />
                      <div className="gender-stat-badge-info">
                        <div className="gender-stat-percentage">{item.value}%</div>
                        <div className="gender-stat-name">{item.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
         {/* Patients Table Card */}
         <Col xs={24}>
           <Card
             style={{ borderRadius: '12px' }}
             title={
               <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                 <span style={{ fontSize: '16px', fontWeight: '600', color: '#333333' }}>Recent Patients</span>
                 <Input 
                   placeholder="Search patients..." 
                   value={searchTerm} 
                   onChange={(e) => setSearchTerm(e.target.value)} 
                   size="small" 
                   style={{ width: '200px' }} 
                 />
                 <Select
                   placeholder="Filter by status"
                   value={statusFilter}
                   onChange={setStatusFilter}
                   style={{ width: '150px', borderRadius: '6px' }}
                   options={[
                      { label: 'All', value: 'all' },
                     { label: 'Active', value: 'active' },
                     { label: 'Inactive', value: 'inactive' },
                     { label: 'Discharged', value: 'discharged' },
                   ]}
                 />
               </div>
             }
             extra={
               <Button
                 type="primary"
                 icon={<PlusOutlined />}
                 onClick={() => navigate('/add-patient')}
                 style={{
                   borderRadius: '6px',
                   fontWeight: '500',
                   height: '32px',
                   paddingInline: '16px',
                 }}
               >
                 Add Patient
               </Button>
             }
           >
             <Table
               columns={columns}
               dataSource={patientsData}
               rowKey="_id"
               pagination={false}
               style={{ marginBottom: '16px' }}
             />
             <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
               <Pagination
                 current={currentPage}
                 pageSize={itemsPerPage}
                 total={total}
                 onChange={(page) => setCurrentPage(page)}
                 onShowSizeChange={handlePageSizeChange}
                 pageSizeOptions={['10', '20', '50', '100']}
                 showSizeChanger
                 showQuickJumper={false}
                 disabled={Math.ceil(total / itemsPerPage) <= 1}
               />
             </div>
           </Card>
         </Col>
       </Row>
    </div>
  );
};

export default Dashboard;
