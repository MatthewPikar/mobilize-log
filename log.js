"use strict";

var _ = require('lodash');
var fs = require('fs');
var bunyan = require('bunyan'),
    masterLog = bunyan.createLogger({
        name: 'mobilize',
        level: 'fatal',
        serializers: {response: responseSerializer}
    }),
    infoLog, errorLog, debugLog;

module.exports = function log(options) {
    var seneca = this;

    options = _.extend({
        context: 'request',
        logPath: "logs/",
        debug: false,
        logInfo: false,
        logClientErrors: false,
        logInternalErrors: true,
        pins: ['r']
    }, options);

    // make sure logPath exists and is writable
    try {fs.accessSync(options.logPath, fs.W_OK)}
    catch(err){fs.mkdirSync(options.logPath);}

    // create logs
    infoLog = masterLog.child({
        widget_type: options.context,
        streams: [
            {
                name: 'file', level: 'info', type: 'rotating-file',
                path: options.logPath + 'info-' + options.context + ".log",
                period: '2d', count: 1
            }
        ]});
    errorLog = masterLog.child({
        widget_type: options.context,
        streams: [
            {
                name: 'file', level: 'error', type: 'rotating-file',
                path: options.logPath + 'error-' + options.context + ".log",
                period: '1w', count: 2
            },
            {name: 'stdout', level: 'error', stream: process.stdout}
        ]});
    debugLog = masterLog.child({
        widget_type: options.context,
        streams: [
            {
                name: 'debug', level: 'debug', type: 'rotating-file',
                path: options.logPath + 'debug-' + options.context + ".log",
                period: '4h', count: 0
            }
        ]});

    _.each(options.pins, function(pin){
        seneca.add({role:pin, cmd:'get'}, actionLog);
        seneca.add({role:pin, cmd:'query'}, actionLog);
        seneca.add({role:pin, cmd:'add'}, actionLog);
        seneca.add({role:pin, cmd:'modify'}, actionLog);
        seneca.add({role:pin, cmd:'delete'}, actionLog);
    });

    function actionLog(args){
        info(args, 'request received');
        return null;
    }

    function error(error, message){
        if(Array.isArray(message.resources) && message.resources.length > 0)
            errorLog.error({resources: error}, message?message:'internal error');
        else errorLog.error({err: error}, message?message:'internal error');
        return true;
    }
    function info(info, message){
        if(Array.isArray(message.resources) && message.resources.length > 0)
            infoLog.info({resources: info}, message?message:'received');
        else infoLog.info({info: info}, message?message:'received');
        return true;
    }
    function debug(debug, message){
        if(Array.isArray(message.resources) && message.resources.length > 0)
            debugLog.debug({resources: debug}, message?message:'debug');
        else debugLog.debug({debug: debug}, message?message:'debug');
        return true;
    }
};

function responseSerializer(message){
    var res = [];

    if(Array.isArray(message.resources) && message.resources.length > 0) {
        for (var i = 0, len = message.resources.length; i < len; i++) {
            res[i] = {
                id: message.resources[i].id ? message.resources[i].id : 'empty',
                name: message.resources[i].name ? message.resources[i].name : 'empty'
            };
        }
    }

    return {
        req_id: message.requestId,
        status: message.status.code,
        latency: message.latency ? message.latency: '',
        res: res,
        req: (message.request ? message.request : ''),
        err: (message.error ? message.error: '')
    }}

function passthrough(err, res){return null;}