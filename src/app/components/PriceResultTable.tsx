import { useState, useEffect } from 'react'; // 1. เพิ่ม Hooks
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import type { TruckData } from '../App';
import { calculateCentralPrice, calculateLoanAmounts, type CalculationResult } from '../utils/priceCalculator';

interface PriceResultTableProps {
  data: TruckData;
}

export function PriceResultTable({ data }: PriceResultTableProps) {
  // 2. สร้าง State สำหรับเก็บผลลัพธ์และการโหลด
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(true);

  const inputYear = parseInt(data.year);
  const buddhistYearValue = inputYear > 2500 ? inputYear : inputYear + 543;
  const christianYearValue = inputYear > 2500 ? inputYear - 543 : inputYear;
  // แปลงราคาขายจาก String เป็น Number
  const salePrice = data.salePrice || 0;
  // สมมติผลลัพธ์จาก calculateCentralPrice คือ result

  // 3. ใช้ useEffect เรียกคำนวณตอน Component โหลด
  useEffect(() => {
    async function runCalculation() {
      setLoading(true);
      const res = await calculateCentralPrice(data.chassisNumber, buddhistYearValue);
      setResult(res);
      setLoading(false);
    }
    runCalculation();
  }, [data.chassisNumber, buddhistYearValue]);

  // 4. แสดงสถานะกำลังโหลด
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001489]"></div>
        <p className="text-gray-500 animate-pulse">กำลังดึงข้อมูลราคากลางจากระบบ...</p>
      </div>
    );
  }

  // 5. ถ้าหาไม่เจอ แสดง Error
  if (!result || !result.found) {
    return (
      <Card className="shadow-xl border-0 rounded-2xl overflow-hidden border-2 border-red-200">
        <CardHeader className="bg-red-500 text-white py-6">
          <CardTitle className="text-2xl flex items-center gap-3 text-white">
            ไม่พบข้อมูลรุ่นรถ
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 pb-8 px-6">
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
            <h3 className="text-lg font-bold text-red-900 mb-2">ข้อความจากระบบ</h3>
            <p className="text-red-800">{result?.errorMessage || "ไม่พบข้อมูลที่ตรงกับเงื่อนไข"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 6. ถ้าเจอข้อมูล เตรียมตัวแปรคำนวณ
  const centralPrice = result.centralPrice || 0;
  const loanAmounts = calculateLoanAmounts(centralPrice, salePrice, data.hasTrailer);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-6">
      {/* Vehicle Details Card */}
      <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#CB333B] text-white py-6">
          <CardTitle className="text-2xl flex items-center gap-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ข้อมูลรถบรรทุก
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 pb-8 px-6">
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div className="bg-gray-50 p-4 rounded-lg">
              <span className="text-gray-500 text-xs uppercase tracking-wide">ยี่ห้อ</span>
              <p className="font-bold text-[#001489] text-lg mt-1">{data.brand}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <span className="text-gray-500 text-xs uppercase tracking-wide">ลักษณะรถ</span>
              <p className="font-bold text-[#001489] text-lg mt-1">{data.vehicleType}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
              <span className="text-green-600 text-xs uppercase tracking-wide font-semibold">รุ่นรถที่พบ</span>
              <p className="font-bold text-green-700 text-lg mt-1">{result.modelName}</p>
            </div>
            {data.horsepower && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-gray-500 text-xs uppercase tracking-wide">แรงม้า</span>
                <p className="font-bold text-[#001489] text-lg mt-1">{data.horsepower}</p>
              </div>
            )}
            {data.chassisNumber && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-gray-500 text-xs uppercase tracking-wide">เลขแชซซี</span>
                <p className="font-bold text-[#001489] text-lg mt-1">{data.chassisNumber}</p>
              </div>
            )}
            {data.engineNumber && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-gray-500 text-xs uppercase tracking-wide">เลขเครื่อง</span>
                <p className="font-bold text-[#001489] text-lg mt-1">{data.engineNumber}</p>
              </div>
            )}
            <div className="bg-gray-50 p-4 rounded-lg">
              <span className="text-gray-500 text-xs uppercase tracking-wide">ปีรถ</span>
              <p className="font-bold text-[#001489] text-lg mt-1">{data.year} (พ.ศ.)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Table Card */}
      <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#001489] text-white py-6">
          <CardTitle className="text-2xl flex items-center gap-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            ตารางราคากลางและวงเงิน
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 pb-8 px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200">
                  <TableHead className="font-bold text-gray-700 text-base">รายการ</TableHead>
                  <TableHead className="font-bold text-gray-700 text-base text-right">จำนวนเงิน (บาท)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-blue-50/50 hover:bg-blue-50">
                  <TableCell className="font-semibold text-gray-700">ปีรถ พ.ศ.</TableCell>
                  <TableCell className="text-right font-semibold text-gray-800">
                    {buddhistYearValue} {/* ✅ ใช้ตัวแปรที่เราคำนวณไว้ข้างบน */}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-blue-50/50 hover:bg-blue-50">
                  <TableCell className="font-semibold text-gray-700">ปีรถ ค.ศ.</TableCell>
                  <TableCell className="text-right font-semibold text-gray-800">
                    {christianYearValue}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100">
                  <TableCell className="font-bold text-[#001489] text-lg py-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ราคากลาง
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-[#001489] text-lg py-4">
                    {formatCurrency(centralPrice)}
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-red-50/50 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-[#CB333B] rounded"></div>
                      วงเงินให้เช่าซื้อ (70%)
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-[#CB333B] font-bold text-lg py-4">
                    {formatCurrency(loanAmounts.leasePurchase)}
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-red-50/50 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-[#CB333B] rounded"></div>
                      วงเงินจำนำ (50%)
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-[#CB333B] font-bold text-lg py-4">
                    {formatCurrency(loanAmounts.pawnAmount)}
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-red-50/50 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-[#CB333B] rounded"></div>
                      วงเงิน Extra (90%)
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-[#CB333B] font-bold text-lg py-4">
                    {formatCurrency(loanAmounts.extraAmount)}
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-red-50/50 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-[#CB333B] rounded"></div>
                      วงเงิน Fast Track (30%)
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-[#CB333B] font-bold text-lg py-4">
                    {formatCurrency(loanAmounts.fastTrackAmount)}
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-red-50/50 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-[#CB333B] rounded"></div>
                      วงเงินขั้นต่ำ (30%)
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-[#CB333B] font-bold text-lg py-4">
                    {formatCurrency(loanAmounts.minimumAmount)}
                  </TableCell>
                </TableRow>
                {loanAmounts.trailerAmount > 0 && (
                  <div>
                    <TableRow className="bg-amber-50/30 hover:bg-amber-50">
                      <TableCell className="py-4 font-semibold text-amber-900">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-6 bg-amber-500 rounded"></div>
                          วงเงินหางพ่วง (เพิ่มเติม)
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-amber-700 font-bold text-lg py-4">
                        {formatCurrency(loanAmounts.trailerAmount)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-blue-100/50">
                      <TableCell className="py-4 font-bold text-blue-900">ยอดจัดรวมสูงสุด (หัว + หาง)</TableCell>
                      <TableCell className="text-right text-blue-900 font-extrabold text-xl py-4">
                        {formatCurrency(loanAmounts.leasePurchase + loanAmounts.trailerAmount)}
                      </TableCell>
                    </TableRow>
                  </div>
                )}
                {/* บรรทัดยอดรวม (แนะนำให้เพิ่ม) */}
                
              </TableBody>
            </Table>
          </div>

          {/* Summary Box */}
          <div className="mt-8 p-6 bg-gradient-to-br from-[#001489] to-[#001a70] text-white rounded-2xl shadow-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm opacity-80 mb-1">ราคาขาย</p>
                <p className="text-3xl font-bold">{formatCurrency(salePrice)}</p>
                <p className="text-xs opacity-70 mt-1">บาท</p>
              </div>
              <div className="h-16 w-px bg-white/30"></div>
              <div className="text-right">
                <p className="text-sm opacity-80 mb-1">ราคากลาง</p>
                <p className="text-3xl font-bold text-yellow-300">{formatCurrency(centralPrice)}</p>
                <p className="text-xs opacity-70 mt-1">บาท</p>
              </div>
            </div>
          </div>

          {/* 🚩 แสดง Note เมื่อราคาขายต่ำผิดปกติ */}
          {loanAmounts.isPriceTooLow && (
            <div className="mt-6 p-5 bg-amber-50 border-l-4 border-amber-400 rounded-lg shadow-sm">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-bold text-amber-900 mb-1">หมายเหตุ (รถราคาต่ำกว่าราคากลาง)</p>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    ในกรณีที่ราคาขายต่ำกว่าราคากลาง (รถตามสภาพ) ลูกค้าต้องวางเงินดาวน์อย่างน้อย 10% 
                    เป็นเงินประมาณ <strong>{formatCurrency(loanAmounts.downPaymentNeeded)} บาท</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Note */}
          {/* <div className="mt-6 p-5 bg-amber-50 border-l-4 border-amber-400 rounded-lg shadow-sm">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                 <p className="font-bold text-amber-900 mb-1">หมายเหตุ</p>
                 <p className="text-sm text-amber-800 leading-relaxed">
                   ราคากลางคำนวณจากสูตร: ค่าสัมประสิทธิ์การลด × ln(อายุรถ) + ราคาตั้งต้น
                   <br />
                   ข้อมูลปัจจุบันเป็น Mock Data กรุณาเชื่อมต่อ Google Sheets เพื่อใช้ข้อมูลจริง
            </p>
              </div>
            </div>
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
}