import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Generate PDF export for reports
 */
export const generatePDF = async (reportType, reportData, options) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 10;

  // Header
  pdf.setFontSize(20);
  pdf.text(`${reportType.toUpperCase()} Report`, 10, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 10, yPosition);
  yPosition += 10;

  pdf.line(10, yPosition, pageWidth - 10, yPosition);
  yPosition += 5;

  switch (reportType) {
    case 'dashboard':
      generateDashboardPDF(pdf, reportData, yPosition, options);
      break;
    case 'revenue':
      generateRevenuePDF(pdf, reportData, yPosition, options);
      break;
    case 'patient-growth':
      generatePatientGrowthPDF(pdf, reportData, yPosition, options);
      break;
    case 'employee':
      generateEmployeePDF(pdf, reportData, yPosition, options);
      break;
    case 'discharge':
      generateDischargePDF(pdf, reportData, yPosition, options);
      break;
    default:
      break;
  }

  pdf.save(`${reportType}-report-${new Date().getTime()}.pdf`);
};

/**
 * Generate Excel export for reports
 */
export const generateExcel = async (reportType, reportData, options) => {
  const workbook = XLSX.utils.book_new();

  switch (reportType) {
    case 'dashboard':
      generateDashboardExcel(workbook, reportData.dashboardReport);
      break;
    case 'revenue':
      generateRevenueExcel(workbook, reportData.revenueReport);
      break;
    case 'patient-growth':
      generatePatientGrowthExcel(workbook, reportData.patientReport);
      break;
    case 'employee':
      generateEmployeeExcel(workbook, reportData.employeeReport);
      break;
    case 'discharge':
      generateDischargeExcel(workbook, reportData.dischargeReport);
      break;
    default:
      break;
  }

  XLSX.writeFile(workbook, `${reportType}-report-${new Date().getTime()}.xlsx`);
};

/**
 * Generate CSV export for reports
 */
export const generateCSV = async (reportType, reportData, options) => {
  let csvContent = '';

  switch (reportType) {
    case 'dashboard':
      csvContent = generateDashboardCSV(reportData.dashboardReport);
      break;
    case 'revenue':
      csvContent = generateRevenueCSV(reportData.revenueReport);
      break;
    case 'patient-growth':
      csvContent = generatePatientGrowthCSV(reportData.patientReport);
      break;
    case 'employee':
      csvContent = generateEmployeeCSV(reportData.employeeReport);
      break;
    case 'discharge':
      csvContent = generateDischargeCSV(reportData.dischargeReport);
      break;
    default:
      return;
  }

  downloadCSV(csvContent, `${reportType}-report-${new Date().getTime()}.csv`);
};

// PDF Generators
const generateDashboardPDF = (pdf, reportData, startY, options) => {
  const data = reportData.dashboardReport?.data;
  if (!data) return;

  let yPosition = startY;
  const pageWidth = pdf.internal.pageSize.getWidth();

  pdf.setFontSize(14);
  pdf.text('Dashboard Summary', 10, yPosition);
  yPosition += 10;

  const dashboardTable = [
    ['Metric', 'Value'],
    ['Total Revenue', `₹${data.revenue?.totalRevenue || 0}`],
    ['Amount Paid', `₹${data.revenue?.amountPaid || 0}`],
    ['Total Patients', `${data.patients?.total || 0}`],
    ['Active Patients', `${data.patients?.active || 0}`],
    ['Active Employees', `${data.employees?.totalActive || 0}`],
    ['Doctors', `${data.employees?.doctors || 0}`],
    ['Nurses', `${data.employees?.nurses || 0}`],
    ['Pending Leaves', `${data.leaves?.pending || 0}`],
  ];

  pdf.autoTable({
    head: [dashboardTable[0]],
    body: dashboardTable.slice(1),
    startY: yPosition,
    margin: { left: 10, right: 10 },
  });
};

const generateRevenuePDF = (pdf, reportData, startY, options) => {
  const data = reportData.revenueReport?.data;
  if (!data || !data.monthlyData) return;

  let yPosition = startY;

  pdf.setFontSize(14);
  pdf.text('Monthly Revenue Report', 10, yPosition);
  yPosition += 10;

  const revenueTable = [
    ['Month', 'Total Revenue', 'Amount Paid', 'Invoice Count', 'Avg Value'],
    ...data.monthlyData.map(item => [
      item.monthName,
      `₹${item.totalRevenue}`,
      `₹${item.amountPaid}`,
      `${item.invoiceCount}`,
      `₹${item.averageInvoiceValue?.toFixed(2) || 0}`,
    ]),
  ];

  pdf.autoTable({
    head: [revenueTable[0]],
    body: revenueTable.slice(1),
    startY: yPosition,
    margin: { left: 10, right: 10 },
  });
};

const generatePatientGrowthPDF = (pdf, reportData, startY, options) => {
  const data = reportData.patientReport?.data;
  if (!data || !data.monthlyGrowth) return;

  let yPosition = startY;

  pdf.setFontSize(14);
  pdf.text('Patient Growth Report', 10, yPosition);
  yPosition += 10;

  const growthTable = [
    ['Month', 'New Patients'],
    ...data.monthlyGrowth.map(item => [item.monthName, `${item.newPatients}`]),
  ];

  pdf.autoTable({
    head: [growthTable[0]],
    body: growthTable.slice(1),
    startY: yPosition,
    margin: { left: 10, right: 10 },
  });
};

const generateEmployeePDF = (pdf, reportData, startY, options) => {
  const data = reportData.employeeReport?.data;
  if (!data) return;

  let yPosition = startY;

  pdf.setFontSize(14);
  pdf.text('Department Employee Report', 10, yPosition);
  yPosition += 10;

  if (data.byDepartment) {
    const deptTable = [
      ['Department', 'Total', 'Active', 'Inactive'],
      ...data.byDepartment.map(dept => [
        dept._id,
        `${dept.totalEmployees}`,
        `${dept.activeEmployees}`,
        `${dept.inactiveEmployees}`,
      ]),
    ];

    pdf.autoTable({
      head: [deptTable[0]],
      body: deptTable.slice(1),
      startY: yPosition,
      margin: { left: 10, right: 10 },
    });
  }
};

const generateDischargePDF = (pdf, reportData, startY, options) => {
  const data = reportData.dischargeReport?.data;
  if (!data) return;

  let yPosition = startY;

  pdf.setFontSize(14);
  pdf.text('Discharge Rate Report', 10, yPosition);
  yPosition += 10;

  const stats = data.statistics || {};
  const statsTable = [
    ['Metric', 'Value'],
    ['Total Patients', `${stats.totalPatients}`],
    ['Discharged Patients', `${stats.dischargedPatients}`],
    ['Discharge Rate', stats.dischargeRate],
    ['Avg Stay (days)', `${stats.averageStayDays?.toFixed(2) || 0}`],
  ];

  pdf.autoTable({
    head: [statsTable[0]],
    body: statsTable.slice(1),
    startY: yPosition,
    margin: { left: 10, right: 10 },
  });
};

// Excel Generators
const generateDashboardExcel = (workbook, reportData) => {
  const data = reportData?.data;
  if (!data) return;

  const sheetData = [
    ['Metric', 'Value'],
    ['Total Revenue', data.revenue?.totalRevenue || 0],
    ['Amount Paid', data.revenue?.amountPaid || 0],
    ['Total Patients', data.patients?.total || 0],
    ['Active Patients', data.patients?.active || 0],
    ['Active Employees', data.employees?.totalActive || 0],
    ['Doctors', data.employees?.doctors || 0],
    ['Nurses', data.employees?.nurses || 0],
    ['Pending Leaves', data.leaves?.pending || 0],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dashboard');
};

const generateRevenueExcel = (workbook, reportData) => {
  const data = reportData?.data;
  if (!data || !data.monthlyData) return;

  const sheetData = [
    ['Month', 'Total Revenue', 'Amount Paid', 'Invoice Count', 'Avg Value'],
    ...data.monthlyData.map(item => [
      item.monthName,
      item.totalRevenue,
      item.amountPaid,
      item.invoiceCount,
      item.averageInvoiceValue?.toFixed(2) || 0,
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Revenue');
};

const generatePatientGrowthExcel = (workbook, reportData) => {
  const data = reportData?.data;
  if (!data || !data.monthlyGrowth) return;

  const sheetData = [
    ['Month', 'New Patients'],
    ...data.monthlyGrowth.map(item => [item.monthName, item.newPatients]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Patient Growth');
};

const generateEmployeeExcel = (workbook, reportData) => {
  const data = reportData?.data;
  if (!data) return;

  if (data.byDepartment) {
    const sheetData = [
      ['Department', 'Total', 'Active', 'Inactive'],
      ...data.byDepartment.map(dept => [
        dept._id,
        dept.totalEmployees,
        dept.activeEmployees,
        dept.inactiveEmployees,
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
  }
};

const generateDischargeExcel = (workbook, reportData) => {
  const data = reportData?.data;
  if (!data) return;

  const stats = data.statistics || {};
  const sheetData = [
    ['Metric', 'Value'],
    ['Total Patients', stats.totalPatients],
    ['Discharged Patients', stats.dischargedPatients],
    ['Discharge Rate', stats.dischargeRate],
    ['Avg Stay (days)', stats.averageStayDays?.toFixed(2) || 0],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Discharge');
};

// CSV Generators
const generateDashboardCSV = (reportData) => {
  const data = reportData?.data;
  if (!data) return '';

  let csv = 'Metric,Value\n';
  csv += `Total Revenue,${data.revenue?.totalRevenue || 0}\n`;
  csv += `Amount Paid,${data.revenue?.amountPaid || 0}\n`;
  csv += `Total Patients,${data.patients?.total || 0}\n`;
  csv += `Active Patients,${data.patients?.active || 0}\n`;
  csv += `Active Employees,${data.employees?.totalActive || 0}\n`;
  csv += `Doctors,${data.employees?.doctors || 0}\n`;
  csv += `Nurses,${data.employees?.nurses || 0}\n`;
  csv += `Pending Leaves,${data.leaves?.pending || 0}\n`;

  return csv;
};

const generateRevenueCSV = (reportData) => {
  const data = reportData?.data;
  if (!data || !data.monthlyData) return '';

  let csv = 'Month,Total Revenue,Amount Paid,Invoice Count,Avg Value\n';
  data.monthlyData.forEach(item => {
    csv += `${item.monthName},${item.totalRevenue},${item.amountPaid},${item.invoiceCount},${item.averageInvoiceValue?.toFixed(2) || 0}\n`;
  });

  return csv;
};

const generatePatientGrowthCSV = (reportData) => {
  const data = reportData?.data;
  if (!data || !data.monthlyGrowth) return '';

  let csv = 'Month,New Patients\n';
  data.monthlyGrowth.forEach(item => {
    csv += `${item.monthName},${item.newPatients}\n`;
  });

  return csv;
};

const generateEmployeeCSV = (reportData) => {
  const data = reportData?.data;
  if (!data || !data.byDepartment) return '';

  let csv = 'Department,Total,Active,Inactive\n';
  data.byDepartment.forEach(dept => {
    csv += `${dept._id},${dept.totalEmployees},${dept.activeEmployees},${dept.inactiveEmployees}\n`;
  });

  return csv;
};

const generateDischargeCSV = (reportData) => {
  const data = reportData?.data;
  if (!data) return '';

  const stats = data.statistics || {};
  let csv = 'Metric,Value\n';
  csv += `Total Patients,${stats.totalPatients}\n`;
  csv += `Discharged Patients,${stats.dischargedPatients}\n`;
  csv += `Discharge Rate,${stats.dischargeRate}\n`;
  csv += `Avg Stay (days),${stats.averageStayDays?.toFixed(2) || 0}\n`;

  return csv;
};

// Helper function to download CSV
const downloadCSV = (csvContent, fileName) => {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
  element.setAttribute('download', fileName);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};
