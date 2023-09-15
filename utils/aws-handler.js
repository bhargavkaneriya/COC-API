'use strict';

/*
 *---------------------------------------------------------------
 * AWS Handler
 *---------------------------------------------------------------
 *
 * This handler is used for uploading images and send mail using amazon web services.
 * 
 *     imageUpload - Image upload in s3 bucket using amazon web services
 *     imageDelete - Delete image from s3 bucket
 *     imageGet - Get image url from s3 bucket
 *     sendEmail - Send mail using AWS.SES
 *     imageWithImageMagicUpload - Upload multiple size images using imagemagick
 *
 */

const fs = require('fs');
const AWS = require('aws-sdk');
const async = require('async');
const im = require('imagemagick');
const path = require('path');

// Image uplaod & delete in AWS s3
class S3Handler {
    constructor() {
        this._objectsToUpload = null;
        this._s3 = new AWS.S3()
        this.ses = new AWS.SES({apiVersion: '2010-12-01'});
    };

    config(requestParam) {
        AWS.config.update({
            accessKeyId: requestParam.keyId,
            secretAccessKey: requestParam.key,
            region: requestParam.region
        });
        this._s3 = new AWS.S3()
        this.ses = new AWS.SES({apiVersion: '2010-12-01'});
    };

    /*
     * Image upload in s3 bucket using amazon web services
     * @created date : 28th Jan 2022.
     * @param {string} path - file path.
     * @param {string} bucket - s3 bucket name where image store.
     * @param {string} file_name - image file name.
     * @param {string} contentType - image content type.
    */
    imageUpload(requestParam) {
        return new Promise((resolve, reject) => {
            const file_data = fs.readFileSync(requestParam.path);
            const params = {Bucket: requestParam.bucket, Key: requestParam.file_name, Body: file_data, ContentType : requestParam.contentType};
            this._s3.upload(params, (err, data)=> {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(data);
                return
            });
        })
    };

    /*
     * Delete image from s3 bucket
     * @created date : 28th Jan 2022.
     * @param {object} objects - file object.
     * @param {string} bucket - s3 bucket name where image store.
    */
    imageDelete(requestParam) {
        return new Promise((resolve, reject) => {
            const params = {
                Bucket: requestParam.bucket,
                Delete: {
                    Objects:requestParam.objects,
                    Quiet: false
                }
            };
            this._s3.deleteObjects(params, (error, data) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(data);
                return
            });
        })
    };

    /*
     * Get image url from s3 bucket
     * @created date : 28th Jan 2022.
     * @param {string} key - file name of image.
     * @param {string} bucket - s3 bucket name where image store.
    */
    imageGet(requestParam) {
        return new Promise((resolve, reject) => {
            this._s3.getSignedUrl("getObject", {Bucket: requestParam.bucket, Key: requestParam.key, Expires: 300}, (error, s3Object)=> {
                if (error) {
                    reject(error);
                    return;
                }

                if (!s3Object) {
                    reject(new Error("null"));
                    return;
                }

                const formattedObject = {
                    body: s3Object,
                };
                resolve(formattedObject);
                return;
            });
        })
    };

    /*
     * Send mail using AWS.SES
     * @created date : 28th Jan 2022.
     * @param {string} ses_region - AWS SES Region.
     * @param {string} to_email - To email address.
     * @param {string} description - email description.
     * @param {string} subject - email subject.
     * @param {string} from_email - From email address where you sent.
    */
    sendEmail(requestParam) {
        return new Promise((resolve, reject) => {
            if(requestParam.ses_region){
                AWS.config.update({
                    region: requestParam.ses_region
                });
                this.ses = new AWS.SES({apiVersion: '2010-12-01'});
            }

            const params = {
                Destination: {
                    ToAddresses: requestParam.to_email
                },
                Message: {
                    Body: {
                        Html: {
                            Charset: 'UTF-8',
                            Data: requestParam.description
                        }
                    },
                    Subject: {
                        Charset: 'UTF-8',
                        Data: requestParam.subject
                    }
                },
                ReturnPath: requestParam.from_email,
                Source: requestParam.from_email,
            };

            this.ses.sendEmail(params, (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(data);
                return;
            });
        })
    };

    /*
     * Upload multiple size images using imagemagick
     * @created date : 28th Jan 2022.
     * @param {Array} sizeArr - file path.
     * @param {string} path - file path.
     * @param {string} bucket - s3 bucket name where image store.
     * @param {string} file_name - image file name.
     * @param {string} contentType - image content type.
    */
    imageWithImageMagicUpload(fileObject) {
        return new Promise((resolve, reject) => {
            let imgObject = {}
            let that = this;
            let oldName = Math.round((Math.pow(36, 10 + 1) - Math.random() * Math.pow(36, 10))).toString(36).slice(1);;
            async.forEachSeries(fileObject.sizeArr, function(singleSize, callback_single) {
                let fileName = oldName;
                fileName += '_' + singleSize.width + 'x' + singleSize.height + '.' + fileObject.contentType;
                let destinationPath = path.join(__dirname, "../") + 'public/' + fileName;
                im.resize({
                    srcPath: fileObject.path,
                    dstPath: destinationPath,
                    width: singleSize.width,
                    height: singleSize.height,
                },
                function(err, stdout, stderr) {
                    fs.readFile(destinationPath, function(err, file_data) {
                        if (err) {
                            // console.log('Error: while reading file.');
                            // console.log(err);
                        }
                        const params = {Bucket: fileObject.bucket, Key: fileName, Body: file_data, ContentType : fileObject.contentType};
                        that._s3.upload(params, (err, data)=> {
                            if (err) {
                                // console.log(err)
                            }
                            fs.unlink(destinationPath, (err) => {
                                // console.log(err)
                            });
                            imgObject[singleSize.width + 'x' + singleSize.height] = fileName;
                            callback_single();
                        });
                        // console.log(fileName);
                    });
                });
            }, function() {
                resolve(imgObject);
                return
            });
        })
    };

}

module.exports = S3Handler;