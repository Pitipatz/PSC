export const createPriceCheckFlex = (data: {
  id: string;
  mkt: string;
  brand: string;
  vehicleType: string;
  horsepower: string;
  chassisNumber: string;
  engineNumber: string;
  year: string;
  salePrice: number;
  hasTrailer: boolean;
  trailerAmount?: number;       // ✅ เพิ่ม
  totalWithTrailer?: number;
}) => {
  // --- ข้อความที่ 1: ข้อมูลสรุป (Main Bubble) ---
  const mainMessage = {
    type: "flex",
    altText: `📢 ขอยอดจัดรถ ${data.brand}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#001489",
        contents: [
          { type: "text", text: "สรุปข้อมูลการประเมินราคา", color: "#ffffff", weight: "bold", size: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "📢 รบกวนขอยอดจัด", weight: "bold", color: "#1DB446", size: "md" },
          { type: "separator", margin: "md" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "🚗 ยี่ห้อ:", size: "sm", color: "#999999", flex: 2 },
                  { type: "text", text: data.brand, size: "sm", color: "#111111", align: "end", flex: 4, weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "📅 ปีรถ:", size: "sm", color: "#999999", flex: 2 },
                  { type: "text", text: data.year, size: "sm", color: "#111111", align: "end", flex: 4 }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "🔍 เลขตัวถัง:", size: "sm", color: "#999999", flex: 2 },
                  { type: "text", text: data.chassisNumber, size: "sm", color: "#111111", align: "end", flex: 4 }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "🔧 เลขเครื่อง:", size: "sm", color: "#999999", flex: 2 },
                  { type: "text", text: data.engineNumber, size: "sm", color: "#111111", align: "end", flex: 4 }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "💰 ราคาขาย:", size: "sm", color: "#999999", flex: 2 },
                  { type: "text", text: `${data.salePrice.toLocaleString()}`, size: "sm", color: "#CB333B", align: "end", flex: 4, weight: "bold" }
                ]
              },
              ...(data.hasTrailer && data.trailerAmount && data.totalWithTrailer ? [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "🖊️ ขอราคา:", size: "sm", color: "#999999", flex: 2 },
                    { type: "text", text: "หัว+หาง", size: "sm", color: "#111111", align: "end", flex: 4 }
                  ]
                }
              ] : []),
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "👤 MKT:", size: "sm", color: "#999999", flex: 2 },
                  { type: "text", text: data.mkt, size: "sm", color: "#111111", align: "end", flex: 4 }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#1E90FF",
            action: {
              type: "uri",
              label: "📝 Update รายการ",
              uri: `https://lineflex-paisan.netlify.app/pricecheck/edit/${data.id}`
            },
            height: "sm"
          },
          {
            type: "button",
            style: "secondary",
            color: "#f0f0f0",
            action: {
              type: "uri",
              label: "🖨️ พิมพ์ใบสรุปผล",
              uri: `https://lineflex-paisan.netlify.app/pricecheck/print/${data.id}`
            },
            height: "sm"
          }
        ]
      }
    }
  };

  // คืนค่าเป็น Array เพื่อให้ส่งไปพร้อมกัน 2 ข้อความ
  return [mainMessage];
};

export const createPriceCheckImageOnlyFlex = (data: {
  images: string[];
  registrationImageUrl?: string;
}) => {
  // --- ข้อความที่ 2: รูปภาพ (Carousel รวมหน้าเล่ม + รูปรถ) ---
  // รวมภาพหน้าเล่มไว้ใน Array รูปภาพตัวแรก
  const allImageUrls = [
    ...(data.registrationImageUrl ? [data.registrationImageUrl] : []),
    ...(data.images || [])
  ].slice(0, 10);

  // 2. ถ้าไม่มีรูปเลย ให้ส่ง Array ว่างกลับไป (ไม่ต้องส่งข้อความ)
  if (allImageUrls.length === 0) return [];

  // 3. สร้างรายการ Bubble สำหรับ Carousel
  const bubbles = allImageUrls.map((url, index) => {
    // เตรียมป้ายกำกับ "หน้าเล่มทะเบียน" แยกไว้ก่อน
    const hasLabel = data.registrationImageUrl && index === 0;

    // สร้างเนื้อหาข้างใน Bubble
    const bubbleContents: any[] = [
      {
        type: "image",
        url: url,
        size: "full",
        aspectMode: "cover",
        aspectRatio: "3:4",
        action: { type: "uri", label: "View Image", uri: url }
      }
    ];

    // ถ้าเป็นรูปแรก และมี registration

    if (hasLabel) {
      bubbleContents.push({
        type: "box",
        layout: "vertical",
        position: "absolute",
        backgroundColor: "#001489CC",
        offsetBottom: "0px",
        offsetStart: "0px",
        offsetEnd: "0px",
        paddingAll: "2px",
        contents: [{ 
          type: "text", 
          text: "หน้าเล่มทะเบียน", 
          color: "#ffffff", 
          size: "xxs", 
          align: "center",
          weight: "bold" 
        }]
      });
    }

    return {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "0px",
        contents: bubbleContents // ✅ ใช้ตัวแปรที่เราเตรียมไว้
      }
    };
  });
  

  /*
  const imageMessages = allImageUrls.map(url => ({
    type: "image",
    originalContentUrl: url,
    previewImageUrl: url
  }));
  */

  // 4. ประกอบเป็น Flex Message
  const imageMessage = {
    type: "flex",
    altText: `🖼️ รูปภาพประกอบ (${allImageUrls.length} รูป)`,
    contents: {
      type: "carousel",
      contents: bubbles // ✅ ใส่ bubbles ที่เรา map เสร็จแล้ว
    }
  };
  

  return [imageMessage];
};

// อนาคตเพิ่มหน้าอื่นๆ ก็เขียนต่อที่นี่
// export const createStockFlex = (data: any) => { ... }