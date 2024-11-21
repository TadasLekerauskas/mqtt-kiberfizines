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
  var db = req.db;

  let photoresistor = -1;
  let temperature = -100;
  let humidity = -1;
  // padaryta taip nes vienas
  getAllData(db, function(data){
    if(data != null){
      //console.log(data[0]);
      photoresistor = data[0].ftRk;
      temperature = data[0].tmpRk;
      humidity = data[0].drgRk;
      res.render('index', {fotorezistorius: photoresistor, temperatura: temperature, dregme: humidity});
    }
    else{
      console.log("Nera fotorezistoriaus");
    }
  })
});

module.exports = router;

function getAllData(db, callback)
{
  db.all('select Temperatura.Id as tmpId, Temperatura.Reiksme as tmpRk, Dregme.Id as drgId, Dregme.Reiksme as drgRk, Fotorezistorius.Id ftId, Fotorezistorius.Reiksme as ftRk FROM Temperatura, Dregme, Fotorezistorius', function(err,rows)
  {
      if(err)
      {
          console.log('*** Error serving querying database. ' + err);
          return callback(null);
      }
      else
      {
          return callback(rows);
      }
  });
}
