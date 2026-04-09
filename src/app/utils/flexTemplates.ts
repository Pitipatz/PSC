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
  images: string[];
  registrationImageUrl?: string;
  // url: string;
}) => {
  const mainBubble = {
    type: "bubble",
    size: "mega",
    header: { // เพิ่ม Header สีน้ำเงินให้ดูเด่น
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
            { type: "separator", margin: "xxl" },
            {
                type: "box",
                layout: "horizontal",
                margin: "xxl",
                contents: [
                    {  type: "text",  text: "🚗 ยี่ห้อ:",   size: "sm",  color: "#999999",  flex: 0  },
                    {  type: "text",  text: data.brand,   size: "sm",  color: "#111111",  align: "end"  }
                ]
                },
                {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                    {  type: "text",  text: "📅 ปีรถ: ",  size: "sm",  color: "#999999",  flex: 0  },
                    {  type: "text",  text: data.year,   size: "sm",  color: "#111111",  align: "end"  }
                ]
                },
                {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                    {  type: "text",  text: "🔧 หมายเลขเครื่อง: ",  size: "sm",  color: "#999999",  flex: 0  },
                    {  type: "text",  text: data.engineNumber,  size: "sm",  color: "#111111",  align: "end"  }
                ]
                },
                {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                    {  type: "text",  text: "🔍 เลขตัวถัง: ",  size: "sm",  color: "#999999",  flex: 0  },
                    {  type: "text",  text: data.chassisNumber,  size: "sm",  color: "#111111",  align: "end"  }
                ]
                },
                {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                    {  type: "text",  text: "💰 ราคาขาย: ",  size: "sm",  color: "#999999",  flex: 0  },
                    {  type: "text",  text: data.salePrice.toLocaleString(),  size: "sm",  color: "#111111",  align: "end"  }
                ]
                },
                {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                    {  type: "text",  text: "👤 MKT: ",  size: "sm",  color: "#999999",  flex: 0  },
                    {  type: "text",  text: data.mkt,  size: "sm",  color: "#111111",  align: "end"  }
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
                style: "secondary", // ปุ่มสีเทาเข้ม
                color: "#f0f0f0", 
                action: {
                type: "uri",
                label: "🖨️ พิมพ์ใบสรุปผล",
                // ลิงก์ไปยังหน้าพิมพ์ โดยส่ง ID ไปด้วย
                uri: `https://lineflex-paisan.netlify.app/pricecheck/print/${data.id}`
                },
                height: "sm"
            }
            ]
        }
    };
    
    // --- 1. Bubble หน้าเล่มทะเบียน (ถ้ามี) ---
    const registrationBubble = data.registrationImageUrl ? [{
    type: "bubble",
    body: {
        type: "box",
        layout: "vertical",
        paddingAll: "0px",
        contents: [
        {
            type: "image",
            url: data.registrationImageUrl,
            size: "full",
            aspectMode: "cover",
            aspectRatio: "2:3",
            action: { type: "uri", label: "View Registration", uri: data.registrationImageUrl }
        },
        {
            type: "box",
            layout: "vertical",
            position: "absolute",
            backgroundColor: "#001489", // สีน้ำเงินเข้มตาม CI พี่
            offsetTop: "0px",
            paddingStart: "10px",
            paddingEnd: "10px",
            contents: [{ type: "text", text: "หน้าเล่มทะเบียน", color: "#ffffff", size: "xs", weight: "bold" }]
        }
        ]
    }
    }] : [];
    const imageBubbles = (data.images || []).map((url: string) => ({
        type: "bubble",
        body: {
            type: "box",
            layout: "vertical",
            paddingAll: "0px",
            contents: [
                {
                    type: "image",
                    url: url,
                    size: "full",
                    aspectMode: "cover",
                    aspectRatio: "2:3",
                    action: { type: "uri", label: "View Image", uri: url }
                }
            ]
        }
    }));
    return {
      type: "flex",
      altText: `📢 ขอยอดจัดรถ ${data.brand}`,
      contents: {
        type: "carousel",
        contents: [
          mainBubble,     // Bubble รายละเอียด
          ...registrationBubble,
          ...imageBubbles // Bubble รูปภาพ (ถ้า images เป็น [] ส่วนนี้จะหายไปเองโดยอัตโนมัติ)
        ]
      }
    };
};

// อนาคตเพิ่มหน้าอื่นๆ ก็เขียนต่อที่นี่
// export const createStockFlex = (data: any) => { ... }