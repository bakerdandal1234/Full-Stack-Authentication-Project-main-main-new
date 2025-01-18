const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/Schema");
const bcrypt = require("bcrypt");
const { sendVerificationEmail } = require("../utils/emailService");
const { sendResetPasswordEmail } = require("../utils/emailService");
const { verifyToken } = require("../middleware");
const { authenticateUser } = require("../middleware");

const {
  sendError,
  handleUnauthorized,
  handleValidationError,
  handleServerError,
} = require("../utils/errorHandler");

// التحقق من صحة بيانات التسجيل
const signupValidation = [
  body("username")
    .trim()
    .isLength({ min: 3 })
    .withMessage("username must be at least 3 charactes Long!"),
  body("email").isEmail().withMessage("email is not valid"),
  body("password")
    .isLength({ min: 6 })
    .withMessage(" password must be at least 6 characters Long! "),
];

router.get('/', (req, res) => {
  res.send("hello world")
})

// التسجيل
router.post("/signup", signupValidation, async (req, res) => {
  try {
    // التحقق من وجود أخطاء في التحقق
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation error in signup:", errors.array());
      return handleValidationError(res, errors);
    }

    const { username, email, password } = req.body;

    // التحقق من وجود المستخدم
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        console.log("User with this email already exists:", email);
        return handleValidationError(res, "user with this email already exists")
      }
      console.log("User with this username already exists:", username);
      return handleValidationError(res, "user with this username aleady exists");
    }

    // إنشاء رمز التحقق
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry =Date.now() +3600000 // 1 hour
    // إنشاء المستخدم
    const user = new User({
      username,
      email,
      password,
      verificationTokenExpiry,
      verificationToken,
    });

    await user.save();

    console.log("User created successfully:", { username, email });

    // إرسال بريد التحقق
    // await sendVerificationEmail(email, verificationToken);

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // إعداد الكوكيز
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

   

   
    res.status(201).json({
      success: true,
      message: "تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني",
      accessToken: token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });

  } catch (error) {
    console.error("Error signing up:", error);
    handleServerError(res, error);
  }
});

// تسجيل الدخول
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt for:", email);

    // البحث عن المستخدم
    const user = await User.findOne({ email });
    console.log("Found user:", user ? "Yes" : "No");

    if (!user) {
      console.log("User not found during login:", email);
      return handleUnauthorized(res, "user or password does not match");
    }

    // التحقق من كلمة المرور
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      console.log("Invalid password for user:", email);
      return handleUnauthorized(res, "email or password does not match");
    }

    // if(!user.isVerified){
    //   console.log("Unverified user attempt to login:", email);
    //   return handleUnauthorized(res,"please verify your account")
    // }

    console.log("Login successful:", email);
    // إنشاء التوكن
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // إعداد الكوكيز
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

   

    
    res.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      accessToken: token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    handleServerError(res, error);
  }
});

// تسجيل الخروج
router.post("/logout", authenticateUser, (req, res) => {
  try {
    // مسح جميع الكوكيز
    res.clearCookie("token");
    res.clearCookie("refreshToken");
    res.json({
      success: true,
      message: "تم تسجيل الخروج بنجاح",
    });
  } catch (error) {
    console.error('Error logging out:', error);
    handleServerError(res, error);
  }
});

// تحديث التوكن
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return handleUnauthorized(res, "لم يتم العثور على توكن التحديث");
    }

    // البحث عن المستخدم بواسطة توكن التحديث
    const user = await User.findOne({ refreshToken });
    if (!user) {
      return handleUnauthorized(res, "توكن التحديث غير صالح");
    }

    // إنشاء توكن جديد
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // تعيين التوكن الجديد في الكوكيز
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

   

    res.json({
      success: true,
      message: "تم تحديث التوكن بنجاح",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    handleServerError(res, error);
  }
});

// إعادة إرسال رمز التحقق
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    // البحث عن المستخدم
    const user = await User.findOne({ email });
    if (!user) {
      return sendError(res, "البريد الإلكتروني غير مسجل");
    }

    if (user.isVerified) {
      return sendError(res, "الحساب مفعل بالفعل");
    }

    // إنشاء رمز تحقق جديد
    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = verificationToken;
    await user.save();

    // إرسال بريد التحقق
    await sendVerificationEmail(email, verificationToken);



    res.json({
      success: true,
      message: "تم إرسال رمز التحقق. يرجى التحقق من بريدك الإلكتروني",
    });
  } catch (error) {
    console.error('Error resending verification email:', error);
    handleServerError(res, error);
  }
});

// التحقق من البريد الإلكتروني
router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // البحث عن المستخدم بواسطة رمز التحقق
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return sendError(res, "رمز التحقق غير صالح");
    }

    // تفعيل الحساب
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

  

    res.json({
      success: true,
      message: "تم تفعيل الحساب بنجاح",
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    handleServerError(res, error);
  }
});

// طلب إعادة تعيين كلمة المرور
router.post("/reset-password", async (req, res) => {
  try {
    const { email } = req.body;

    // البحث عن المستخدم
    const user = await User.findOne({ email });
    if (!user) {
      return sendError(res, "البريد الإلكتروني غير مسجل");
    }

    // إنشاء رمز إعادة التعيين
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // ساعة واحدة

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // إرسال بريد إعادة التعيين
    await sendResetPasswordEmail(email, resetToken);

   

    res.json({
      success: true,
      message: "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني",
    });
  } catch (error) {
    console.error('Error sending reset password email:', error);
    handleServerError(res, error);
  }
});

// التحقق من رمز إعادة التعيين
router.get("/verify-reset-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // البحث عن المستخدم بواسطة رمز إعادة التعيين
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return sendError(res, "رمز إعادة التعيين غير صالح أو منتهي الصلاحية");
    }

    res.json({
      success: true,
      message: "رمز إعادة التعيين صالح",
    });
  } catch (error) {
    console.error('Error verifying reset token:', error);
    handleServerError(res, error);
  }
});

// إعادة تعيين كلمة المرور
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // البحث عن المستخدم بواسطة رمز إعادة التعيين
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return sendError(res, "رمز إعادة التعيين غير صالح أو منتهي الصلاحية");
    }

    // تحديث كلمة المرور
    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

   

    res.json({
      success: true,
      message: "تم إعادة تعيين كلمة المرور بنجاح",
    });
  } catch (error) {
    console.error('Error reseting password:', error);
    handleServerError(res, error);
  }
});

module.exports = router;
