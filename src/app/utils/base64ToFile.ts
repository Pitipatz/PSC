export const base64ToFile = (base64String: string, fileName: string): File => {
  try {
    const arr = base64String.split(',');
    if (arr.length < 2) throw new Error("Invalid base64 string");

    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error("MIME type not found");
    
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], fileName, { type: mime });
  } catch (error) {
    console.error("Error converting base64 to file:", error);
    // fallback หรือ throw ต่อเพื่อให้หน้า CheckPricePage จัดการ
    throw error;
  }
};