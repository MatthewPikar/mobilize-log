/**
 * Created by mattpiekarczyk on 11/4/15.
 */
"use strict";

var _ = require('lodash');

var pins = ['movements'];
var commandlineParameters = {};

for(var i= 2, len=process.argv.length; i<len; i++){
    var argument = process.argv[i].split(':');
    commandlineParameters[argument[0]] = argument[1];
    pins = (argument[0] === 'pins') ? argument[1] : [];
}

var seneca = require('seneca')()
    .use('redis-transport')
    .use('log.js', _.extend({pins:pins}, commandlineParameters));

_.each(pins, function(pin){
    seneca.listen({type:'redis', pin:{role:pin, cmd:'get'}})
    seneca.listen({type:'redis', pin:{role:pin, cmd:'query'}})
    seneca.listen({type:'redis', pin:{role:pin, cmd:'add'}})
    seneca.listen({type:'redis', pin:{role:pin, cmd:'modify'}})
    seneca.listen({type:'redis', pin:{role:pin, cmd:'delete'}})
});