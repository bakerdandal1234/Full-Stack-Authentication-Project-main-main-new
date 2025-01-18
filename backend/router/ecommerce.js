const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Product, Category, Order } = require('../models/ecommerceSchema');
const { authenticateUser } = require('../middleware');
const { handleServerError, handleNotFound } = require('../utils/errorHandler');
const { uploadImage } = require('../config/imgbb');

// إعداد Multer للتخزين المؤقت في الذاكرة
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 ميجابايت
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('نوع الملف غير مدعوم'), false);
        }
        cb(null, true);
    }
});

// تحسين مسار رفع الصور
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'لم يتم تحديد ملف للرفع'
            });
        }

        const result = await uploadImage(req.file.buffer, req.file.originalname);

        if (!result.success) {
            console.error('حدث خطأ أثناء رفع الصورة:', result.error);
            return res.status(500).json({
                success: false,
                message: 'حدث خطأ أثناء رفع الصورة',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: {
                url: result.data.url,
                thumb: result.data.thumb,
                delete_url: result.data.delete_url
            }
        });

    } catch (error) {
        console.error('خطأ في رفع الصورة:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء رفع الصورة',
            error: error.message
        });
    }
});

// ============================================================================
// مسارات المنتجات (Products Routes)
// ============================================================================

// الحصول على جميع المنتجات
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find().populate('category');
        console.log(`Retrieved ${products.length} products`);
        res.json({ success: true, data: products });
    } catch (error) {
        console.error('Error getting products:', error);
        handleServerError(res, error);
    }
});

// إنشاء منتج جديد
router.post('/products', authenticateUser, upload.array('images'), async (req, res) => {
    try {
        // معالجة الصور إذا كانت موجودة في body
        let images = [];
        if (req.body.images) {
            try {
                // إذا كانت الصور مرسلة كـ JSON string
                if (typeof req.body.images === 'string') {
                    const imageData = JSON.parse(req.body.images);
                    if (imageData.url && typeof imageData.url === 'object' && imageData.url.url) {
                        images.push(imageData.url.url);
                    } else if (imageData.url) {
                        images.push(imageData.url);
                    }
                }
                // إذا كانت الصور مرسلة كمصفوفة
                else if (Array.isArray(req.body.images)) {
                    images = req.body.images.map(img => {
                        if (typeof img === 'string') {
                            try {
                                const imageData = JSON.parse(img);
                                return imageData.url && typeof imageData.url === 'object'
                                    ? imageData.url.url
                                    : imageData.url;
                            } catch {
                                return img;
                            }
                        }
                        return img.url && typeof img.url === 'object' ? img.url.url : img.url || img;
                    });
                }
            } catch (error) {
                console.error('Error parsing images:', error);
            }
        }

        // البحث عن التصنيف
        let category = await Category.findOne({ name: req.body.category });
        if (!category) {
            category = await Category.create({
                name: req.body.category,
                description: `تصنيف ${req.body.category}`
            });
        }

        const productData = {
            name: req.body.name,
            description: req.body.description,
            price: parseFloat(req.body.price),
            category: category._id,
            stock: parseInt(req.body.stock),
            images: images.filter(url => url) // تصفية القيم الفارغة
        };


        const product = await Product.create(productData);
        const populatedProduct = await Product.findById(product._id).populate('category');

        console.log('Product created successfully:', { name: product.name, id: product._id });
        res.status(201).json({
            success: true,
            data: populatedProduct
        });

    } catch (error) {
        console.error('Error creating product:', error);
        handleServerError(res, error);
    }
});

// تحديث منتج
router.put('/products/:id', authenticateUser, async (req, res) => {
    try {
        const productId = req.params.id;
        // التحقق من المصادقة
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }

        // البحث عن المنتج
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
        }

        // البحث عن التصنيف أو استخدام التصنيف الحالي
        let categoryId = existingProduct.category;
        if (req.body.category) {
            const category = await Category.findOne({ name: req.body.category });
            if (!category) {
                // إنشاء تصنيف جديد فقط إذا تم توفير اسم التصنيف
                const newCategory = await Category.create({
                    name: req.body.category,
                    description: `تصنيف ${req.body.category}`
                });
                categoryId = newCategory._id;
            } else {
                categoryId = category._id;
            }
        }

        const updateData = {
            name: req.body.name || existingProduct.name,
            description: req.body.description || existingProduct.description,
            price: parseFloat(req.body.price) || existingProduct.price,
            stock: parseInt(req.body.stock) || existingProduct.stock,
            category: categoryId,
            images: existingProduct.images // الاحتفاظ بالصور القديمة
        };

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            updateData,
            { new: true }
        ).populate('category');

        console.log('Product updated successfully:', { id: updatedProduct._id, name: updatedProduct.name });
        res.json({
            success: true,
            data: updatedProduct,
        });
    } catch (error) {
        console.error('حدث خطأ أثناء تحديث المنتج:', error);
        handleServerError(res, error);
    }
});

// حذف منتج
router.delete('/products/:id', authenticateUser, async (req, res) => {
    try {
        const productId = req.params.id;

        // التحقق من المصادقة
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'غير مصرح'
            });
        }

        // البحث عن المنتج
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'المنتج غير موجود'
            });
        }

        // حذف المنتج
        await Product.findByIdAndDelete(productId);

        console.log('Product deleted successfully:', { id: productId });
        res.json({
            success: true,
            message: 'تم حذف المنتج بنجاح'
        });

    } catch (error) {
        console.error('Error deleting product:', error)
        handleServerError(res, error);
    }
});

// ============================================================================
// مسارات التصنيفات (Categories Routes)
// ============================================================================

// الحصول على جميع التصنيفات
router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find();
        console.log(`Retrieved ${categories.length} categories`);
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Error getting categories:', error);
        handleServerError(res, error);
    }
});

// إضافة تصنيف جديد (للمشرفين فقط)
router.post('/categories', authenticateUser, async (req, res) => {
    try {
        // التحقق من وجود المستخدم وأنه مسجل الدخول
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'يجب تسجيل الدخول أولاً'
            });
        }

        // التحقق من صلاحيات المستخدم
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بإضافة تصنيفات'
            });
        }

        const category = new Category(req.body);
        await category.save();
        console.log('Category created successfully:', { name: category.name, id: category._id });
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        console.error('Error adding category:', error);
        handleServerError(res, error);
    }
});

// ============================================================================
// مسارات الطلبات (Orders Routes)
// ============================================================================

// إنشاء طلب جديد
router.post('/orders', authenticateUser, async (req, res) => {
    try {
        // التحقق من وجود المستخدم وأنه مسجل الدخول
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'يجب تسجيل الدخول أولاً'
            });
        }

        const order = new Order({
            ...req.body,
            user: req.user._id
        });
        await order.save();
        console.log('New order created:', { orderId: order._id, userId: req.user._id });
        res.status(201).json({ success: true, data: order });
    } catch (error) {
        console.error('Error adding order', error);
        handleServerError(res, error);
    }
});

// الحصول على طلبات المستخدم
router.get('/orders/my-orders', authenticateUser, async (req, res) => {
    try {
        // التحقق من وجود المستخدم وأنه مسجل الدخول
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'يجب تسجيل الدخول أولاً'
            });
        }

        const orders = await Order.find({ user: req.user._id })
            .populate('products.product');
        console.log(`Retrieved ${orders.length} orders for user ${req.user._id}`);
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('Error getting orders:', error);
        handleServerError(res, error);
    }
});

// تحديث حالة الطلب (للمشرفين فقط)
router.put('/orders/:id/status', authenticateUser, async (req, res) => {
    try {
        // التحقق من وجود المستخدم وأنه مسجل الدخول
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'يجب تسجيل الدخول أولاً'
            });
        }

        // التحقق من صلاحيات المستخدم
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بتعديل حالة الطلبات'
            });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        if (!order) return handleNotFound(res, 'الطلب غير موجود');
        console.log('Order status updated successfully:', { orderId: order._id, status: order.status });
        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Error updating order status:', error);
        handleServerError(res, error);
    }
});

// البحث عن المنتجات
router.get('/products/search', async (req, res) => {
    try {
        const { query } = req.query;
        const products = await Product.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        }).populate('category');
        console.log(`Retrieved ${products.length} products matching query "${query}"`);
        res.json({ success: true, data: products });
    } catch (error) {
        console.error('Error searching products:', error);
        handleServerError(res, error);
    }
});

module.exports = router;
