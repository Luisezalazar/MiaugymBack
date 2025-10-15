//middelware (multer)

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDNAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

// Configuración del storage de multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'products', // Carpeta donde se guardarán las imágenes
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    },
});

// Exportar el middleware
const upload = multer({ storage });
module.exports = upload;