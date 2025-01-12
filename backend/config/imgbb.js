const axios = require('axios');
const FormData = require('form-data');

const uploadImage = async (imageBuffer, filename) => {
    try {
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

        return {
            success: true,
            data: {
                url: response.data.data.url,
                delete_url: response.data.data.delete_url,
                thumb: response.data.data.thumb.url
            }
        };

    } catch (error) {
        console.error('خطأ في رفع الصورة:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = { uploadImage };
