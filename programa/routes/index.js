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
  getPhotoresistor(db, function(data){
    if(data != null){
      photoresistor = data[0].Reiksme;
    }
    else{
      console.log("Nera fotorezistoriaus");
    }
  })
  getTemperature(db, function(data){
    if(data != null){
      temperature = data[0].Reiksme;
    }
    else{
      console.log("Nera temperaturos");
    }
  })
  getHumidity(db, function(data){
    if(data != null){
      humidity = data[0].Reiksme;
    }
    else{
      console.log("Nera Dregmes");
    }
  })

  res.render('index', { title: 'Mqtt', 
    fotorezistorius: photoresistor, temperatura: temperature, dregme: humidity});
});


module.exports = router;

function getTemperature(db, callback)
{
  db.all('select Temperatura.Id, Temperatura.Reiksme FROM Temperatura', function(err,rows)
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
function getHumidity(db, callback)
{
  db.all('select Dregme.Id, Dregme.Reiksme FROM Dregme', function(err,rows)
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
function getPhotoresistor(db, callback)
{
  db.all('select Fotorezistorius.Id, Fotorezistorius.Reiksme From Fotorezistorius', function(err,rows)
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