import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowRight, MapPin, Clock, Phone, Truck, User, Navigation, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { DriverCommunication } from '@/components/DriverCommunication';

interface OrderStatus {
  id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'on_way' | 'delivered' | 'cancelled';
  timestamp: Date;
  description: string;
}

interface OrderDetails {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: any[];
  total: number;
  status: string;
  estimatedTime: string;
  driverName?: string;
  driverPhone?: string;
  driverId?: string;
  createdAt: Date;
  notes?: string;
  paymentMethod: string;
}

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Fetch real order data from API
  const { data: orderData, isLoading, error } = useQuery({
    queryKey: [`/api/orders/${orderId}/track`],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is required');
      const response = await apiRequest('GET', `/api/orders/${orderId}/track`);
      return response.json();
    },
    enabled: !!orderId,
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل تفاصيل الطلب...</p>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">الطلب غير موجود</h2>
          <p className="text-gray-600 mb-4">لم نتمكن من العثور على هذا الطلب</p>
          <Button onClick={() => setLocation('/')} data-testid="button-back-home">
            العودة للرئيسية
          </Button>
        </div>
      </div>
    );
  }

  const { order, tracking } = orderData;

  const getStatusProgress = (status: string) => {
    const statusMap = {
      pending: 25,
      confirmed: 40,
      preparing: 60,
      on_way: 80,
      delivered: 100,
      cancelled: 0,
    };
    return statusMap[status as keyof typeof statusMap] || 0;
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-blue-500',
      preparing: 'bg-orange-500',
      on_way: 'bg-purple-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-500';
  };

  const getStatusText = (status: string) => {
    const textMap = {
      pending: 'في الانتظار',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      on_way: 'في الطريق',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
    };
    return textMap[status as keyof typeof textMap] || status;
  };

  // Mock driver data - in real app this would come from order.driverId
  const driverData = order.driverId ? {
    id: order.driverId,
    name: order.driverName || 'أحمد محمد',
    phone: order.driverPhone || '+967771234567',
    currentLocation: 'في الطريق إليك',
    isAvailable: false
  } : null;

  return (
    <div>
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/profile')}
            data-testid="button-tracking-back"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">تتبع الطلب</h2>
        </div>
      </header>

      <section className="p-4 space-y-6">
        {/* Live Update Indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-full w-fit mx-auto">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>التحديث المباشر مفعل</span>
        </div>

        {/* Order Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">طلب رقم #{order.orderNumber || order.id}</CardTitle>
              <Badge 
                className={`${getStatusColor(order.status)} text-white`}
                data-testid="order-status-badge"
              >
                {getStatusText(order.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-foreground">الوقت المتوقع للوصول: </span>
              <span className="font-bold text-primary" data-testid="estimated-time">
                {order.estimatedTime}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">حالة الطلب</span>
                <span className="text-foreground">{getStatusProgress(order.status)}%</span>
              </div>
              <Progress 
                value={getStatusProgress(order.status)} 
                className="h-2"
                data-testid="order-progress"
              />
            </div>
          </CardContent>
        </Card>

        {/* Driver Communication */}
        {(order.status === 'on_way' || order.status === 'preparing') && driverData && (
          <DriverCommunication 
            driver={driverData}
            orderNumber={order.orderNumber || order.id}
            customerLocation={order.deliveryAddress}
          />
        )}

        {/* Delivery Address */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-1" />
              <div>
                <h4 className="font-medium text-foreground mb-1">عنوان التوصيل</h4>
                <p className="text-sm text-foreground" data-testid="delivery-address">
                  {order.deliveryAddress}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-2"
                  onClick={() => {
                    const address = encodeURIComponent(order.deliveryAddress);
                    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
                  }}
                  data-testid="button-view-on-maps"
                >
                  <Navigation className="h-4 w-4" />
                  عرض على الخرائط
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تفاصيل الطلب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div className="flex-1">
                  <span className="text-foreground font-medium" data-testid={`item-name-${index}`}>
                    {item.name}
                  </span>
                  <span className="text-muted-foreground text-sm mr-2">
                    × {item.quantity}
                  </span>
                </div>
                <span className="font-bold text-primary" data-testid={`item-price-${index}`}>
                  {item.price * item.quantity} ريال
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex justify-between items-center font-bold">
                <span className="text-foreground">الإجمالي</span>
                <span className="text-primary" data-testid="order-total">
                  {order.total} ريال
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تاريخ الطلب</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tracking?.map((status, index) => (
                <div key={status.id} className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full ${getStatusColor(status.status)} mt-1 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium" data-testid={`timeline-description-${index}`}>
                      {status.description || status.message || 'تحديث الطلب'}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`timeline-time-${index}`}>
                      {status.timestamp.toLocaleTimeString('ar-YE', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              )) || (
                <div className="text-center py-4 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>لا توجد تحديثات متاحة</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Emergency Contact */}
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={() => window.open('tel:+967771234567')}
            data-testid="button-emergency-contact"
          >
            <Phone className="h-4 w-4" />
            اتصال طوارئ - خدمة العملاء
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              const message = `مرحباً، أحتاج مساعدة بخصوص طلب رقم ${order.orderNumber || order.id}`;
              window.open(`https://wa.me/967771234567?text=${encodeURIComponent(message)}`, '_blank');
            }}
            data-testid="button-contact-support"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            تواصل مع الدعم
          </Button>
          
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={() => {
                if (confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) {
                  // Handle order cancellation
                  toast({
                    title: "جاري إلغاء الطلب",
                    description: "سيتم التواصل معك لتأكيد الإلغاء",
                  });
                }
              }}
              data-testid="button-cancel-order"
            >
              إلغاء الطلب
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}