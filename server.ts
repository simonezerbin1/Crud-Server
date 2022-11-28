import http from "http";
import url from "url";
import fs from "fs";
import dotenv from "dotenv";

import { MongoClient, ObjectId } from "mongodb";

import express from "express";
const app = express();




//config
const PORT = 1337;
require("dotenv").config({path:".env"});
const connectionString = process.env.connectionString;
const DBNAME = "5Binf";




//CREAZIONE E AVVIO DEL SERVER HTTP
let server = http.createServer(app);
let paginaErrore: string = "";

server.listen(PORT, () => {
  init();
  console.log("Server in ascolto sulla porta " + PORT);
});

function init() {
  fs.readFile("./static/error.html", (err: any, data: any) => {
    if (err) {
      paginaErrore = "<h2>Risorsa non trovata</h2>";
    } else {
      paginaErrore = data.toString();
    }
  });
}

/***********MIDDLEWARE****************/
// 1 request log
app.use("/", (req: any, res: any, next: any) => {
  console.log(req.method + ": " + req.originalUrl);
  next();
});

// 2 gestione delle risorse statiche
//cerca le risorse nella cartella segnata nel path e li restituisce
app.use("/", express.static("./static"));

// 3 lettura dei parametri POST
app.use("/", express.json({ limit: "50mb" }));
app.use("/", express.urlencoded({ limit: "50mb", extended: true }));

// 4 log dei parametri get e post
app.use("/", (req: any, res: any, next: any) => {
  // parametri get .query, post .body
  if (Object.keys(req.query).length != 0) {
    console.log("---> Parametri GET: " + JSON.stringify(req.query));
  }
  if (Object.keys(req.body).length != 0) {
    console.log("---> Parametri BODY: " + JSON.stringify(req.body));
  }
  next();
});

// Apertura della connessione
app.use("/api/", (req: any, res: any, next: any) => {
  let connection = new MongoClient(connectionString);
  connection
    .connect()
    .catch((err: any) => {
      res.status(503);
      res.send("Errore di connessione al DB");
    })
    .then((client: any) => {
      req["client"] = client;
      next();
    });
});

/***********USER LISTENER****************/
app.get("/api/getCollections", (req: any, res: any, next: any) => {
  let db = req.client.db(DBNAME);
  // Leggo tutte le collezioni del DB
  db.listCollections().toArray((err: any, data: any) => {
    if (err) {
      res.status(500);
      res.send("Errore lettura connesioni");
    } else {
      res.send(data);
    }
    req.client.close();
  });
});

app.get("/api/:collection",
  (req: any, res: any, next: any) => {
    

    let selectedCollection=req.params.collection;
    let param=req.query;
    let collection = req.client.db(DBNAME).collection(selectedCollection);
    collection.find(param).toArray((err: any, data: any) => {
      if (err) {
        res.status(500);
        res.send("Errore esecuzione query");
      } else {
        let response=[];
        for (const item of data) {
            let key=Object.keys(item)[1];
            response.push({"_id":item["_id"],"val":item[key]})
        }
        res.send(response);
      }
      req.client.close();
    });
  }
);

app.get("/api/:collection/:id",
    (req: any, res: any, next: any) => {
      let selectedCollection=req.params.collection;
      let id= new ObjectId(req.params.id);
      let collection = req.client.db(DBNAME).collection(selectedCollection);
      collection.findOne({"_id":id},(err: any, data: any) => {
        if (err) {
          res.status(500);
          res.send("Errore esecuzione query");
        } else {
          res.send(data);

        }
        req.client.close();
      });
    }
  );


  app.post("/api/:collection",
    (req: any, res: any, next: any) => {
        let selectedCollection=req.params.collection;
        let params=req.body.stream;
        let collection = req.client.db(DBNAME).collection(selectedCollection);
        collection.insertOne(params,(err: any, data: any) => {
        if (err) {
            res.status(500);
            res.send("Errore esecuzione query");
        } else {
            res.send(data);
            
        }
        req.client.close();
      });
    }
  );


  app.post("/api/:collection/:id",
    (req: any, res: any, next: any) => {
        let selectedCollection=req.params.collection;
        let id=new ObjectId(req.params.id);
        let collection = req.client.db(DBNAME).collection(selectedCollection);
        collection.deleteOne({_id:id},(err: any, data: any) => {
        if (err) {
            res.status(500);
            res.send("Errore esecuzione query");
        } else {
            res.send(data);
            
        }
        req.client.close();
      });
    }
  );

  app.patch("/api/:collection/:id",
    (req: any, res: any, next: any) => {
        let selectedCollection=req.params.collection;
        let id=new ObjectId(req.params.id);
        let collection = req.client.db(DBNAME).collection(selectedCollection);
        collection.updateOne({_id:id},{$set:req.body.stream},(err: any, data: any) => {
        if (err) {
            res.status(500);
            res.send("Errore esecuzione query");
        } else {
            res.send(data);
            
        }
        req.client.close();
      });
    }
  );

  app.put("/api/:collection/:id",
  (req: any, res: any, next: any) => {
      let selectedCollection=req.params.collection;
      let id=new ObjectId(req.params.id);
      let collection = req.client.db(DBNAME).collection(selectedCollection);
      collection.replaceOne({_id:id},req.body.stream,(err: any, data: any) => {
      if (err) {
          res.status(500);
          res.send("Errore esecuzione query");
      } else {
          res.send(data);
          
      }
      req.client.close();
    });
  }
);
/***********DEFAULT ROUTE****************/

app.use("/", (req: any, res: any, next: any) => {
  res.status(404);
  if (req.originalUrl.startsWith("/api/")) {
    res.send("API non disponibile");
  } else {
    res.send(paginaErrore);
  }
});

app.use("/", (err: any, req: any, res: any, next: any) => {
  console.log("SERVER ERROR " + err.stack);
  res.status(500);
  res.send(err.message);
});