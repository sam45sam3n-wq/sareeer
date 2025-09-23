import { Router } from 'express';
import dbStorage from '../db.js';

const router = Router();

// الحصول على جميع الطلبات
router.get('/', async (req, res) => {
  try {
    const orders = await db.getOrders();
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// الحصول على طلب محدد بالرقم
router.get('/:id', async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// إنشاء طلب جديد
router.post('/', async (req, res) => {
  try {
    const orderData = req.body;
    
    // التحقق من البيانات المطلوبة
    if (!orderData.customerId || !orderData.items || !orderData.totalAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newOrder = await db.createOrder(orderData);
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// تحديث طلب
router.put('/:id', async (req, res) => {
  try {
    const updatedOrder = await db.updateOrder(req.params.id, req.body);
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// حذف طلب
router.delete('/:id', async (req, res) => {
  try {
    const success = await db.deleteOrder(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// الحصول على تتبع الطلب
router.get('/:id/tracking', async (req, res) => {
  try {
    const tracking = await db.getOrderTracking(req.params.id);
    res.json(tracking);
  } catch (error) {
    console.error('Error fetching order tracking:', error);
    res.status(500).json({ error: 'Failed to fetch order tracking' });
  }
});

// إضافة تحديث لتتبع الطلب
router.post('/:id/tracking', async (req, res) => {
  try {
    const trackingData = {
      orderId: req.params.id,
      status: req.body.status,
      location: req.body.location,
      notes: req.body.notes,
      timestamp: new Date()
    };

    // التحقق من البيانات المطلوبة
    if (!trackingData.status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const newTracking = await db.createOrderTracking(trackingData);
    res.status(201).json(newTracking);
  } catch (error) {
    console.error('Error creating order tracking:', error);
    res.status(500).json({ error: 'Failed to create order tracking' });
  }
});

// الحصول على طلبات العميل
router.get('/customer/:customerId', async (req, res) => {
  try {
    const orders = await db.getOrdersByCustomerId(req.params.customerId);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ error: 'Failed to fetch customer orders' });
  }
});

// تحديث حالة الطلب
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updatedOrder = await db.updateOrderStatus(req.params.id, status);
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

export default router;
