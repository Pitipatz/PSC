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
  // url: string;
}) => {
  const mainBubble = {
        type: "bubble",
        size: "mega",
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
            contents: [
                {
                    type: "button",
                    style: "primary",
                    color: "#1E90FF",
                    action: {
                    type: "uri",
                    label: "📝 Update รายการ",
                    // ✅ ส่ง id ไปกับ URL เพื่อให้หน้าเว็บดึงข้อมูลถูกตัว
                    uri: `https://lineflex-paisan.netlify.app/pricecheck/edit/${data.id}`
                    },
                    height: "sm"
                }
            ]
        }
    };
    const imageBubbles = (data.images || []).map((url: string) => ({
        "type": "bubble",
        "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
            {
            "type": "image",
            "url": url, // URL จาก Supabase Storage
            "size": "full",
            "aspectMode": "cover",
            "aspectRatio": "2:3",
            "gravity": "top",
            "action": {
                "type": "uri",
                "label": "View Image",
                "uri": url // เมื่อกดที่รูป จะเปิด URL ของรูปนี้ขึ้นมา
                }
            }
        ],
        "paddingAll": "0px"
        }
    }));
    return {
      type: "flex",
      altText: `📢 ขอยอดจัดรถ ${data.brand}`,
      contents: {
        type: "carousel",
        contents: [
          mainBubble,     // Bubble รายละเอียด
          ...imageBubbles // Bubble รูปภาพ (ถ้า images เป็น [] ส่วนนี้จะหายไปเองโดยอัตโนมัติ)
        ]
      }
    };
};

// อนาคตเพิ่มหน้าอื่นๆ ก็เขียนต่อที่นี่
// export const createStockFlex = (data: any) => { ... }