/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb');
var request     = require('sync-request');
var Util        = require('util');
var q     = require('q');
const CONNECTION_STRING = process.env.MONGOLAB_URI; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(function (req, res){
    console.log(req.ip)
      var company = req.query.stock;
    var compArr = [];
    var stock = {};
    var resp;
      console.log(Util.isArray(req.query.stock));
    

    if(!Util.isArray(req.query.stock)){
      const url = 'https://api.iextrading.com/1.0/stock/market/batch?symbols=' + company.toUpperCase() + '&types=quote';
       resp = request('GET',url)
      compArr[0] = company.toUpperCase()
    }else{
      var batch = 'https://api.iextrading.com/1.0/stock/market/batch?symbols='
      for(company in req.query.stock){
        
         compArr[company] = req.query.stock[company]
       batch =  batch.concat(compArr[company].toUpperCase() + ',');
      }
     batch = batch.concat('&types=quote');
       console.log(batch)
      resp = request('GET',batch)
    }
  var likes={
      ip: req.ip,
      stock: compArr[0],
      like: 0
    }
//Adding like
if(req.query.like && !Util.isArray(req.query.stock)){
    likes.like = 1;
    var isAlreadyLiked = false;
MongoClient.connect(CONNECTION_STRING, function(err, db) {
          if (err) throw console.log('Database error: '+err);
          var collection = db.collection('likes');
            collection.aggregate([{$match:{ip:likes.ip}},{$project:{stock:likes.stock, count:{$sum:'like'}}}]).toArray(function(err, result) {
             // console.log(result)
              if (err) throw console.log('Database read err: '+err);
            console.log(result)
              if(result.count>0) isAlreadyLiked = true
          });
    });  


  if(!isAlreadyLiked){
    MongoClient.connect(CONNECTION_STRING, function(err, db) {
            var collection = db.collection('likes');
              collection.insertOne(likes,function(err,doc){
                 if (err) throw console.log('Database insert err: '+err);
          });
      })
  }
}
      
      var buffer = new Buffer.from(resp.body.toString());
      var tempObj = buffer.toString();
      var stockData = JSON.parse(tempObj);
      var comp =req.query.stock;
    
      var stockObj = (comp, stockData) => {
        return{stock: comp.toUpperCase(),
        price: stockData[comp.toUpperCase()].quote.latestPrice,
        likes: likes.like}
      };  
    
      var stockWithRelLikes = (comp, stockData, relLikes) => {
        return{stock: comp.toUpperCase(),
        price: stockData[comp.toUpperCase()].quote.latestPrice,
        rel_likes: relLikes}
      }; 
    

      var output = {};
       if (resp.statusCode == 200) {
        
       if(Util.isArray(req.query.stock)) {
         
        var stockArray = [];
        var stockA = req.query.stock[0].toUpperCase();
        var stockB = req.query.stock[1].toUpperCase(); 
         var A, B;
               
      MongoClient.connect(CONNECTION_STRING, function(err, db) { 
          if (err) throw console.log('Database error: '+err);
          var collection =  db.collection('likes'); 
          collection.aggregate([{$match:{ip:req.ip,like:1}},{$group:{_id:{stock:'$stock',like:'$like'},count:{$sum:1}}}]).toArray(function(err, result) {
              if (err) throw console.log('Database read err: '+err);
              console.log(result); 
            if(result.length<1) result[1].count =0;
            A = result[0].count - result[1].count
            B = result[1].count - result[0].count
            console.log(A+' ' +B)
        for(var i = 0; i< req.query.stock.length; i++){
          console.log('callback ' + req.query.stock[i])
          var comp =req.query.stock[i];
          
          var relLikes = (comp.toUpperCase() == stockA.toUpperCase()) ? A : B
          console.log(comp + '' + relLikes)
          console.log(relLikes)
          stockArray.push(stockWithRelLikes(comp, stockData,relLikes));
          Object.assign(output, {"stockData": stockArray});
   
        }
          console.log('output: '+ output.stockData[0].rel_likes);
            console.log('output: '+ output.stockData[1].rel_likes);
          res.json( output);
              //return result;
             }); 
          })
 
       }else{
         
         var comp =req.query.stock;
         Object.assign(output, {"stockData": stockObj(comp, stockData)});
          console.log('output: '+output);
          res.json( output);
       }
         
        
        }else{
          
         console.log('error when api hit');
         res.send( 'error when api hit');
        }

    
  });
  
  
    
};
