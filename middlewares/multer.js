const multer = require('multer');
const path = require('path')


const storage = multer.memoryStorage();

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, './uploads');
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now()+'--'+file.originalname);
//   }
// });


// const fileFilter = (req, file, cb) => {
//   if (file.mimetype === 'application/pdf') {
//     cb(null, true);
//   } else {
//     cb(new Error('Seuls les fichiers PDF sont acceptés'), false);
//   }
// };

const upload = multer({
  storage,
  //fileFilter,
  //limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = upload;