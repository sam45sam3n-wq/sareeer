import express from "express";
import { storage } from "../storage";
import { insertOrderSchema, type Order } from "@shared/schema";
import { randomUUID } from "crypto";

const router = express.Router();

// إنشاء طلب جديد
router.post("/", async (req, res) => {
  try {
    const orderData = req.body;
    
    // التحقق من البيانات المطلوبة
    if (!orderData.customerName || !orderData.customerPhone || !orderData.deliveryAddress) {
      return res.status(400).json({ 
        error: "البيانات المطلوبة ناقصة",
        details: "الاسم ورقم الهاتف وعنوان التوصيل مطلوبة"
      });
    }

    // توليد رقم طلب فريد
    const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    const newOrderData = {
      ...orderData,
      orderNumber,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const validatedData = insertOrderSchema.parse(newOrderData);
    const newOrder = await storage.createOrder(validatedData);

    // إنشاء إشعار للمديرين
    try {
      await storage.createNotification({
        type: 'new_order',
        title: 'طلب جديد',
        message: `طلب جديد من ${orderData.customerName} - ${orderNumber}`,
        recipientType: 'admin',
        orderId: newOrder.id,
        isRead: false
      });
    } catch (notificationError) {
      console.error('خطأ في إنشاء الإشعار:', notificationError);
    }

    res.status(201).json({ 
      success: true, 
      order: newOrder,
      orderNumber: newOrder.orderNumber || newOrder.id
    });
  } catch (error) {
    console.error("خطأ في إنشاء الطلب:", error);
    res.status(500).json({ error: "خطأ في إنشاء الطلب" });
  }
});

// جلب جميع الطلبات مع فلترة
router.get("/", async (req, res) => {
  try {
    const { status, driverId, restaurantId, customerId } = req.query;
    
    let orders = await storage.getOrders();
    
    // تطبيق المرشحات
    if (status && status !== 'all') {
      orders = orders.filter(order => order.status === status);
    }
    
    if (driverId) {
      orders = orders.filter(order => order.driverId === driverId);
    }
    
    if (restaurantId) {
      orders = orders.filter(order => order.restaurantId === restaurantId);
    }
    
    if (customerId) {
      orders = orders.filter(order => order.customerId === customerId);
    }
    
    // ترتيب حسب تاريخ الإنشاء (الأحدث أولاً)
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(orders);
  } catch (error) {
    console.error("خطأ في جلب الطلبات:", error);
    res.status(500).json({ error: "خطأ في جلب الطلبات" });
  }
});

// جلب طلب محدد
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const order = await storage.getOrder(id);
    
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }
    
    res.json(order);
  } catch (error) {
    console.error("خطأ في جلب الطلب:", error);
    res.status(500).json({ error: "خطأ في جلب الطلب" });
  }
});

// تحديث حالة الطلب
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedOrder = await storage.updateOrder(id, {
      ...updateData,
      updatedAt: new Date()
    });
    
    if (!updatedOrder) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }
    
    // إنشاء إشعار عند تغيير الحالة
    if (updateData.status) {
      try {
        const statusMessages = {
          confirmed: 'تم تأكيد طلبك',
          preparing: 'جاري تحضير طلبك',
          ready: 'طلبك جاهز للاستلام',
          picked_up: 'تم استلام طلبك من المطعم',
          on_way: 'طلبك في الطريق إليك',
          delivered: 'تم تسليم طلبك بنجاح',
          cancelled: 'تم إلغاء طلبك'
        };
        
        const message = statusMessages[updateData.status as keyof typeof statusMessages] || 'تم تحديث حالة طلبك';
        
        await storage.createNotification({
          type: 'order_update',
          title: 'تحديث الطلب',
          message,
          recipientType: 'customer',
          recipientId: updatedOrder.customerId || updatedOrder.customerPhone,
          orderId: id,
          isRead: false
        });
      } catch (notificationError) {
        console.error('خطأ في إنشاء الإشعار:', notificationError);
      }
    }
    
    res.json(updatedOrder);
  } catch (error) {
    console.error("خطأ في تحديث الطلب:", error);
    res.status(500).json({ error: "خطأ في تحديث الطلب" });
  }
});

// تتبع الطلب
router.get("/:id/track", async (req, res) => {
  try {
    const { id } = req.params;
    const order = await storage.getOrder(id);
    
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    // إنشاء بيانات التتبع بناءً على حالة الطلب
    const tracking = [];
    const baseTime = new Date(order.createdAt);
    
    // إضافة خطوات التتبع حسب الحالة
    const statusSteps = [
      { status: 'pending', message: 'تم استلام الطلب', offset: 0 },
      { status: 'confirmed', message: 'تم تأكيد الطلب من المطعم', offset: 5 },
      { status: 'preparing', message: 'جاري تحضير الطلب', offset: 10 },
      { status: 'ready', message: 'الطلب جاهز للاستلام', offset: 20 },
      { status: 'picked_up', message: 'تم استلام الطلب من المطعم', offset: 25 },
      { status: 'on_way', message: 'الطلب في الطريق إليك', offset: 30 },
      { status: 'delivered', message: 'تم تسليم الطلب بنجاح', offset: 45 }
    ];

    const currentStatusIndex = statusSteps.findIndex(step => step.status === order.status);
    
    for (let i = 0; i <= currentStatusIndex; i++) {
      const step = statusSteps[i];
      tracking.push({
        id: (i + 1).toString(),
        status: step.status,
        message: step.message,
        timestamp: new Date(baseTime.getTime() + step.offset * 60000),
        createdByType: i === 0 ? 'system' : i <= 2 ? 'restaurant' : 'driver'
      });
    }
    
    // تحليل العناصر من JSON
    let parsedItems = [];
    try {
      parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    } catch (e) {
      parsedItems = [];
    }

    // جلب بيانات السائق إذا كان مُعيَّن
    let driverInfo = null;
    if (order.driverId) {
      const driver = await storage.getDriver(order.driverId);
      if (driver) {
        driverInfo = {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          currentLocation: driver.currentLocation
        };
      }
    }

    res.json({
      order: {
        ...order,
        items: parsedItems,
        total: parseFloat(order.totalAmount || order.total || '0')
      },
      tracking,
      driver: driverInfo
    });
  } catch (error) {
    console.error("خطأ في تتبع الطلب:", error);
    res.status(500).json({ error: "خطأ في تتبع الطلب" });
  }
});

// تعيين سائق للطلب
router.put("/:id/assign-driver", async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;
    
    if (!driverId) {
      return res.status(400).json({ error: "معرف السائق مطلوب" });
    }

    // التحقق من وجود الطلب
    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    // التحقق من أن الطلب متاح للتعيين
    if (order.driverId) {
      return res.status(400).json({ error: "الطلب مُعيَّن لسائق آخر بالفعل" });
    }

    // التحقق من وجود السائق
    const driver = await storage.getDriver(driverId);
    if (!driver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    // تحديث الطلب
    const updatedOrder = await storage.updateOrder(id, {
      driverId,
      status: 'preparing',
      updatedAt: new Date()
    });
    
    if (!updatedOrder) {
      return res.status(404).json({ error: "فشل في تحديث الطلب" });
    }
    
    // تحديث حالة السائق إلى مشغول
    await storage.updateDriver(driverId, { isAvailable: false });

    // إنشاء إشعارات
    try {
      // إشعار للعميل
      await storage.createNotification({
        type: 'order_assigned',
        title: 'تم تعيين سائق لطلبك',
        message: `السائق ${driver.name} سيقوم بتوصيل طلبك`,
        recipientType: 'customer',
        recipientId: order.customerId || order.customerPhone,
        orderId: id,
        isRead: false
      });
    } catch (notificationError) {
      console.error('خطأ في إنشاء الإشعارات:', notificationError);
    }

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('خطأ في تعيين السائق:', error);
    res.status(500).json({ error: "خطأ في تعيين السائق" });
  }
});

export default router;