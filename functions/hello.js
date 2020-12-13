
const util = require('util');

exports.hello = (event, context, callback) => {
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    const srcBucket = event.Records[0].s3.bucket.name;
    const srcKey    = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));


    const extension = srcKey.substr(srcKey.lastIndexOf('.'));
    console.log(`srcKey = ${srcKey}, extension = ${extension}`)

    if(extension == ".csv"){
        console.log(`Extension is valid`)
    } else {
        console.log(`Extension is invalid`)
        throw new Error('Extension is invalid');
    }
};