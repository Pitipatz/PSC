export interface TruckData {
  brand: string;
  vehicleType: string;
  horsepower: string;
  chassisNumber: string;
  engineNumber: string;
  year: string;
  salePrice: number;
  images: string[];
  hasTrailer: boolean; // ✅ เพิ่มฟิลด์นี้
  buddhistYear?: number; 
  christianYear?: number;
  centralPrice?: number;
}