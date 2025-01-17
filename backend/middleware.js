const jwt = require('jsonwebtoken');
const User = require('./models/Schema');

// Verify Access Token Middleware


const findUserById = async (userId) => {
  try {
      const user = await User.findById(userId);
      return user;
  } catch (error) {
      console.error("Error finding user by ID:", error);
      return null; // or throw new Error("User retrieval failed")
  }
};

const verifyToken = async (req, res, next) => {
  try {
      // 1. استخراج الرمز المميز من ملفات تعريف الارتباط أو رأس الطلب
      let token = req.cookies.token;

      if (!token && req.headers.authorization) {
          const authHeader = req.headers.authorization;
           // 2. التحقق من نوع الرمز المميز Bearer
          if (authHeader.startsWith('Bearer ')) {
              token = authHeader.split(' ')[1];
          }else{
              // إذا لم يكن نوع الرمز المميز Bearer، إرسال خطأ
              return res.status(401).json({ message: 'Invalid authorization header format' });
          }
      }


      // 3. التحقق من وجود الرمز المميز
      if (!token) {
          console.warn("No access token found in request.");
          return res.status(401).json({ message: 'Access token required' });
      }

      console.log("Token found:", token);

      try {
          // 4. فك تشفير الرمز المميز باستخدام المفتاح السري
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          console.log("Decoded token:", decoded);

          // 5. البحث عن المستخدم باستخدام الخدمة المنفصلة
          const user = await findUserById(decoded.userId);

          if (!user) {
              console.warn(`User with ID ${decoded.userId} not found.`);
              return res.status(401).json({ message: 'User not found' });
          }

           // 6. إضافة معلومات المستخدم إلى كائن الطلب
          req.user = user;
          next();
      } catch (tokenError) {
          // 7. التعامل مع أخطاء فك تشفير الرمز المميز
          console.error("Token verification failed:", tokenError);

          if (tokenError.name === 'TokenExpiredError') {
              return res.status(401).json({
                  message: 'Access token expired',
                  tokenExpired: true
              });
          }
          return res.status(401).json({ message: 'Invalid access token' });
      }
  } catch (error) {
      // 8. التعامل مع أي خطأ عام آخر
      console.error('Auth middleware error:', error);
      return res.status(500).json({ message: 'Internal server error' });
  }
};


// midddleware to check user use it in logout 
const authenticateUser = (req, res, next) => {
  // 1. محاولة استخراج الرمز من ملفات تعريف الارتباط (cookies)
  let token = req.cookies.refreshToken || req.cookies.token;

  // 2. إذا لم يتم العثور على الرمز في ملفات تعريف الارتباط، نحاول استخراجه من رأس Authorization
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      // إرسال خطأ إذا كان تنسيق الرأس غير صحيح
      return res.status(401).json({ message: 'Unauthorized - Invalid authorization header format' });
    }
  }

  // 3. إذا لم يتم العثور على الرمز في أي مكان، نرسل خطأ
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - No token provided' });
  }

  try {
    // 4. فك تشفير الرمز باستخدام المفتاح السري
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    // 5. تخزين معلومات المستخدم في كائن req.user
    req.user = {
      _id: decoded.userId,
      role: decoded.role,
    };
     
    // 6. تمرير التحكم إلى الدالة الوسيطة التالية أو معالج المسار
    next();
  } catch (error) {
       // 7. التعامل مع أخطاء فك التشفير
        console.error('Token verification error:', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Unauthorized - Access token expired' });
      }
      return res.status(401).json({ message: 'Unauthorized - Invalid token' });
  }
};

module.exports = { verifyToken,authenticateUser };