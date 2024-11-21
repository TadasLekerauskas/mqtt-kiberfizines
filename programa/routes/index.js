var express = require('express');
var router = express.Router();

const mqtt = require('mqtt')
let once = true;

/* GET home page. */
router.get('/', function(req, res, next) {
  var db = req.db;
  if(once){
    subscribe(db);
    once = false;
  }

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
})

router.post('/', function(req, res, next) {
  var db = req.db;
})

module.exports = router;

function subscribe(db){
  var topicFoto = 'info/fotorezistorius'
  var topicDHT = 'info/dhtSensorius'

  const client = mqtt.connect("mqtt://broker.hivemq.com")

  client.on('connect', () => {
    console.log('Connected')
    client.subscribe([topicFoto, topicDHT], () => {
      console.log(`Subscribe to topic '${topicFoto}' and topic '${topicDHT}`)
    })
  })

  client.on('message', (topic, payload) => {
    console.log('Received Message:', topic, payload.toString())
    if (topic == 'info/fotorezistorius'){
      putPhotorezistor(db, payload, function(rez){
        if(rez != null)
        {
          console.log("Neatnaujinti fotorezistoriaus duomenys");
        }
      })
    }
    else if (topic == 'info/dhtSensorius'){
      let sk = payload.toString();
      let arr = sk.split(' ');
      putTempHum(db, arr[0], arr[1],function(rez){
        if(rez != null)
        {
          console.log("Neatnaujinti temperaturos ir dregmes duomenys");
        }
      })
    }
  })

  client.on('disconnect', () => {
    console.log("Atsijunge");
  })
}

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

function putPhotorezistor(db, photoData, callback){
  db.run("update Fotorezistorius set Reiksme = ?; ", photoData, function(updateError)
    {
        //jei nebuvo jokios klaidos updateError=null
        //jei buvo klaida updateError=klaidos_pranesimas
        return callback(updateError);  
    });
}

function putTempHum(db, tempData, humData, callback){
  db.run("update Temperatura set Reiksme = ?; ", tempData, function(updateError)
    {
        //jei nebuvo jokios klaidos updateError=null
        //jei buvo klaida updateError=klaidos_pranesimas
        return callback(updateError);  
    });
    db.run("update Dregme set Reiksme = ?; ", humData, function(updateError)
    {
        //jei nebuvo jokios klaidos updateError=null
        //jei buvo klaida updateError=klaidos_pranesimas
        return callback(updateError);  
    });
}
