import { dbStorage } from './db';

export async function seedDefaultData() {
  try {
    console.log('🌱 Starting database seeding...');

    // التحقق من وجود البيانات لتجنب التكرار
    const existingCategories = await dbStorage.getCategories();
    if (existingCategories.length > 0) {
      console.log('✓ Database already seeded, skipping...');
      return;
    }

    // إضافة التصنيفات الأساسية
    const categories = [
      { name: "مطاعم", icon: "fas fa-utensils", isActive: true, sortOrder: 0 },
      { name: "مقاهي", icon: "fas fa-coffee", isActive: true, sortOrder: 1 },
      { name: "حلويات", icon: "fas fa-candy-cane", isActive: true, sortOrder: 2 },
      { name: "مشروبات", icon: "fas fa-coffee", isActive: true, sortOrder: 3 },
    ];

    console.log('📂 Seeding categories...');
    const seededCategories = [];
    for (const categoryData of categories) {
      const category = await dbStorage.createCategory(categoryData);
      seededCategories.push(category);
      console.log(`  ✓ Created category: ${category.name}`);
    }

    // إضافة مطاعم تجريبية أساسية
    const restaurants = [
      {
        name: "مطعم الوزيكو للعربكة",
        description: "مطعم يمني تقليدي متخصص في الأطباق الشعبية",
        image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        phone: "+967771234567",
        rating: "4.8",
        reviewCount: 4891,
        deliveryTime: "40-60 دقيقة",
        isOpen: true,
        minimumOrder: "25",
        deliveryFee: "5",
        categoryId: seededCategories[0].id,
        openingTime: "08:00",
        closingTime: "23:00",
        workingDays: "0,1,2,3,4,5,6",
        isTemporarilyClosed: false,
        address: "صنعاء، اليمن",
        latitude: "15.3694",
        longitude: "44.1910",
        isFeatured: true,
        isNew: false,
        isActive: true,
      },
      {
        name: "حلويات الشام",
        description: "أفضل الحلويات الشامية والعربية",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        phone: "+967779876543",
        rating: "4.6",
        reviewCount: 2341,
        deliveryTime: "30-45 دقيقة",
        isOpen: true,
        minimumOrder: "15",
        deliveryFee: "3",
        categoryId: seededCategories[2].id, // حلويات
        openingTime: "08:00",
        closingTime: "23:00",
        workingDays: "0,1,2,3,4,5,6",
        isTemporarilyClosed: false,
        address: "صنعاء، اليمن",
        latitude: "15.3547",
        longitude: "44.2066",
        isFeatured: false,
        isNew: true,
        isActive: true,
      }
    ];

    console.log('🏪 Seeding restaurants...');
    const seededRestaurants = [];
    for (const restaurantData of restaurants) {
      const restaurant = await dbStorage.createRestaurant(restaurantData);
      seededRestaurants.push(restaurant);
      console.log(`  ✓ Created restaurant: ${restaurant.name}`);
    }

    // إضافة عناصر قائمة أساسية
    const menuItems = [
      {
        name: "عربكة بالقشطة والعسل",
        description: "حلوى يمنية تقليدية بالقشطة الطازجة والعسل الطبيعي",
        price: "55",
        image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
        category: "وجبات رمضان",
        isAvailable: true,
        isSpecialOffer: false,
        restaurantId: seededRestaurants[0].id,
      },
      {
        name: "شاي كرك",
        description: "شاي كرك بالحليب والهيل",
        price: "8",
        image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
        category: "المشروبات",
        isAvailable: true,
        isSpecialOffer: false,
        restaurantId: seededRestaurants[0].id,
      },
      {
        name: "كنافة نابلسية",
        description: "كنافة نابلسية بالجبنة والقطر",
        price: "45",
        image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
        category: "حلويات شرقية",
        isAvailable: true,
        isSpecialOffer: true,
        originalPrice: "50",
        restaurantId: seededRestaurants[1].id,
      }
    ];

    console.log('🍽️ Seeding menu items...');
    for (const menuItemData of menuItems) {
      const menuItem = await dbStorage.createMenuItem(menuItemData);
      console.log(`  ✓ Created menu item: ${menuItem.name}`);
    }

    // إضافة إعدادات الواجهة الأساسية
    const uiSettings = [
      // إعدادات التنقل
      {
        key: "show_categories",
        value: "true",
        category: "navigation",
        description: "عرض تصنيفات المطاعم في الصفحة الرئيسية"
      },
      {
        key: "show_search_bar",
        value: "true",
        category: "navigation",
        description: "عرض شريط البحث في الصفحة الرئيسية"
      },
      {
        key: "show_special_offers",
        value: "true",
        category: "navigation",
        description: "عرض العروض الخاصة والتخفيضات"
      },
      {
        key: "show_cart_button",
        value: "true",
        category: "navigation",
        description: "عرض زر السلة"
      },
      {
        key: "show_timing_banner",
        value: "true",
        category: "navigation",
        description: "عرض شريط أوقات العمل"
      },
      {
        key: "show_orders_page",
        value: "true",
        category: "navigation",
        description: "عرض صفحة الطلبات في التنقل"
      },
      {
        key: "show_track_orders_page",
        value: "true",
        category: "navigation",
        description: "عرض صفحة تتبع الطلبات في التنقل"
      },
      {
        key: "show_admin_panel",
        value: "false",
        category: "navigation",
        description: "عرض لوحة التحكم الإدارية"
      },
      {
        key: "show_delivery_app",
        value: "false",
        category: "navigation",
        description: "عرض تطبيق التوصيل"
      },
      
      // إعدادات عرض المطاعم
      {
        key: "show_ratings",
        value: "true",
        category: "display",
        description: "عرض تقييمات المطاعم"
      },
      {
        key: "show_delivery_time",
        value: "true",
        category: "display",
        description: "عرض وقت التوصيل"
      },
      {
        key: "show_minimum_order",
        value: "true",
        category: "display",
        description: "عرض الحد الأدنى للطلب"
      },
      {
        key: "show_restaurant_description",
        value: "true",
        category: "display",
        description: "عرض وصف المطعم"
      },
      
      // إعدادات التطبيق العامة
      {
        key: "app_name",
        value: "السريع ون للتوصيل",
        category: "general",
        description: "اسم التطبيق الذي يظهر للمستخدمين"
      },
      {
        key: "app_theme",
        value: "#007bff",
        category: "general",
        description: "اللون الأساسي للتطبيق (hex color)"
      },
      {
        key: "delivery_fee_default",
        value: "5",
        category: "general",
        description: "رسوم التوصيل الافتراضية (ريال)"
      },
      {
        key: "delivery_fee_per_km",
        value: "2",
        category: "general",
        description: "رسوم التوصيل لكل كيلومتر (ريال)"
      },
      {
        key: "minimum_order_default",
        value: "25",
        category: "general",
        description: "الحد الأدنى لقيمة الطلب (ريال)"
      },
      
      // إعدادات المتجر
      {
        key: "opening_time",
        value: "08:00",
        category: "store",
        description: "وقت فتح المتجر (HH:MM)"
      },
      {
        key: "closing_time",
        value: "23:00",
        category: "store",
        description: "وقت إغلاق المتجر (HH:MM)"
      },
      {
        key: "store_status",
        value: "open",
        category: "store",
        description: "حالة المتجر الحالية"
      }
    ];

    console.log('⚙️ Seeding UI settings...');
    for (const settingData of uiSettings) {
      const setting = await dbStorage.createUiSetting(settingData);
      console.log(`  ✓ Created UI setting: ${setting.key}`);
    }

    // إنشاء مدير النظام الافتراضي
    const adminUsers = [
      {
        name: "مدير النظام الرئيسي",
        email: "admin@alsarie-one.com",
        username: "admin",
        phone: "+967777777777",
        password: "777146387",
        userType: "admin",
        isActive: true,
      }
    ];

    console.log('👤 Seeding admin users...');
    for (const adminData of adminUsers) {
      const createdAdmin = await dbStorage.createAdminUser(adminData);
      console.log(`  ✓ Created admin user: ${createdAdmin.name}`);
    }

    // إنشاء سائقين تجريبيين
    const defaultDrivers = [
      {
        name: "أحمد محمد السائق",
        phone: "+967771234567",
        password: "driver123",
        isAvailable: true,
        isActive: true,
        currentLocation: "صنعاء، شارع الزبيري",
        earnings: "2500",
      },
    ];

    console.log('🚗 Seeding drivers...');
    for (const driverData of defaultDrivers) {
      const createdDriver = await dbStorage.createDriver(driverData);
      console.log(`  ✓ Created driver: ${createdDriver.name}`);
    }

    // إضافة عرض خاص تجريبي
    const specialOffers = [
      {
        title: "خصم 20% على الطلبات فوق 100 ريال",
        description: "احصل على خصم 20% عند طلب بقيمة 100 ريال أو أكثر",
        image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400",
        discountPercent: 20,
        minimumOrder: "100",
        isActive: true,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 يوم من الآن
      }
    ];
    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Seeded: ${categories.length} categories, ${restaurants.length} restaurants, ${menuItems.length} menu items, ${uiSettings.length} UI settings, ${adminUsers.length} admin users, ${defaultDrivers.length} drivers`);

    console.log('🎁 Seeding special offers...');
    for (const offerData of specialOffers) {
      const offer = await dbStorage.createSpecialOffer(offerData);
    console.log(`📊 Seeded: ${categories.length} categories, ${restaurants.length} restaurants, ${menuItems.length} menu items, ${uiSettings.length} UI settings, ${adminUsers.length} admin users, ${defaultDrivers.length} drivers, ${specialOffers.length} special offers`);
    }
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}