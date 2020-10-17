const serverless = require('serverless-http');
const express = require('express');
const AWS = require('aws-sdk');
const s3 = new AWS.S3()
const bodyParser = require('body-parser');
const app = express();

const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;

app.use(bodyParser.json({ strict: false }));

app.get('/books', async function (req, res) {

    const params = {
        TableName: TABLE_NAME
    };

    try {
        const result = await dynamoDb("scan", params);
        res.json(result.Items).status(200);
    } catch (e) {
        console.log(e);
        res.status(400).json({ error: `Can't get all books`});
    }
});

app.get('/books/:bookId', async function (req, res) {

    const bookId = req.params.bookId;    
    const params = {
        TableName: TABLE_NAME,
        Key: {
            bookId: bookId
        }
    };

    try {
        const result = await dynamoDb("get", params);
        result.Item.url = await generatePresignedUrl(bookId);
        if (result.Item) {
            res.json(result.Item).status(200);
        } else {
            res.status(404).json({error: `Book with id ${bookId} not found`});
        }
    } catch (e) {
        console.log(e);
        res.status(400).json({ error: `Can't get book`});
    }
});

app.post('/books', function (req, res) {

    const { bookId, bookName, author } = req.body;
    const params = {
        TableName: TABLE_NAME,
        Item: {
            bookId: bookId,
            bookName: bookName,
            author: author
        }
    };

    try {
        dynamoDb("put", params);
        const {CategoryId} = params.Item;
        res.json({ CategoryId }).status(201);
    } catch (e) {
        console.log(e);
        res.status(400).json({ error: `Can't create a book`});
    }
});

app.put('/books/:bookId', async function (req, res) {

    const { bookName, author } = req.body;
    var params = {
        TableName : TABLE_NAME,
        Key: {
            bookId: req.params.bookId
        },
        UpdateExpression : 'set #bName = :bookName, #a = :author',
        ExpressionAttributeNames: { '#bName' : 'bookName', '#a' : 'author' },
        ExpressionAttributeValues : { ':bookName' : bookName, ':author' : author},
        ReturnValues: "ALL_NEW"
    };

    try {
        const result = await dynamoDb("update", params);
        console.log(`Update result = ${JSON.stringify(result)}`);
        res.json(result.Attributes).status(200);
    } catch (e) {
        console.log(e);
        res.status(400).json({ error: `Can't update book` });
    }
});

app.delete('/books/:bookId', async function (req, res) {

    const params = {
        TableName: TABLE_NAME,
        Key: {
            bookId: req.params.bookId
        }
    };

    try {
        await dynamoDb("delete", params);
        res.json("Delete book success").status(200);
    } catch (e) {
        console.log(e);
        res.status(400).json({ error: `Can't delete book`});
    }
});

function dynamoDb(action, params) {
    AWS.config.update({ region: "eu-west-1" });
    const dynamoDb = new AWS.DynamoDB.DocumentClient();
    return dynamoDb[action](params).promise();
}

async function generatePresignedUrl(bookId) {

    const params = {
        Bucket: BUCKET_NAME,
        Key: bookId + '.jpg',
    }

    try {
        await s3.headObject(params).promise();
        console.log(`Image ${bookId}.jpg found in s3`);
        params.Expires = 60 * 5;
        const signedUrl = s3.getSignedUrl('getObject', params);
        return signedUrl;
    } catch (err) {
        console.log(`Image not found for key: ${bookId}.jpg`);
        return null;
    }
}

module.exports.handler = serverless(app);