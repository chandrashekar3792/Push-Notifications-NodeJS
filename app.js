'use strict';

var express = require('express');
var app = express();
var mongoose = require('mongoose');
var bodyParser     = require('body-parser');
var io = require("socket.io");  // socket io server
var gcm = require('node-gcm'); // Node GCM
var config = require('./config/development.json');
var mongooseTypes = require('mongoose').Types;
var db = require('./config/development.json').db;
var Notification = require('./models/Notification');
var MobileNotificationToken = require('./models/MobileNotificationToken');

app.use(bodyParser.json()); // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(bodyParser.urlencoded({ extended: true })); // parse application/x-www-form-urlencoded

app.use(bodyParser.json());

// connect to database with specified host and database
mongoose.connect('mongodb://' + config.db.mongo.host + '/' + config.db.mongo.db);
app.post('/sendNotification',function(req) {
    // console.log('req.body', req.body)
    var notification = {
        from: {
            name: req.body.from.name
        },
        message: {
            title:req.body.message.title,
            text:req.body.message.text

        },
        messageType: 'APP_PROMOTION',
        userIds: req.body.userIds,
    };
    // console.log('All', JSON.stringify(notification));
    //Create Notification in database
     Notification.create(notification, function (error, newNotification) {
         getGcmToken(newNotification);
    });
});

function getGcmToken(alldocs) {
    var users = [];
    // console.log('alldocs',alldocs.userIds);
    MobileNotificationToken.find({userId: {$in:mongooseTypes.ObjectId(alldocs.userIds[0])}},function (err, coll) { // ID to GCM tokens
        var docgcm = coll;
        docgcm.forEach(function(doc) {
            if (doc && doc.gcmToken) {
                users.push(doc.gcmToken);
            }
        });
        sendNotification(alldocs,users);
    })
}

function sendNotification(alldocs,tokens) {
        var sender = new gcm.Sender(/*insert ur token gere*/);
        if (alldocs && alldocs.message) {
            var message = new gcm.Message({
                collapseKey: 'NAME',
                delayWhileIdle: true,
                timeToLive: 3000,
                data: {title: alldocs.message.title, message: alldocs.message.text}
            });
        }
        // console.log('message',message);
        if (tokens.length) {
            sender.send(message, tokens, 4, function (err, result) {
                if (err) console.log('Error:', err);
                else console.log('Result:', result);
            });
        }
        console.log('messge sent', message, tokens);
}
app.listen(8000);
console.log('server started at 8000 port');
