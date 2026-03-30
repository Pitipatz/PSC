import React, { useState, useEffect } from 'react';
import { cn } from "./utils";

interface NumericInputProps {
  value: number | string;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const NumericInput: React.FC<NumericInputProps> = ({ value, onChange, placeholder, className, required }) => {
  const [displayValue, setDisplayValue] = useState('');

  // ฟังก์ชันใส่คอมมา: 1000 -> 1,000
  const formatNumber = (val: string | number) => {
    if (!val && val !== 0) return '';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // ฟังก์ชันเอาคอมมาออก: 1,000 -> 1000
  const deformatNumber = (val: string) => {
    return val.replace(/,/g, '');
  };

  // อัปเดตตัวเลขแสดงผลเมื่อ value จากภายนอกเปลี่ยน
  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = deformatNumber(e.target.value);
    
    // อนุญาตเฉพาะตัวเลขเท่านั้น
    if (/^\d*$/.test(rawValue)) {
      const numValue = rawValue === '' ? 0 : parseInt(rawValue, 10);
      setDisplayValue(formatNumber(rawValue)); // อัปเดตหน้าจอทันที
      onChange(numValue); // ส่งค่าตัวเลขล้วนกลับไปที่ตัวแม่
    }
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn(
              "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base bg-input-background transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
              className,
            )}
      required={required}
    />
  );
};

export default NumericInput;