import { useState, useEffect } from 'react'; // เพิ่ม useEffect
import { useOutletContext } from 'react-router-dom'; // ✅ นำเข้า Context
import { useForm } from 'react-hook-form';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { MessageSquare, AlertCircle, HelpCircle, FileWarning } from 'lucide-react';
import { supabase } from '../utils/auth';
import { zodResolver } from '@hookform/resolvers/zod'; // ตัวเชื่อม form กับ zod
import * as z from 'zod'; // นำเข้า zod
import { Controller } from 'react-hook-form'; // เพิ่ม Controller สำหรับ Select
import { PRODUCT_TYPES, SERVICE_CHANNELS, ISSUE_DATA, FEEDBACK_TYPES } from '../constants/complaintOptions';

type FeedbackType = 'suggestion' | 'problem' | 'inquiry' | 'complaint';

const complaintSchema = z.object({
  type: z.enum(['suggestion', 'problem', 'inquiry', 'complaint']),
  productTypeId: z.string().min(1, 'กรุณาเลือกผลิตภัณฑ์'),
  mainIssueId: z.string().min(1, 'กรุณาเลือกกลุ่มปัญหาหลัก'),
  subIssueId: z.string().min(1, 'กรุณาเลือกปัญหาย่อย'),
  channelId: z.string().min(1, 'กรุณาเลือกช่องทางที่เกิดปัญหา'),
  subject: z.string().min(5, 'หัวข้อต้องมีความยาวอย่างน้อย 5 ตัวอักษร'),
  description: z.string().min(10, 'กรุณาระบุรายละเอียดอย่างน้อย 10 ตัวอักษร'),
  name: z.string().min(1, 'กรุณากรอกชื่อ-นามสกุล'),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  phone: z.string().optional(),
  otherIssueDetail: z.string().optional(),
}).refine((data) => {
  // ✅ Logic พิเศษ: ถ้าเลือก "อื่นๆ" (15.1) ต้องกรอกรายละเอียดเพิ่ม
  if (data.subIssueId === '15.1' && !data.otherIssueDetail) {
    return false;
  }
  return true;
}, {
  message: "กรุณาระบุรายละเอียดเพิ่มเติมสำหรับหัวข้อ 'อื่นๆ'",
  path: ["otherIssueDetail"],
});

type ComplaintFormValues = z.infer<typeof complaintSchema>;

export function FeedbackForm() {
  // ✅ 1. ดึง user มาจาก MainLayout
  const { user } = useOutletContext<{ user: any }>();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('suggestion');

  // ✅ 2. เชื่อม Schema เข้ากับ useForm
  const {
    register,
    handleSubmit,
    reset,
    watch, // ✅ ใช้ watch เพื่อดึงค่า mainIssueId มากรองปัญหาย่อย
    control, // ✅ใช้สำหรับ Controller (Select)
    formState: { errors, isSubmitting },
  } = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintSchema), // ใช้ resolver เชื่อมต่อ
    defaultValues: {
      productTypeId: '',
      mainIssueId: '',
      subIssueId: '',
      type: 'suggestion',
      name: user?.name || '',  // ✅ ใช้ค่าจาก Context ทันที
      email: user?.email || '',
    },
  });

  const selectedMainIssue = watch('mainIssueId');
  const subIssueOptions = selectedMainIssue 
    ? ISSUE_DATA.subIssues[Number(selectedMainIssue) as keyof typeof ISSUE_DATA.subIssues] 
    : [];

  useEffect(() => {
    if (user) {
      reset({
        // ✅ ถ้าเลือกทางเลือกที่ 1 ต้องมี type ในนี้ด้วย
        type: feedbackType, 
        name: user.name,
        email: user.email,
        productTypeId: '', // ใส่ค่าว่างรอไว้
        mainIssueId: '',
        subIssueId: '',
        channelId: '',
        subject: '',
        description: ''
      });
    }
  }, [user, reset, feedbackType]);

  const onSubmit = async (data: ComplaintFormValues) => {
    try {
      const { error } = await supabase
        .from('complaints') // 👈 เปลี่ยนชื่อตารางตามที่เราออกแบบใหม่
        .insert([{
          ticket_no: `COMP-${Date.now()}`, // สร้างเลข ticket เบื้องต้น
          user_id: user?.id,
          product_type_id: Number(data.productTypeId),
          main_issue_id: Number(data.mainIssueId),
          sub_issue_id: data.subIssueId,
          channel_id: Number(data.channelId),
          subject: data.subject,
          description: data.description,
          other_issue_detail: data.otherIssueDetail,
          status: 'pending',
          metadata: {
            name: data.name,
            email: data.email,
            phone: data.phone,
            browser: navigator.userAgent
          }
        }]);

      if (error) throw error;
      toast.success('ส่งข้อมูลสำเร็จ!');
      reset();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด');
      console.error(error);
    }
  };

  const getIcon = (type: FeedbackType) => {
    switch (type) {
      case 'suggestion':
        return <MessageSquare className="size-5" />;
      case 'problem':
        return <AlertCircle className="size-5" />;
      case 'inquiry':
        return <HelpCircle className="size-5" />;
      case 'complaint':
        return <FileWarning className="size-5" />;
    }
  };

  const getTypeColor = (type: FeedbackType) => {
    switch (type) {
      case 'suggestion':
        return 'text-blue-600';
      case 'problem':
        return 'text-orange-600';
      case 'inquiry':
        return 'text-green-600';
      case 'complaint':
        return 'text-red-600';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={getTypeColor(feedbackType)}>
            {getIcon(feedbackType)}
          </div>
          <div>
            <CardTitle>แจ้งข้อเสนอแนะ / ปัญหา / สอบถาม / ข้อร้องเรียน</CardTitle>
            <CardDescription>
              กรุณากรอกข้อมูลด้านล่างเพื่อส่งข้อความถึงเรา
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="type">ประเภท *</Label>
            <Select
              value={feedbackType}
              onValueChange={(value) => setFeedbackType(value as FeedbackType)}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* ✅ ใช้ Loop แทนการเขียนแยกทีละอัน */}
                {FEEDBACK_TYPES.map((t) => {
                  const Icon = getIcon(t.id as FeedbackType).type; // ดึง Component Icon มาใช้
                  return (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <Icon className={`size-4 ${t.color}`} />
                        <span>{t.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* --- ส่วนเลือกผลิตภัณฑ์ (Product Type) --- */}
          <div className="space-y-2">
            <Label>ผลิตภัณฑ์ *</Label>
            <Controller
              name="productTypeId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="เลือกผลิตภัณฑ์" /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.productTypeId && <p className="text-sm text-red-600">{errors.productTypeId.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* --- กลุ่มปัญหาหลัก --- */}
             <div className="space-y-2">
                <Label>กลุ่มปัญหาหลัก *</Label>
                <Controller
                  name="mainIssueId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="เลือกกลุ่มปัญหา" /></SelectTrigger>
                      <SelectContent>
                        {ISSUE_DATA.mainIssues.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
             </div>

             {/* --- ปัญหาย่อย (Dynamic) --- */}
             <div className="space-y-2">
                <Label>ปัญหาย่อย *</Label>
                <Controller
                  name="subIssueId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedMainIssue}>
                      <SelectTrigger><SelectValue placeholder="เลือกปัญหาย่อย" /></SelectTrigger>
                      <SelectContent>
                        {subIssueOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
             </div>
          </div>

          {/* ---ช่องทางที่เกิดปัญหา (Channel) --- */}
          <div className="space-y-2">
            <Label>ช่องทางที่เกิดปัญหา *</Label>
            <Controller
              name="channelId"
              control={control}
              render={({ field }) => (
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value} 
                  disabled={!selectedMainIssue}
                >
                  <SelectTrigger><SelectValue placeholder="เลือกช่องทาง" /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_CHANNELS.map(c => (
                      // ✅ แก้จุดนี้: ใส่ .toString() ที่ c.id
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {/* อย่าลืมใส่ Error Message ไว้ใต้ช่องด้วยครับพี่ */}
            {errors.channelId && <p className="text-sm text-red-600">{errors.channelId.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อ-นามสกุล *</Label>
              <Input
                id="name"
                {...register('name', { required: 'กรุณากรอกชื่อ-นามสกุล' })}
                placeholder="กรอกชื่อ-นามสกุล"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">อีเมล *</Label>
              <Input
                id="email"
                type="email"
                {...register('email', {
                  required: 'กรุณากรอกอีเมล',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'รูปแบบอีเมลไม่ถูกต้อง',
                  },
                })}
                placeholder="example@email.com"
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">เบอร์โทรศัพท์ (ไม่บังคับ)</Label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              placeholder="0XX-XXX-XXXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">หัวข้อ *</Label>
            <Input
              id="subject"
              {...register('subject', { required: 'กรุณากรอกหัวข้อ' })}
              placeholder="กรอกหัวข้อโดยย่อ"
            />
            {errors.subject && (
              <p className="text-sm text-red-600">{errors.subject.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">รายละเอียด *</Label>
            <Textarea
              id="description"
              {...register('description', {
                required: 'กรุณากรอกรายละเอียด',
                minLength: {
                  value: 10,
                  message: 'กรุณากรอกรายละเอียดอย่างน้อย 10 ตัวอักษร',
                },
              })}
              placeholder="กรุณาระบุรายละเอียดของเรื่องที่ต้องการแจ้ง..."
              rows={6}
              className="resize-none"
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'กำลังส่ง...' : 'ส่งข้อมูล'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setFeedbackType('suggestion');
              }}
            >
              ล้างข้อมูล
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}