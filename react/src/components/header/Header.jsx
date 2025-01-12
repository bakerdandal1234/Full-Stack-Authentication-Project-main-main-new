/*************  ✨ Codeium Command 🌟  *************/
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ColorModeContext } from "../../pages/theme";
import api from '../../utils/axios';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Button,
  useTheme,
  Stack,
  Modal,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  DarkModeOutlined,
  LightModeOutlined,
  Logout,
  Login,
  Add as AddIcon
} from '@mui/icons-material';
import ImageUpload from '../ImageUpload';

const Header = () => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const colorMode = useContext(ColorModeContext);
  const theme = useTheme();
  const [openModal, setOpenModal] = useState(false);
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    images: []
  });

  const handleModalOpen = () => setOpenModal(true);
  const handleModalClose = () => {
    setOpenModal(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProductData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', productData.name);
      formData.append('description', productData.description);
      formData.append('price', productData.price);
      formData.append('category', productData.category);
      formData.append('stock', productData.stock);
      
      // إضافة الصور
      if (productData.images && productData.images.length > 0) {
        productData.images.forEach(imageUrl => {
          formData.append('images', JSON.stringify({ url: imageUrl }));
        });
      }

      const response = await fetch('http://localhost:3000/api/ecommerce/products', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const responseData = await response.json();
      console.log('Response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.message || 'حدث خطأ أثناء إضافة المنتج');
      }

      // إغلاق النموذج وإعادة تعيين البيانات
      handleModalClose();
      setProductData({
        name: '',
        description: '',
        price: '',
        category: '',
        stock: '',
        images: []
      });

    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <AppBar sx={{
        position: "static"
      }}>
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            E-commerce
          </Typography>

          <Stack direction="row" spacing={2}>
            <IconButton color="inherit" onClick={colorMode.toggleColorMode}>
              {theme.palette.mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
            </IconButton>

            {isAdmin && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={handleModalOpen}
              >
                إضافة منتج
              </Button>
            )}

            {user ? (
              <Button
                color="inherit"
                startIcon={<Logout />}
                onClick={handleLogout}
              >
                تسجيل الخروج
              </Button>
            ) : (
              <>
                <Button
                  color="inherit"
                  startIcon={<Login />}
                  component={Link}
                  to="/login"
                >
                  تسجيل الدخول
                </Button> 
                <Button
                  color="inherit"
                  startIcon={<Login />}
                  component={Link}
                  to="/login"
                >
                  انشاء حساب
                </Button>
              </>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      <Modal
        open={openModal}
        onClose={handleModalClose}
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <Typography id="modal-title" variant="h6" component="h2" mb={2}>
            إضافة منتج جديد
          </Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                name="name"
                label="اسم المنتج"
                value={productData.name}
                onChange={handleInputChange}
                fullWidth
                required
              />
              <TextField
                name="description"
                label="وصف المنتج"
                value={productData.description}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={4}
                required
              />
              <TextField
                name="price"
                label="السعر"
                type="number"
                value={productData.price}
                onChange={handleInputChange}
                fullWidth
                required
              />
              <TextField
                name="category"
                label="الفئة"
                value={productData.category}
                onChange={handleInputChange}
                fullWidth
                required
              />
              <TextField
                name="stock"
                label="المخزون"
                type="number"
                value={productData.stock}
                onChange={handleInputChange}
                fullWidth
                required
              />
              <Box sx={{ mb: 2 }}>
                <ImageUpload
                  multiple={true}
                  onImageUpload={(imagesData) => {
                    setProductData(prev => ({
                      ...prev,
                      images: imagesData
                    }));
                  }}
                />
              </Box>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
              >
                إضافة المنتج
              </Button>
            </Stack>
          </form>
        </Box>
      </Modal>
    </>
  );
};

export default Header;
