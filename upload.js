//@ts-check
const fs = require('fs');
const {join, extname, basename} = require('path');
const multer = require('multer');
const {randomBytes} = require('crypto');

// const sharp = require('sharp');
const upload_dir = join(__dirname,'public/images/uploads/');
const thumbs_dir = join(__dirname,'public/images/thumbs/');

const save_thumbnail = false;

function MyCustomStorage ({destination}) {
  this.getDestination = destination;
}

// MyCustomStorage.prototype._handleFile = function _handleFile (req, file, cb) {
//   this.getDestination(req, file, async function (err, path) {
//     if (err) return cb(err)

//     let outStream = fs.createWriteStream(path);
//     file.stream.pipe(outStream);      

//     outStream.on('error', cb);
//     outStream.on('finish',  async () => {
//         try{
//             let filename = basename(path);     
//             await sharp(path).resize({height:250 }).toFile(thumbs_dir+filename);
//             cb(null, {path, size: outStream.bytesWritten});
//         }catch(e){
//             console.log(e);
//         }
//     });
//   })
// }

// MyCustomStorage.prototype._removeFile = function _removeFile (req, file, cb) {
//   fs.unlink(file.path, cb);
// }

const generate_filename = (file) => randomBytes(24).toString('hex') + extname(file.originalname);

const save = multer.diskStorage({
    destination:function(req, file, cb){cb(null, upload_dir);},
    filename: function(req, file, cb){cb(null, generate_filename(file));}
});

const saveAndMakeThumb = new MyCustomStorage({
    destination:function(req, file, cb){cb(null, upload_dir + generate_filename(file));},
});

const storage = save_thumbnail ? saveAndMakeThumb : save;


module.exports = multer({storage});