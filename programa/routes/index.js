var express = require('express');
var router = express.Router();

const mqtt = require('mqtt')


var topic = 'mqtt/kiberfizines'
var topicFoto = 'info/fotorezistorius'
var topicDHT = 'info/dhtSensorius'

const client = mqtt.connect("mqtt://broker.hivemq.com")

client.on('connect', () => {
  console.log('Connected')
  client.subscribe([topic, topicFoto, topicDHT], () => {
    console.log(`Subscribe to topic '${topic}', topic '${topicFoto}' and topic '${topicDHT}`)
  })
})

client.on('message', (topic, payload) => {
  console.log('Received Message:', topic, payload.toString())
})

client.on('disconnect', () => {
  console.log("Atsijunge");
})

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Mqtt'});
});

module.exports = router;
