const express = require("express");
const mysql = require('mysql');
let alert = require('alert');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
const pool = dbConnection();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({extended:true}));


//Middleware authentication config
app.set('trust proxy', 1)
app.use(session({
  secret: 'admin',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))

//routes
//Root Route
app.get('/', (req, res) => {
  res.render('login');
});

//checkout routes
app.get('/checkout', async (req, res) => {
  let userId = req.query.userId;

  let sql = `SELECT *
            FROM cart
            WHERE userId=${userId}`;
  let rows = await executeSQL(sql);

  let itemsSearch = `SELECT * from item`;
  let items = await executeSQL(itemsSearch);

  sql = `SELECT *
         FROM user
         WHERE userId=${userId}`;
  let user = await executeSQL(sql);

  res.render('checkout', {"cartItems": rows, "dbItems": items, "user":user});
});

app.get('/checkoutSuccess', async (req, res) => {
  let userId = req.query.userId;

  let sql = `DELETE FROM cart 
             WHERE userId = ${userId}`;
  let cart = await executeSQL(sql);

  sql = `SELECT *
         FROM user
         WHERE userId=${userId}`;
  let user = await executeSQL(sql);

  res.render('checkoutSuccess', {"user": user});
});

//admin logout
app.get('/logout', (req, res) => {
  req.session.authenticated = false;
  req.session.destroy();
  res.redirect('/');
});

app.post('/login', async (req, res) =>{
  let email = req.body.username;
  let password = req.body.password;
  console.log(email);
  console.log(password);

  let passwordHash = "";

  let sql = `SELECT * 
            FROM admin 
            WHERE username = ?`;

  let data = await executeSQL(sql, [email]);

  if(data.length > 0){
    passwordHash = data[0].password;
  }

  const matchPassword = await bcrypt.compare(password, passwordHash);

  if(matchPassword){
    req.session.authenticated = true;
    console.log(req.session);
    res.render('adminHome');
  } else {

    sql = `SELECT * 
            FROM user 
            WHERE emailAddress = "${email}" AND passWord = "${password}"`;
    let users = await executeSQL(sql);

    sql = `SELECT * from item`;
    let items = await executeSQL(sql);

    //TODO: Move this inside a function in functions.js
    if(users.length == 0 || (email.length == 0 && password.length == 0)){
      res.render('login');
    } else {
      // console.log(`${items}`);
      sql = `SELECT * 
              FROM cart 
              WHERE userId=${users[0].userId}`;
      let cart = await executeSQL(sql);

      res.render('homeFeed', {"user":users, "items": items, "session": session, "cart":cart});
    } 
  }
});

//Cart route
app.get('/addToCart', async (req, res) => {
  let userId = req.query.userId;
  let itemId = req.query.itemId;

  console.log(itemId);
  console.log("TEST");

  let sql = `INSERT INTO cart (itemId, userId) 
             VALUES (?, ?)`;
  let params = [itemId, userId];
  let rows = await executeSQL(sql, params);

  sql = `SELECT * from item`;
  let items = await executeSQL(sql);

  sql = `SELECT * 
         FROM user 
         WHERE userId=${userId}`
  let user = await executeSQL(sql);
  
  sql = `SELECT * 
         FROM cart 
         WHERE userId=${userId}`
  let cart = await executeSQL(sql);

  res.redirect(`/store?userId=${userId}`);
});


app.get('/store', async (req, res) => {
  let userId = req.query.userId;
  console.log(userId);
  let sql = `SELECT * 
             FROM item`;
  let rows = await executeSQL(sql);

  //Query cartitems using session
  sql = `SELECT * 
         FROM cart 
         WHERE userId=${userId}`;
  let cart = await executeSQL(sql);

  sql = `SELECT * 
         FROM user 
         WHERE userId=${userId}`;
  let user = await executeSQL(sql);

  res.render('homeFeed', ({'items': rows, 'cart':cart, 'user':user}));
});

app.get('/register', async (req, res) =>{
  let error = "";

  res.render('register', {"error":error});
});

app.post('/register', async (req, res) =>{
  let firstName = req.body.firstName;
  let lastName = req.body.lastName;
  let emailAddress = req.body.emailAddress;
  let passWord = req.body.passWord;
  let phoneNumber = req.body.phoneNumber;

  let sql = `SELECT * from item`;
  let items = await executeSQL(sql);

  let checkSql = `SELECT emailAddress, phoneNumber 
                  FROM user 
                  WHERE emailAddress = "${emailAddress}" AND phoneNumber = "${phoneNumber}"`;
  let rows = await executeSQL(checkSql);

  //TODO: Move this inside a function in functions.js
  
  //Check if login credentials are OK
  if(rows.length == 0){

    sql = `INSERT INTO user (firstName, lastName, emailAddress, phoneNumber, passWord) 
           VALUES (?, ?, ?, ?, ?)`;
    let params = [firstName, lastName, emailAddress, phoneNumber, passWord];
    rows = await executeSQL(sql, params);
  
    sql = `SELECT *
           FROM user 
           WHERE emailAddress="${emailAddress}"`;
    let user = await executeSQL(sql);

    sql = `SELECT *
           FROM cart 
           WHERE userId=${user[0].userId}`;
    let cart = await executeSQL(sql);
    
    res.render('homeFeed', {"items": items, "user":user, "cart":cart});
  } else {  
    let error = "Error: All fields must be filled out.";
    res.render('register', {"error": error});
  }  
});

app.get('/api/itemInfo', async (req, res) => {
  let item_id = req.query.itemId;

  let sql = `SELECT *
            FROM item
            WHERE itemId=${item_id}`;
  let rows = await executeSQL(sql);
   
  res.send(rows);
});

app.get('/api/userInfo', async (req, res) => {
  let user_id = req.query.userId;

  let sql = `SELECT *
             FROM user
             WHERE userId=${user_id}`;
  let rows = await executeSQL(sql);
   
  res.send(rows);
});

app.get('/api/cartInfo', async (req, res) => {
  let user_id = req.query.userId;

  let sql = `SELECT *
             FROM cart
             WHERE userId=${user_id}`;
  let rows = await executeSQL(sql);
   
  res.send(rows);
});

app.get('/item/new', isAuthenticated, (req, res) => {
  res.render('newItem');
});

app.post('/item/new', isAuthenticated, async (req, res) => {

  let title = req.body.title;
  let price = req.body.price;
  let description = req.body.description;
  let image = req.body.image;

  let sql = `INSERT INTO item (title, price, description, image) 
             VALUES (?, ?, ?, ?)`;

  let params= [title, price, description, image];
  let rows = await executeSQL(sql, params);
   res.redirect('/items');
});

app.get('/item/delete', isAuthenticated, async (req, res) => {

  let itemId = req.query.itemId;
  let sql = `DELETE 
              FROM item
              WHERE itemId = ${itemId}`;

    let rows = await executeSQL(sql);

  //display list of authors again
  res.redirect('/items');
});

app.get('/cartDelete', async (req, res) => {
  let itemId = req.query.itemId;
  let userId = req.query.userId;

  let sql = `DELETE 
             FROM cart
             WHERE itemId = ${itemId}`;

    let rows = await executeSQL(sql);

  res.redirect(`/store?userId=${userId}`);
});

app.get('/users', isAuthenticated, async (req, res) => {

  let sql = `SELECT userId, firstName, lastName, emailAddress, phoneNumber 
             FROM user 
             ORDER BY userId`;

  let rows = await executeSQL(sql);

  res.render('users', {"users": rows});
});

app.get('/items', isAuthenticated, async (req, res) => {

  let sql = `SELECT * 
             FROM item 
             ORDER BY itemId`;

  let rows = await executeSQL(sql);

  res.render('items', {"items": rows});
});

app.get('/item/edit', isAuthenticated, async (req, res) => {

  let itemId = req.query.itemId;
  let sql = `SELECT * 
             FROM item 
             WHERE itemId = ${itemId}`;

    let rows = await executeSQL(sql);

  res.render('editItem', {"itemInfo": rows});
});

app.post('/item/edit', isAuthenticated, async (req, res) => {

  let itemId = req.body.itemId;
  let sql = `UPDATE item
             SET title = ?, 
             price = ?,
             description = ?,
             image = ?
             WHERE itemId = ${itemId}`;

  let params = [req.body.title, req.body.price, req.body.description, req.body.image];
  let rows = await executeSQL(sql, params);

  sql = `SELECT *  
             FROM item 
             WHERE itemId = ${itemId}`;

  rows = await executeSQL(sql);

  res.render('editItem', {"itemInfo": rows});
  // res.redirect('/items');
});

app.get('/user/edit', isAuthenticated, async (req, res) => {

  let userId = req.query.userId;
  let sql = `SELECT * 
             FROM user 
             WHERE userId = ${userId}`;

    let rows = await executeSQL(sql);

  res.render('editUser', {"userInfo": rows});
});

app.post('/user/edit', isAuthenticated, async (req, res) => {

  let userId = req.body.userId;
  let sql = `UPDATE user
             SET firstName = ?, 
             lastName = ?,
             emailAddress = ?,
             phoneNumber = ?
             WHERE userId = ${userId}`;

  let params = [req.body.fName, req.body.lName, req.body.eAddress, req.body.pNumber];
  let rows = await executeSQL(sql, params);

  sql = `SELECT *  
             FROM user 
             WHERE userId = ${userId}`;

  rows = await executeSQL(sql);

  res.render('editUser', {"userInfo": rows});
  // res.redirect('/users');
});

app.get('/user/delete', isAuthenticated, async (req, res) => {

  let userId = req.query.userId;
  let sql = `DELETE 
              FROM user
              WHERE userId = ${userId}`;

    let rows = await executeSQL(sql);

  //display list of authors again
  res.redirect('/users');
});

app.get("/dbTest", async function(req, res){
  let sql = "SELECT CURDATE()";
  let rows = await executeSQL(sql);
  res.send(rows);
});//dbTest

//functions
async function executeSQL(sql, params){
  return new Promise (function (resolve, reject) {
    pool.query(sql, params, function (err, rows, fields) {
      if (err) throw err;
        resolve(rows);
      });
  });
}//executeSQL
//values in red must be updated
function dbConnection(){

   const pool  = mysql.createPool({

    connectionLimit: 10,
    host: "en1ehf30yom7txe7.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "cbntik7m4d8ws4zx",
    password: "jcu267fvhhxu4lds",
    database: "yq8r605ykd6nfwwo"
   }); 

   return pool;

} //dbConnection

//middleware function for the authentication process
function isAuthenticated(req, res, next){
  if (req.session.authenticated) {
      next();
  } else {
      res.redirect("/");
  }
}

//start server
app.listen(3000, () => {
console.log("Expresss server running...")
} )
