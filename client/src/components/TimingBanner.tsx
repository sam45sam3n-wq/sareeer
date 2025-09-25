import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { useUiSettings } from '@/context/UiSettingsContext';

export default function TimingBanner() {
  const { getSetting } = useUiSettings();

  // الحصول على إعدادات أوقات العمل من UiSettings
  const openingTime = getSetting('opening_time', '08:00');
  const closingTime = getSetting('closing_time', '23:00');
  const currentStatus = getSetting('store_status', 'مفتوح');

  return (
    <div className="bg-gray-100 py-3">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="orange-gradient text-white px-4 py-2 rounded-full inline-flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          <span>أوقات الدوام من الساعة {openingTime} حتى {closingTime}</span>
          <span className={`px-2 py-1 rounded text-xs ${
            currentStatus === 'مفتوح' ? 'bg-green-500/20' : 'bg-white/20'
          }`}>
            {currentStatus}
          </span>
        </div>
      </div>
    </div>
  );
}