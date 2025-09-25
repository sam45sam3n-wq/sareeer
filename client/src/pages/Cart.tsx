import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Trash2, MapPin, Calendar, Clock, DollarSign, Plus, Minus, ShoppingCart, AlertCircle } from 'lucide-react';
import { LocationPicker, LocationData } from '@/components/LocationPicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useCart } from '../contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { InsertOrder } from '@shared/schema';

export default function Cart() {
  const [, setLocation] = useLocation();
  const { state, removeItem, updateQuantity, clearCart } = useCart();
  const { items, subtotal } = state;
  const { toast } = useToast();

  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deliveryAddress: '',
    notes: '',
    paymentMethod: 'cash',
    deliveryTime: 'now', // 'now' or 'later'
    deliveryDate: '',
    deliveryTimeSlot: '',
    locationData: null as LocationData | null,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState<number>(5); // Default fee
  const [deliveryFeePerKm] = useState<number>(2); // 2 رياي لكل كيلو متر (from admin settings)

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Enhanced validation function
  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    // Name validation - required, minimum 2 characters, only letters and spaces
    if (!orderForm.customerName.trim()) {
      errors.customerName = 'الاسم مطلوب';
    } else if (orderForm.customerName.trim().length < 2) {
      errors.customerName = 'الاسم يجب أن يكون على الأقل حرفين';
    } else if (!/^[أ-يa-zA-Z\s]+$/.test(orderForm.customerName)) {
      errors.customerName = 'الاسم يجب أن يحتوي على أحرف فقط';
    }

    // Phone validation - required, Yemen phone format
    if (!orderForm.customerPhone.trim()) {
      errors.customerPhone = 'رقم الهاتف مطلوب';
    } else if (!/^(7[0-9]{8}|00967[7][0-9]{8}|\+967[7][0-9]{8})$/.test(orderForm.customerPhone.replace(/\s/g, ''))) {
      errors.customerPhone = 'رقم الهاتف غير صحيح. مثال: 773123456 أو 00967773123456';
    }

    // Address validation - required, minimum 10 characters
    if (!orderForm.deliveryAddress.trim()) {
      errors.deliveryAddress = 'عنوان التوصيل مطلوب';
    } else if (orderForm.deliveryAddress.trim().length < 10) {
      errors.deliveryAddress = 'يرجى كتابة عنوان مفصل أكثر (على الأقل 10 أحرف)';
    }

    return errors;
  };

  // Handle location selection from LocationPicker
  const handleLocationSelect = (location: LocationData) => {
    setOrderForm(prev => ({
      ...prev,
      deliveryAddress: location.address,
      locationData: location,
    }));
    
    // Calculate delivery fee based on distance from restaurant
    if (location && items.length > 0) {
      // Default restaurant location (this should come from restaurant data)
      const restaurantLat = 15.3694; // Sana'a center coordinates
      const restaurantLng = 44.1910;
      
      const distance = calculateDistance(
        restaurantLat, 
        restaurantLng, 
        location.lat, 
        location.lng
      );
      
      // Calculate fee: minimum 3 rials, then 2 rials per km after first km
      const calculatedFee = Math.max(3, Math.round(distance * deliveryFeePerKm));
      setCalculatedDeliveryFee(calculatedFee);
    }
  };

  // Calculate delivery fee when location changes
  useEffect(() => {
    if (orderForm.locationData && items.length > 0) {
      const restaurantLat = 15.3694; // This should come from restaurant data
      const restaurantLng = 44.1910;
      
      const distance = calculateDistance(
        restaurantLat,
        restaurantLng,
        orderForm.locationData.lat,
        orderForm.locationData.lng
      );
      
      const calculatedFee = Math.max(3, Math.round(distance * deliveryFeePerKm));
      setCalculatedDeliveryFee(calculatedFee);
    }
  }, [orderForm.locationData, items.length, deliveryFeePerKm]);

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: InsertOrder) => {
      const response = await apiRequest('POST', '/api/orders', orderData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم تأكيد طلبك بنجاح!",
        description: "سيتم التواصل معك قريباً",
      });
      clearCart();
      setLocation('/');
    },
    onError: () => {
      toast({
        title: "خطأ في تأكيد الطلب",
        description: "يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  const handlePlaceOrder = () => {
    // Validate form
    const errors = validateForm();
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast({
        title: "معلومات غير صحيحة",
        description: "يرجى تصحيح الأخطاء المذكورة في النموذج",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "السلة فارغة",
        description: "أضف بعض العناصر قبل تأكيد الطلب",
        variant: "destructive",
      });
      return;
    }

    // Calculate final total with calculated delivery fee
    const finalTotal = subtotal + calculatedDeliveryFee;

    const orderData: InsertOrder = {
      ...orderForm,
      items: JSON.stringify(items),
      subtotal: subtotal.toString(),
      deliveryFee: calculatedDeliveryFee.toString(),
      total: finalTotal.toString(),
      totalAmount: finalTotal.toString(),
      restaurantId: items[0]?.restaurantId || '',
      status: 'pending',
      orderNumber: `ORD${Date.now()}`,
    };

    placeOrderMutation.mutate(orderData);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with red theme */}
      <header className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              className="text-white hover:bg-white/20"
              data-testid="button-cart-back"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">تأكيد الطلب</h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={clearCart}
            data-testid="button-clear-cart"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Cart Items */}
        {items.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-800 mb-4">عناصر السلة</h3>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
                    <div className="relative">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900" data-testid={`cart-item-name-${item.id}`}>
                        {item.name}
                      </h4>
                      <p className="text-sm font-bold text-gray-900" data-testid={`cart-item-price-${item.id}`}>
                        {item.price}ريال
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="w-6 h-6"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        data-testid={`button-decrease-${item.id}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium" data-testid={`cart-item-quantity-${item.id}`}>
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="w-6 h-6"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        data-testid={`button-increase-${item.id}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="w-6 h-6 ml-2 text-red-500 hover:text-red-700"
                        onClick={() => removeItem(item.id)}
                        data-testid={`button-remove-${item.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Information Form */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-800 mb-4">معلومات العميل</h3>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="الاسم *"
                  value={orderForm.customerName}
                  onChange={(e) => {
                    setOrderForm(prev => ({ ...prev, customerName: e.target.value }));
                    if (validationErrors.customerName) {
                      setValidationErrors(prev => ({ ...prev, customerName: '' }));
                    }
                  }}
                  data-testid="input-customer-name"
                  className={validationErrors.customerName ? 'border-red-500 focus:border-red-500' : ''}
                />
                {validationErrors.customerName && (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{validationErrors.customerName}</span>
                  </div>
                )}
              </div>
              
              <div>
                <Input
                  placeholder="رقم الهاتف * (مثال: 773123456)"
                  value={orderForm.customerPhone}
                  onChange={(e) => {
                    setOrderForm(prev => ({ ...prev, customerPhone: e.target.value }));
                    if (validationErrors.customerPhone) {
                      setValidationErrors(prev => ({ ...prev, customerPhone: '' }));
                    }
                  }}
                  data-testid="input-customer-phone"
                  className={validationErrors.customerPhone ? 'border-red-500 focus:border-red-500' : ''}
                />
                {validationErrors.customerPhone && (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{validationErrors.customerPhone}</span>
                  </div>
                )}
              </div>
              
              <Input
                placeholder="البريد الإلكتروني"
                value={orderForm.customerEmail}
                onChange={(e) => setOrderForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                data-testid="input-customer-email"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Section with Location Picker */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold text-gray-800">عنوان التوصيل</h3>
            </div>
            
            {/* Location Picker Component */}
            <div className="mb-4">
              <LocationPicker 
                onLocationSelect={handleLocationSelect}
                placeholder="اختر موقع التوصيل من الخريطة"
              />
            </div>

            {/* Manual Address Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">أو أدخل العنوان يدوياً:</label>
              <Textarea
                placeholder="أدخل عنوان التوصيل بالتفصيل * (مثال: صنعاء، شارع الزبيري، بجانب مسجد النور، الطابق الثاني)"
                value={orderForm.deliveryAddress}
                onChange={(e) => {
                  setOrderForm(prev => ({ ...prev, deliveryAddress: e.target.value }));
                  if (validationErrors.deliveryAddress) {
                    setValidationErrors(prev => ({ ...prev, deliveryAddress: '' }));
                  }
                }}
                rows={3}
                data-testid="input-delivery-address"
                className={validationErrors.deliveryAddress ? 
                  'border-red-500 focus:border-red-500 focus:ring-red-500' : 
                  'border-gray-300 focus:border-red-500 focus:ring-red-500'
                }
              />
              {validationErrors.deliveryAddress && (
                <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{validationErrors.deliveryAddress}</span>
                </div>
              )}
            </div>

            {/* Location Coordinates Display */}
            {orderForm.locationData && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">تم تحديد الموقع بدقة</span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  📍 الإحداثيات: {orderForm.locationData.lat.toFixed(6)}, {orderForm.locationData.lng.toFixed(6)}
                </p>
                <p className="text-xs text-green-700">
                  سيتم توصيل طلبك بدقة للموقع المحدد
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Notes */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold text-gray-800">ملاحظات الطلب</h3>
            </div>
            <Textarea
              placeholder="أضف ملاحظات للطلب (اختياري)"
              value={orderForm.notes}
              onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              data-testid="input-order-notes"
            />
          </CardContent>
        </Card>

        {/* Delivery Time */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold text-gray-800">تحديد وقت الطلب</h3>
            </div>
            <div className="text-sm text-gray-600 mb-3">وقت لتنفيذ الطلب</div>
            
            <div className="flex gap-3">
              <Button 
                variant={orderForm.deliveryTime === 'now' ? "default" : "outline"}
                className={`flex-1 ${orderForm.deliveryTime === 'now' ? 'bg-red-500 hover:bg-red-600 text-white' : 'border-gray-300'}`}
                onClick={() => setOrderForm(prev => ({ ...prev, deliveryTime: 'now' }))}
              >
                ✓ الآن
              </Button>
              <Button 
                variant={orderForm.deliveryTime === 'later' ? "default" : "outline"}
                className={`flex-1 ${orderForm.deliveryTime === 'later' ? 'bg-red-500 hover:bg-red-600 text-white' : 'border-gray-300'}`}
                onClick={() => setOrderForm(prev => ({ ...prev, deliveryTime: 'later' }))}
              >
                في وقت لاحق
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold text-gray-800">الدفع ( الدفع عند الاستلام )</h3>
            </div>

            <RadioGroup 
              value={orderForm.paymentMethod} 
              onValueChange={(value) => setOrderForm(prev => ({ ...prev, paymentMethod: value }))}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex-1 cursor-pointer">
                  الدفع عند الاستلام
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="wallet" id="wallet" />
                <Label htmlFor="wallet" className="flex-1 cursor-pointer">
                  الدفع من رصيد
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="digital" id="digital" />
                <Label htmlFor="digital" className="flex-1 cursor-pointer">
                  الدفع باستخدام المحفظة الإلكترونية
                </Label>
              </div>
            </RadioGroup>

            <Button className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3">
              إضافة رصيد
            </Button>
          </CardContent>
        </Card>

        {/* Final Order Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">المجموع الفرعي</span>
                <span className="text-xl font-bold text-gray-900" data-testid="text-subtotal">
                  {subtotal}ريال
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-gray-600">التوصيل</span>
                  {orderForm.locationData && (
                    <span className="text-xs text-green-600">
                      محسوب بناء على المسافة ({Math.round(calculateDistance(15.3694, 44.1910, orderForm.locationData.lat, orderForm.locationData.lng) * 10) / 10} كم)
                    </span>
                  )}
                </div>
                <span className="text-gray-900" data-testid="text-delivery-fee">
                  {subtotal > 0 ? `${calculatedDeliveryFee}ريال` : '0ريال'}
                </span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-gray-800 font-semibold">الإجمالي</span>
                <span className="text-xl font-bold text-red-500" data-testid="text-total">
                  {subtotal > 0 ? `${subtotal + calculatedDeliveryFee}ريال` : '0ريال'}
                </span>
              </div>
              
              <div className="text-sm text-gray-500 text-center">
                يرجى الاتصال بالإنترنت وتحديد عنوان التوصيل (لاحتساب
                سعر التوصيل والدعم المتوفر)
                <Button variant="link" className="text-blue-500 p-0 h-auto text-sm">
                  إعادة المحاولة (اضغط هنا)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Confirmation Button */}
        {items.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <Button 
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 text-lg"
                onClick={handlePlaceOrder}
                disabled={placeOrderMutation.isPending}
                data-testid="button-place-order"
              >
                {placeOrderMutation.isPending ? 'جاري تأكيد الطلب...' : `تأكيد الطلب - ${subtotal + calculatedDeliveryFee}ريال`}
              </Button>
            </CardContent>
          </Card>
        )}
        
        {items.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">السلة فارغة</h3>
                <p className="text-sm">أضف بعض العناصر لبدء الطلب</p>
                <Button 
                  className="mt-4 bg-red-500 hover:bg-red-600 text-white"
                  onClick={() => setLocation('/')}
                  data-testid="button-continue-shopping"
                >
                  تصفح المطاعم
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}