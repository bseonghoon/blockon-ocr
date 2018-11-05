const express = require('express');
const bodyParser = require('body-parser');
const vision = require('@google-cloud/vision');
const multer = require('multer');
const cors = require('cors');

require('dotenv').config();

const imageType = ['jpg', 'png', 'jpeg'];

const uploadFileType = (mimeType, checkTypeArray) => {
    for (let i = 0; i < checkTypeArray.size; i++) {
        if (mimeType.split('/')[1] !== checkTypeArray[i]) {
            return false;
        }
    }
    return true;
};

const app = express();
const port = 8080;

app.use(cors());
// JSON 바디 파싱
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * google vision api를 사용하여 공인중개사 자격증번호와 이름 추출
 * @param req
 * @param res
 * @returns {Promise<void>}
 */

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: async (req, file, cb) => {
        cb(null, uploadFileType(file.mimetype, imageType));
        // cb(null, true);
    }
}).single('identity'); // req.file은 identity 필드의 파일 정보

const imageToText = async (req, res) => {

    const client = new vision.ImageAnnotatorClient();

    await upload(req, res, async err => {
        client
            .textDetection(req.file.buffer)
            .then(results => {
                let text = results[0].fullTextAnnotation.text;
                text = text.replace(/\s/g,'');
                const numberIndex = text.indexOf("자격증번호:");
                const agentNumber = text.slice(numberIndex + 6, numberIndex + 19);
                const nameIndex = text.indexOf("성명");
                const agentName = text.slice(nameIndex + 3, nameIndex + 6);
                const birthIndex = text.indexOf("생년월일");
                const birth = text.slice(birthIndex + 5, birthIndex + 14)
                    .replace("년","-").replace("월","-");

                //취득일 추출
                let acquireDateIndex = text.indexOf("증명합니다.");
                let acquireDate = text.slice(acquireDateIndex + 6);
                acquireDateIndex = acquireDate.indexOf("년");
                acquireDate = acquireDate.slice(acquireDateIndex - 4, acquireDateIndex + 5)
                    .replace("년","-").replace("월","-").replace("일","");

                res.json({
                    agentNumber,
                    agentName,
                    birth,
                    acquireDate
                })
            })
            .catch(err => {
                console.error('ERROR:', err);
            });
    });
};

app.get('/', (req,res) => {
    res.send('ok');
});
app.post('/ocr',imageToText);

app.listen(port, () => {
    console.log(`Express listening on port ${port}`);
});
