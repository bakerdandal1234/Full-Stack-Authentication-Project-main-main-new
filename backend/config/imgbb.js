const axios = require('axios');
const FormData = require('form-data');

const uploadImage = async (imageBuffer, filename) => {
    try {
        console.error('Uploading image to ImgBB...'); // تسجيل بدء عملية الرفع
        const formData = new FormData();
        formData.append('image', imageBuffer, {
            filename: filename,
            contentType: 'image/jpeg',
        });

        // استخدم مفتاح API من ملف .env
        formData.append('key', process.env.IMGBB_API_KEY);

        const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        console.error('Image uploaded successfully to ImgBB'); // تسجيل نجاح عملية الرفع
        return {
            success: true,
            data: {
                url: response.data.data.url,
                delete_url: response.data.data.delete_url,
                thumb: response.data.data.thumb
            }
        };

    } catch (error) {
        console.error('Error uploading image:', error); // استخدم console لتسجيل الخطأ
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = { uploadImage };
