import { useState } from 'react';
import { Minus, Plus, Trash2, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { GoogleMapsLocationPicker, LocationData } from './GoogleMapsLocationPicker';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Cart({ isOpen, onClose }: CartProps) {
  const { state, updateQuantity, removeItem, addNotes, clearCart } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState<number>(5);
  const { toast } = useToast();
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

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

    // Name validation
    if (!customerInfo.name.trim()) {
      errors.customerName = 'الاسم مطلوب';
    } else if (customerInfo.name.trim().length < 2) {
      errors.customerName = 'الاسم يجب أن يكون على الأقل حرفين';
    }

    // Phone validation - Yemen phone format
    if (!customerInfo.phone.trim()) {
      errors.customerPhone = 'رقم الهاتف مطلوب';
    } else if (!/^(7[0-9]{8}|00967[7][0-9]{8}|\+967[7][0-9]{8})$/.test(customerInfo.phone.replace(/\s/g, ''))) {
      errors.customerPhone = 'رقم الهاتف غير صحيح. مثال: 773123456';
    }

    // Address validation
    if (!selectedLocation) {
      errors.deliveryAddress = 'يرجى تحديد موقع التوصيل';
    }

    return errors;
  };

  // Handle location selection and calculate delivery fee
  const handleLocationSelect = (location: LocationData) => {
    setSelectedLocation(location);
    
    // Calculate delivery fee based on distance
    if (location && state.items.length > 0) {
      // Default restaurant location (Sana'a center)
      const restaurantLat = 15.3694;
      const restaurantLng = 44.1910;
      
      const distance = calculateDistance(
        restaurantLat, 
        restaurantLng, 
        location.lat, 
        location.lng
      );
      
      // Calculate fee: minimum 3 rials, then 2 rials per km
      const calculatedFee = Math.max(3, Math.round(distance * 2));
      setCalculatedDeliveryFee(calculatedFee);
      
      toast({
        title: "تم حساب رسوم التوصيل",
        description: `المسافة: ${distance.toFixed(1)} كم - الرسوم: ${calculatedFee} ريال`,
      });
    }
  };

  // Function to save customer info to user profile
  const saveCustomerInfoToProfile = async () => {
    try {
      // For now, we'll use the same demo user ID as in Profile component
      const userId = '5ea1edd8-b9e1-4c9e-84fb-25aa2741a0db';
      
      // Update user profile with delivery info
      await apiRequest('PUT', `/api/users/${userId}`, {
        name: customerInfo.name,
        phone: customerInfo.phone,
        email: customerInfo.email,
        address: selectedLocation?.address,
      });
    } catch (error) {
      console.error('Failed to save customer info to profile:', error);
      // Don't show error to user as this is a background operation
    }
  };

  const handleCheckout = async () => {
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

    try {
      const orderData = {
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
        deliveryAddress: selectedLocation.address,
        customerLocationLat: selectedLocation.lat,
        customerLocationLng: selectedLocation.lng,
        notes: customerInfo.notes,
        paymentMethod: 'cash',
        items: JSON.stringify(state.items),
        subtotal: state.subtotal,
        deliveryFee: calculatedDeliveryFee,
        totalAmount: state.subtotal + calculatedDeliveryFee,
        total: state.subtotal + calculatedDeliveryFee,
        restaurantId: state.restaurantId
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const order = await response.json();
        
        // Save customer info to profile after successful order
        await saveCustomerInfoToProfile();
        
        toast({
          title: "تم تأكيد طلبك بنجاح! 🎉",
          description: `رقم الطلب: ${order.orderNumber || order.id}`,
        });
        clearCart();
        onClose();
      } else {
        throw new Error('فشل في إرسال الطلب');
      }
    } catch (error) {
      console.error('Order error:', error);
      toast({
        title: "خطأ في إرسال الطلب",
        description: "يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-end">
      <div className="bg-white w-full max-w-md h-5/6 rounded-t-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-red-500" size={24} />
            <h2 className="text-lg font-semibold">سلة التسوق</h2>
            {state.items.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {state.items.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {state.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <ShoppingBag size={64} className="mb-4 opacity-50" />
              <p>سلة التسوق فارغة</p>
              <p className="text-sm">أضف عناصر من المطاعم لتبدأ طلبك</p>
            </div>
          ) : (
            <>
              {/* Restaurant Name */}
              {state.restaurantName && (
                <div className="p-4 bg-gray-50 border-b">
                  <h3 className="font-medium text-gray-800">من {state.restaurantName}</h3>
                </div>
              )}

              {/* Cart Items */}
              <div className="p-4 space-y-4">
                {state.items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <p className="text-red-500 font-medium">{item.price} ر.ي</p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 border rounded hover:bg-gray-50"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="px-3 py-1 bg-gray-100 rounded">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 border rounded hover:bg-gray-50"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <span className="font-medium">
                        {(parseFloat(item.price) * item.quantity).toFixed(2)} ر.ي
                      </span>
                    </div>

                    {/* Notes */}
                    <textarea
                      placeholder="ملاحظات خاصة بهذا العنصر"
                      value={item.notes || ''}
                      onChange={(e) => addNotes(item.id, e.target.value)}
                      className="w-full mt-2 p-2 border rounded text-sm resize-none"
                      rows={2}
                    />
                  </div>
                ))}
              </div>

              {/* Checkout Section */}
              {!showCheckout ? (
                <div className="p-4 border-t">
                  {/* Summary */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span>المجموع الفرعي:</span>
                      <span>{state.subtotal.toFixed(2)} ر.ي</span>
                    </div>
                    <div className="flex justify-between">
                      <span>رسوم التوصيل:</span>
                      <span>{calculatedDeliveryFee.toFixed(2)} ر.ي</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>المجموع الكلي:</span>
                      <span className="text-red-500">{(state.subtotal + calculatedDeliveryFee).toFixed(2)} ر.ي</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowCheckout(true)}
                    className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors"
                  >
                    إتمام الطلب
                  </button>
                </div>
              ) : (
                <div className="p-4 border-t space-y-4">
                  {/* Customer Info */}
                  <div>
                    <h3 className="font-medium mb-2">معلومات العميل</h3>
                    <div className="space-y-3">
                      <div>
                        <input
                          type="text"
                          placeholder="الاسم *"
                          value={customerInfo.name}
                          onChange={(e) => {
                            setCustomerInfo({...customerInfo, name: e.target.value});
                            if (validationErrors.customerName) {
                              setValidationErrors(prev => ({...prev, customerName: ''}));
                            }
                          }}
                          className={`w-full p-3 border rounded-lg ${
                            validationErrors.customerName ? 'border-red-500' : ''
                          }`}
                        />
                        {validationErrors.customerName && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.customerName}</p>
                        )}
                      </div>
                      <div>
                        <input
                          type="tel"
                          placeholder="رقم الهاتف *"
                          value={customerInfo.phone}
                          onChange={(e) => {
                            setCustomerInfo({...customerInfo, phone: e.target.value});
                            if (validationErrors.customerPhone) {
                              setValidationErrors(prev => ({...prev, customerPhone: ''}));
                            }
                          }}
                          className={`w-full p-3 border rounded-lg ${
                            validationErrors.customerPhone ? 'border-red-500' : ''
                          }`}
                        />
                        {validationErrors.customerPhone && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.customerPhone}</p>
                        )}
                      </div>
                      <input
                        type="email"
                        placeholder="البريد الإلكتروني (اختياري)"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                        className="w-full p-3 border rounded-lg"
                      />
                      <textarea
                        placeholder="ملاحظات إضافية"
                        value={customerInfo.notes}
                        onChange={(e) => setCustomerInfo({...customerInfo, notes: e.target.value})}
                        className="w-full p-3 border rounded-lg resize-none"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Location Picker */}
                  <GoogleMapsLocationPicker
                    onLocationSelect={handleLocationSelect}
                    className="border-0 shadow-none p-0"
                  />

                  {/* Delivery Fee Info */}
                  {selectedLocation && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="text-sm text-blue-800">
                        <div className="font-medium">تفاصيل التوصيل:</div>
                        <div>المسافة المقدرة: {calculateDistance(15.3694, 44.1910, selectedLocation.lat, selectedLocation.lng).toFixed(1)} كم</div>
                        <div>رسوم التوصيل: {calculatedDeliveryFee} ريال</div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCheckout(false)}
                      className="flex-1 border border-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50"
                    >
                      رجوع
                    </button>
                    <button
                      onClick={handleCheckout}
                      className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors"
                    >
                      تأكيد الطلب
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}