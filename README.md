#  MiauGym – Backend

**MiauGym** es el servidor backend del proyecto, desarrollado con **Node.js**, **Express** y **Prisma ORM**, que provee una API REST segura para gestionar rutinas, objetivos y archivos multimedia de los usuarios.

---

##  Tecnologías utilizadas

-  **Node.js** – Entorno de ejecución  
-  **Express** – Framework para la creación de la API REST  
-  **Prisma ORM** – Mapeo y gestión de base de datos (PostgreSQL / Supabase)  
-  **JWT Authentication** – Autenticación basada en tokens  
-  **Cloudinary** – Almacenamiento y gestión de imágenes  
-  **Multer** – Middleware para manejo de archivos  
-  **dotenv** – Manejo de variables de entorno  
-  **CORS** – Permite la comunicación entre frontend y backend  

---

##  Funcionalidades principales

-  **Autenticación y registro de usuarios:**  
  Sistema de login y registro seguro con JWT.

-  **Gestión de rutinas:**  
  Creación, edición y eliminación de rutinas de entrenamiento personalizadas.  
  Cada rutina contiene ejercicios con nombre, peso, repeticiones, series y orden.

-  **Gestión de objetivos (Goals):**  
  Registro del peso y objetivo físico del usuario, con posibilidad de subir imágenes corporales para comparar el progreso.

-  **Subida de imágenes con Cloudinary:**  
  Implementación de `multer` para procesar imágenes y `Cloudinary` para alojarlas externamente.

-  **Validación de tokens:**  
  Todas las rutas sensibles están protegidas por un middleware de autenticación.

---

**Como instalar el proyecto**
Para poder instalar el proyecto ejecute los siguientes comandos:

  `npm install`
  `npx prisma init`
  `npx prisma generate`
  `npx prisma migrate dev`

  Recuerde colocar las variables de entorno:

  PORT=PORT
  DATABASE_URL=DATABASE_URL
  CLOUDNAME=CLOUDNAME
  API_KEY=API_KEY
  API_SECRET=API_SECRET
  
