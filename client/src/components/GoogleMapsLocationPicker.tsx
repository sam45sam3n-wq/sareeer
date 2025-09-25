import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  area?: string;
  city?: string;
  placeId?: string;
}

interface GoogleMapsLocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  defaultLocation?: LocationData;
  className?: string;
  placeholder?: string;
}

export function GoogleMapsLocationPicker({ 
  onLocationSelect, 
  defaultLocation, 
  className = "",
  placeholder = "ابحث عن موقع أو اختر من الخريطة..."
}: GoogleMapsLocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(defaultLocation || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Request location permission and get current location
  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    
    try {
      if (!navigator.geolocation) {
        throw new Error('خدمة تحديد الموقع غير مدعومة في هذا المتصفح');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      });

      const location: LocationData = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        address: `الموقع الحالي (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`,
        area: 'الموقع الحالي',
        city: 'صنعاء'
      };

      setSelectedLocation(location);
      onLocationSelect(location);
      
      toast({
        title: "تم تحديد الموقع بنجاح",
        description: "تم الحصول على موقعك الحالي بدقة",
      });

    } catch (error) {
      console.error('خطأ في تحديد الموقع:', error);
      toast({
        title: "خطأ في تحديد الموقع",
        description: "لا يمكن الوصول لموقعك الحالي. يرجى منح الصلاحية أو اختيار موقع من القائمة.",
        variant: "destructive",
      });
    } finally {
      setIsGettingLocation(false);
    }
  };

  // فتح خرائط جوجل لاختيار الموقع بدقة
  const openGoogleMaps = () => {
    const defaultLat = selectedLocation?.lat || 15.3694; // Sana'a coordinates
    const defaultLng = selectedLocation?.lng || 44.1910;
    
    // إنشاء رابط خرائط جوجل لاختيار الموقع
    const mapsUrl = `https://www.google.com/maps/place/${defaultLat},${defaultLng}/@${defaultLat},${defaultLng},15z`;
    
    // فتح في نافذة/تبويب جديد
    window.open(mapsUrl, '_blank');
    
    toast({
      title: "تم فتح خرائط جوجل",
      description: "اختر موقعك من الخريطة وانسخ الإحداثيات أو العنوان",
    });
  };

  // مواقع محددة مسبقاً في اليمن
  const predefinedLocations: LocationData[] = [
    { lat: 15.3694, lng: 44.1910, address: 'صنعاء القديمة، باب اليمن', area: 'باب اليمن', city: 'صنعاء' },
    { lat: 15.3547, lng: 44.2066, address: 'صنعاء الجديدة، شارع الزبيري', area: 'الزبيري', city: 'صنعاء' },
    { lat: 15.3400, lng: 44.1947, address: 'صنعاء، حي السبعين', area: 'السبعين', city: 'صنعاء' },
    { lat: 15.3333, lng: 44.2167, address: 'صنعاء، شارع الستين', area: 'الستين', city: 'صنعاء' },
    { lat: 15.3250, lng: 44.2083, address: 'صنعاء، شارع الخمسين', area: 'الخمسين', city: 'صنعاء' },
    { lat: 15.3100, lng: 44.1800, address: 'صنعاء، شارع الأربعين', area: 'الأربعين', city: 'صنعاء' },
  ];

  const selectLocation = (location: LocationData) => {
    setSelectedLocation(location);
    onLocationSelect(location);
    setShowMap(false);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "أدخل عنوان للبحث",
        description: "يرجى كتابة العنوان أو اسم المنطقة",
        variant: "destructive",
      });
      return;
    }

    // Simple search in predefined locations
    const found = predefinedLocations.find(loc => 
      loc.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.city?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (found) {
      selectLocation(found);
      toast({
        title: "تم العثور على الموقع",
        description: found.address,
      });
    } else {
      toast({
        title: "لم يتم العثور على الموقع",
        description: "جرب البحث بكلمات أخرى أو استخدم الموقع الحالي",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* شريط البحث */}
      <div className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
          data-testid="location-search-input"
        />
        <Button 
          onClick={handleSearch}
          variant="outline"
          data-testid="location-search-button"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* أزرار الإجراءات */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
          className="gap-2 bg-blue-500 hover:bg-blue-600"
          data-testid="current-location-button"
        >
          <Navigation className="h-4 w-4" />
          {isGettingLocation ? 'جاري التحديد...' : 'موقعي الحالي'}
        </Button>
        
        <Button
          onClick={openGoogleMaps}
          variant="outline"
          className="gap-2"
          data-testid="google-maps-button"
        >
          <MapPin className="h-4 w-4" />
          اختيار من الخرائط
        </Button>
      </div>

      {/* المواقع المحددة مسبقاً */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-3 text-right">المواقع المتاحة:</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {predefinedLocations.map((location, index) => (
              <button
                key={index}
                onClick={() => selectLocation(location)}
                className={`w-full p-3 text-right border rounded-lg transition-colors ${
                  selectedLocation?.lat === location.lat && selectedLocation?.lng === location.lng
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                data-testid={`predefined-location-${index}`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <div className="font-medium text-sm">{location.area}</div>
                    <div className="text-xs text-gray-600">{location.address}</div>
                  </div>
                  {selectedLocation?.lat === location.lat && selectedLocation?.lng === location.lng && (
                    <CheckCircle className="text-green-500 h-4 w-4" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* عرض الموقع المحدد */}
      {selectedLocation && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-500 h-5 w-5" />
              <div className="text-right flex-1">
                <div className="font-medium text-green-800">تم تحديد الموقع:</div>
                <div className="text-sm text-green-600">{selectedLocation.address}</div>
                <div className="text-xs text-green-500">
                  📍 الإحداثيات: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </div>
                <div className="text-xs text-green-500 mt-1">
                  💡 يمكنك نسخ هذه الإحداثيات لاستخدامها في إعدادات المطعم
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}