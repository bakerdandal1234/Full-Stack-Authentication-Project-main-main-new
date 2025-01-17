import React, { useState } from 'react';
import axios from 'axios';
import { Box, CircularProgress, IconButton ,Typography} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTheme } from '@mui/material/styles';
const ImageUpload = ({ onImageUpload, multiple = false }) => {
    const [loading, setLoading] = useState(false);
    const [previews, setPreviews] = useState([]);
    const [uploadedImages, setUploadedImages] = useState([]);
    const theme =useTheme();
    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        // التحقق من نوع وحجم الملفات
        const validFiles = files.filter(file => {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            const maxSize = 5 * 1024 * 1024; // 5 ميجابايت
            
            if (!validTypes.includes(file.type)) {
                alert('نوع الملف غير مدعوم. الرجاء استخدام JPG أو PNG أو WebP');
                return false;
            }
            
            if (file.size > maxSize) {
                alert('حجم الملف كبير جداً. الحد الأقصى هو 5 ميجابايت');
                return false;
            }
            
            return true;
        });

        if (!validFiles.length) return;

        // إنشاء معاينات للصور
        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviews(prev => [...prev, reader.result]);
            };
            reader.readAsDataURL(file);
        });

        // رفع الصور
        try {
            setLoading(true);
            
            const uploadPromises = validFiles.map(file => {
                const formData = new FormData();
                formData.append('file', file);
                
                return axios.post('http://localhost:3000/api/ecommerce/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    withCredentials: true
                });
            });

            const responses = await Promise.all(uploadPromises);
            const newImages = responses.map(response => response.data.data.url);
            
            setUploadedImages(prev => [...prev, ...newImages]);
            onImageUpload(multiple ? [...uploadedImages, ...newImages] : newImages[0]);
            
        } catch (error) {
            console.error('خطأ في رفع الصور:', error);
            alert(error.response?.data?.message || 'فشل في رفع الصور');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteImage = (index) => {
        const newPreviews = previews.filter((_, i) => i !== index);
        const newUploadedImages = uploadedImages.filter((_, i) => i !== index);
        setPreviews(newPreviews);
        setUploadedImages(newUploadedImages);
        onImageUpload(multiple ? newUploadedImages : null);
    }

    return (
        <Box className="image-upload-container" dir="rtl">
            <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                multiple={multiple}
                style={{ display: 'none' }}
                id="image-upload"
                disabled={loading}
            />
            <label 
                htmlFor="image-upload" 
                className={`upload-label ${loading ? 'loading' : ''}`}
                style={{
                    border: '2px dashed #ccc',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginBottom: '10px',
                    display: 'block',
                    backgroundColor: theme.palette.background.default,
                    minHeight: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CircularProgress size={20} />
                        <span>جاري الرفع...</span>
                    </Box>
                ) : (
                    // <span>{multiple ? 'انقر لرفع الصور' : 'انقر لرفع صورة'}</span>
                    <Typography 
                    variant="h3" 
                    sx={{ color: theme.palette.text.primary}} 
                  >
                    {multiple ? 'انقر لرفع الصور' : 'انقر لرفع صورة'}
                  </Typography>
                )}
            </label>
            
            {previews.length > 0 && (
                <Box className="image-previews" sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '16px',
                    mt: 2
                }}>
                    {previews.map((preview, index) => (
                        <Box
                            key={index}
                            sx={{
                                position: 'relative',
                                paddingTop: '100%',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                        >
                            <img 
                                src={preview}
                                alt={`معاينة ${index + 1}`}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                            />
                            <IconButton
                                onClick={() => handleDeleteImage(index)}
                                sx={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    backgroundColor: 'rgba(255,255,255,0.8)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.9)'
                                    }
                                }}
                                size="small"
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default ImageUpload;
