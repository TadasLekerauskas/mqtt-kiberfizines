var express = require('express');
var router = express.Router();

const bcrypt = require('bcrypt');

const mqtt = require('mqtt')
let once = true;
let clientConnected = false;
let client;
let loggedIn = false;


/* GET home page. */
router.get('/', function(req, res, next) {
  if(loggedIn){
    res.redirect("http://localhost:3000/siltnamis");
  } else {
    res.render('signIn', {errorMsg: false});
  }
})

router.post('/', function(req, res, next) {
  console.log("Post metodas vyksta!");
  var db = req.db;
  var prisVardas = req.body.username;
  var slapt = req.body.password;
  //console.log(req.body);
  //encryptPassword(slapt);
  
  getUsernameAndPassword(db, function(data){
    if(data != null){
      //console.log(data[0]);
      username = data[0].vardas;
      hashedPassword = data[0].slaptazodis;
      let ats = verify(prisVardas, username, slapt, hashedPassword)
      .then(ats => {
        console.log("Bendras atsakymas: " + ats);
        if(ats){
          loggedIn = true;
          res.redirect("http://localhost:3000/siltnamis");
        }
        else{
          res.render("signIn", {errorMsg: true});
        }
      });
      
        
    }
    else{
      console.log("Nerastas prisijungimas");
    }
  })
})

router.post('/siltnamis', function(req, res, next) {
  //console.log(req.body);
  var db = req.db;
  if (req.body.submit == 'Patvirtinti'){
    var fotoRiba = req.body.fotoSbmt;
    var tmpVirsRiba = req.body.tmpSbmt;
    var tmpApacRiba = req.body.drgSbmt;
    sendMessageRibos(fotoRiba, tmpVirsRiba, tmpApacRiba);
    // grazinam pradini puslapi
    getAllData(db, function(data){
      if(data != null){
        //console.log(data[0]);
        photoresistor = data[0].ftRk;
        temperature = data[0].tmpRk;
        humidity = data[0].drgRk;
        res.render('index', {fotorezistorius: photoresistor, temperatura: temperature, dregme: humidity, clientConnection: clientConnected});
      }
      else{
        console.log("Nera duomenu");
      }
    })
  }
  else if (req.body.submit == 'Atsijungti'){
    loggedIn = false;
    res.redirect("http://localhost:3000");
  }
})

router.get('/siltnamis', function(req, res) {
  if(loggedIn){
    var db = req.db;
    if(once){
      connectClient(db);
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
        res.render('index', {fotorezistorius: photoresistor, temperatura: temperature, dregme: humidity, clientConnection: clientConnected});
      }
      else{
        console.log("Nera duomenu");
      }
    })
  }
  else{
    res.redirect("http://localhost:3000/");
  }
})

module.exports = router;

async function encryptPassword(password){
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(password, salt);
  console.log(hashedPassword);
}

async function verify(givenUsern, realUsern, password, hashedPassword){
  const matchingPasswords = await bcrypt.compare(password, hashedPassword);
  console.log("Ar slaptazodis geras? " + matchingPasswords);
  const metchingUsernames = givenUsern == realUsern;
  return matchingPasswords && metchingUsernames;
}

function getUsernameAndPassword(db, callback){
  db.all('select Prisijungimas.vardas as vardas, Prisijungimas.slaptazodis as slaptazodis FROM Prisijungimas', function(err,rows)
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

function connectClient(db){
  client = mqtt.connect("mqtt://broker.hivemq.com");

  client.on('connect', () => {
    clientConnected = true;
    console.log("Client connected");
    subscribe(db);
  })
  client.on('disconnect', () => {
    console.log("Atsijunge");
  })
}

function sendMessageRibos(fotoRiba, tmpVirsRiba, tmpApacRiba){
  let topic1 = 'command/foto';
  let topic2 = 'command/tmpVir';
  let topic3 = 'command/tmpApac';
  if (clientConnected){
    console.log("Zinutes issiustos!");
    client.publish(topic1, fotoRiba, { qos: 0, retain: false }, (error) => {
      if (error) {
        console.error(error)
      }
    })
    client.publish(topic2, tmpVirsRiba, { qos: 0, retain: false }, (error) => {
      if (error) {
        console.error(error)
      }
    })
    client.publish(topic3, tmpApacRiba, { qos: 0, retain: false }, (error) => {
      if (error) {
        console.error(error)
      }
    })
  } else{
    console.log("Unable to send message, client not connected! \nRetrying connection");
    connectClient();
  }


}

function subscribe(db){
  var topicFoto = 'info/fotorezistorius'
  var topicDHT = 'info/dhtSensorius'

  if (clientConnected){
    client.subscribe([topicFoto, topicDHT], () => {
      console.log(`Subscribe to topic '${topicFoto}' and topic '${topicDHT}`)
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
  } else{
    console.log("Unable to subscribe to topics, client not connected! \nRetrying connection");
    connectClient();
  }
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
