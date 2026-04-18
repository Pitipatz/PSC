// ฟังก์ชันหาช่วง SLA ตามวันที่จัดการจริง
export const calculateSLACategory = (days: number): string => {
  if (days <= 1) return 'ไม่เกิน 1 วัน';
  if (days <= 7) return '1 - 7 วัน';
  if (days <= 15) return '8 - 15 วัน';
  if (days <= 30) return '16 - 30 วัน';
  if (days <= 60) return '31 - 60 วัน';
  if (days <= 90) return '61 - 90 วัน';
  return 'เกิน 90 วัน';
};

// ฟังก์ชันระบุเดือนที่ต้องรายงาน (เช่น รับเรื่อง 30 เม.ย. ก็ต้องลงเดือน 2026-04)
export const formatReportMonth = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};