import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  TextField,
  Stack,
  Rating,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Favorite as FavoriteIcon,
  Share as ShareIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    discount: '0'
  });
  const [categories, setCategories] = useState([]); // Added categories state

  useEffect(() => {
    fetchProducts();
    fetchCategories(); // Added fetchCategories function call
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/ecommerce/products', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('فشل في جلب المنتجات');
      }

      const data = await response.json();
      if (data.success) {
        setProducts(data.data);
      } else {
        throw new Error(data.message || 'حدث خطأ أثناء جلب المنتجات');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => { // Added fetchCategories function
    try {
      const response = await fetch('http://localhost:3000/api/ecommerce/categories', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('فشل في جلب التصنيفات');
      }

      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      } else {
        throw new Error(data.message || 'حدث خطأ أثناء جلب التصنيفات');
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleEditClick = (product) => {
    setEditProduct({
      id: product._id,
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category.name
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault(); // منع السلوك الافتراضي للنموذج
    try {
      console.log('بدء عملية التحديث...');
      
      const updateData = {
        name: editProduct.name,
        description: editProduct.description,
        price: editProduct.price,
        stock: editProduct.stock,
        category: editProduct.category
      };

      console.log('البيانات المراد إرسالها:', updateData);

      const response = await fetch(`http://localhost:3000/api/ecommerce/products/${editProduct.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updateData)
      }).catch(error => {
        console.error('خطأ في الاتصال:', error);
        throw new Error('فشل الاتصال بالخادم');
      });

      console.log('حالة الاستجابة:', response.status);
      
      if (!response.ok) {
        throw new Error(`فشل الطلب: ${response.status}`);
      }

      const data = await response.json().catch(error => {
        console.error('خطأ في تحليل البيانات:', error);
        throw new Error('فشل في تحليل البيانات من الخادم');
      });

      console.log('بيانات الاستجابة:', data);

      if (data.success) {
        console.log('تم التحديث بنجاح');
        setProducts((prevProducts) =>
          prevProducts.map((p) => (p._id === editProduct.id ? data.data : p))
        );
        setEditDialogOpen(false);
        setEditProduct({
          id: '',
          name: '',
          description: '',
          price: '',
          stock: '',
          category: ''
        });
        alert('تم تحديث المنتج بنجاح');
      } else {
        throw new Error(data.message || 'فشل تحديث المنتج');
      }
    } catch (error) {
      console.error('تفاصيل الخطأ الكاملة:', error);
      alert(error.message || 'حدث خطأ أثناء تحديث المنتج');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/ecommerce/products/${productToDelete._id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('فشل في حذف المنتج');
      }

      const data = await response.json();
      if (data.success) {
        setProducts(products.filter(p => p._id !== productToDelete._id));
        alert('تم حذف المنتج بنجاح');
      } else {
        throw new Error(data.message || 'حدث خطأ أثناء حذف المنتج');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('حدث خطأ أثناء حذف المنتج: ' + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography color="error" variant="h6">{error}</Typography>
      </Box>
    );
  }

  if (products.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography variant="h6" color="textSecondary">
          لا توجد منتجات متاحة حالياً
        </Typography>
      </Box>
    );
  }

  const cardStyle = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    backgroundColor: '#1e2a3a',
    borderRadius: '10px',
    padding: '1rem',
    transition: 'transform 0.3s ease',
    '&:hover': {
      transform: 'translateY(-5px)'
    }
  };

  const imageStyle = {
    width: '100%',
    height: '200px', 
    objectFit: 'cover', 
    borderRadius: '8px',
    marginBottom: '1rem'
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {products.map((product) => (
          <Grid item xs={12} sm={6} md={4} key={product._id}>
            <Card sx={cardStyle}>
              <CardMedia
                component="img"
                image={product.images && product.images.length > 0 
                  ? product.images[0]  
                  : 'https://via.placeholder.com/300'}
                alt={product.name}
                sx={imageStyle}
              />
              {isAuthenticated && (
                <Box 
                  sx={{ 
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    display: 'flex',
                    gap: 1,
                    zIndex: 2
                  }}
                >
                  <IconButton
                    color="primary"
                    size="small"
                    onClick={() => handleEditClick(product)}
                    sx={{
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                      '&:hover': {
                        bgcolor: 'primary.main',
                        color: 'white'
                      }
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => handleDeleteClick(product)}
                    sx={{
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                      '&:hover': {
                        bgcolor: 'error.main',
                        color: 'white'
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              <CardContent>
                <Typography 
                  variant="h6" 
                  component="h2"
                  sx={{ 
                    fontWeight: 600,
                    color: 'primary.main',
                    mb: 1
                  }}
                >
                  {product.name}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    minHeight: '2.5em'
                  }}
                >
                  {product.description}
                </Typography>
                <Box sx={{ mt: 'auto' }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 'bold',
                      color: product.discount ? 'error.main' : 'text.primary',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1
                    }}
                  >
                    ${product.price ? (product.discount ? (product.price * (1 - product.discount / 100)).toFixed(2) : product.price.toFixed(2)) : '0.00'}
                    {product.discount > 0 && product.price && (
                      <Typography 
                        component="span" 
                        sx={{ 
                          textDecoration: 'line-through', 
                          color: 'text.secondary',
                          fontSize: '0.875rem'
                        }}
                      >
                        ${product.price.toFixed(2)}
                      </Typography>
                    )}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box 
                      sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        bgcolor: product.stock > 0 ? 'success.soft' : 'error.soft',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1
                      }}
                    >
                      <Typography 
                        variant="caption"
                        sx={{ 
                          color: product.stock > 0 ? 'success.main' : 'error.main',
                          fontWeight: 600
                        }}
                      >
                        {product.stock > 0 ? 'متوفر' : 'غير متوفر'}
                      </Typography>
                      <Typography 
                        variant="caption"
                        sx={{ 
                          color: product.stock > 0 ? 'success.main' : 'error.main'
                        }}
                      >
                        ({product.stock})
                      </Typography>
                    </Box>
                    <Typography 
                      variant="caption"
                      sx={{ 
                        color: 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                      }}
                    >
                      <span>التصنيف:</span>
                      <span style={{ color: 'primary.main', fontWeight: 600 }}>
                        {product.category?.name || 'غير مصنف'}
                      </span>
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* نافذة تأكيد الحذف */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          تأكيد الحذف
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            هل أنت متأكد من حذف المنتج "{productToDelete?.name}"؟
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            لا يمكن التراجع عن هذا الإجراء.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            إلغاء
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* نافذة تعديل المنتج */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        aria-labelledby="edit-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="edit-dialog-title">
          تعديل المنتج
        </DialogTitle>
        <form onSubmit={handleEditSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="اسم المنتج"
                value={editProduct.name}
                onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                fullWidth
                required
              />

              <TextField
                label="الوصف"
                value={editProduct.description}
                onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
                fullWidth
                multiline
                rows={4}
                required
              />

              <TextField
                label="السعر"
                type="number"
                value={editProduct.price}
                onChange={(e) => setEditProduct({ ...editProduct, price: e.target.value })}
                fullWidth
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />

              <TextField
                label="المخزون"
                type="number"
                value={editProduct.stock}
                onChange={(e) => setEditProduct({ ...editProduct, stock: e.target.value })}
                fullWidth
                required
              />

              <TextField
                label="التصنيف"
                value={editProduct.category}
                onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value })}
                fullWidth
                required
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" color="primary" variant="contained">
              حفظ التغييرات
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
}