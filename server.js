const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
var sqlite3 = require('sqlite3').verbose()
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
require("dotenv").config();
app.set("view engine", "ejs");
const io = require("socket.io")(server, {
  cors: {
    origin: '*'
  }
});
session = require('express-session');
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { sameSite: 'strict' },
}));

sqlite3 = require('sqlite3');
db = new sqlite3.Database('users.sqlite3');
db.serialize();
db.run(`CREATE TABLE Users (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  Username text, 
  Email text, 
  Password text,             
  Salt text,    
  Token text,
  DateLoggedIn DATE,
  DateCreated DATE
  )`,
  (err) => {
      if (err) {
        console.log('successfuly connected to db')
      } else {
        console.log('error connecting to db')
      }
  });

db.parallelize();

const { ExpressPeerServer } = require("peer");
const opinions = {
  debug: true,
}

app.use("/peerjs", ExpressPeerServer(server, opinions));
app.use(express.static("public"));

app.get("/login", (req, res) => {
  res.render('login')
});

app.get("/register", (req, res) => {
  res.render('register')
});
app.use(bodyParser.urlencoded({ extended: true }));
app.post("/login", async (req, res) => {

  const { Email = req.body.email, Password = req.body.password } = req.body;

  if (!Email || !Password) {
      res.render('login', { warn: 'Please fill in all fields.' });
  }
  else if (req.body.email !== "" && req.body.password !== "") {

      db.all(`SELECT Password From Users WHERE Email LIKE "${req.body.email}"`, [], (err, rows) => {
          if (rows.length < 1) {
              res.render('login', { warn: 'Wrong email or password!' });
          }
          else {
              var encryptedPassword = ""
              rows.forEach((row) => {
                  encryptedPassword = row.Password;
              });
              var compared = bcrypt.compareSync(req.body.password, encryptedPassword)
              if (!compared) {
                  res.render('login', { warn: 'Wrong email or password!' });
              }
              else {
                  try {
                      let user = [];

                      var sql = "SELECT Username FROM Users WHERE Email = ?";
                      db.all(sql, Email, function (err, rows) {
                          if (err) {
                              res.status(400).json({ "error": err.message })
                              return;
                          }

                          var uname = ""
                          rows.forEach(function (row) {
                              user.push(row);
                              uname = row.Username
                          })

                          var PHash = bcrypt.hashSync(req.body.password, user[0].Salt);

                          if (PHash === user[0].Password) {
                              const token = jwt.sign(
                                  { user_id: user[0].Id, username: user[0].Username, Email },
                                  process.env.TOKEN_KEY,
                                  {
                                      expiresIn: "1h",
                                  }
                              );

                              user[0].Token = token;

                          }

                          req.session.email = req.body.email;
                          req.session.username = uname;
                          req.session.count = 0;
                          res.redirect('/join');
                      });

                  } catch (err) {
                      console.log(err);
                  }
              }
          }
      }
      )
  }

});

app.post('/register', async (req, res) => {
  var errors = []
  try {
      const { Username = req.body.username, Email = req.body.email, Password = req.body.password} = req.body;
      if(req.body.password != req.body.repeatPassword){
          res.render('register', { warn: 'Passwords does not match.' });
          return;
      }
      let userExists = false;


      var sql = "SELECT * FROM Users WHERE Email = ?"
      await db.all(sql, Email, (err, result) => {
          if (err) {
              res.status(402).json({ "error": err.message });
              return;
          }

          if (result.length === 0) {

              var salt = bcrypt.genSaltSync(10);

              var data = {
                  Username: Username,
                  Email: Email,
                  Password: bcrypt.hashSync(Password, salt),
                  Salt: salt,
                  DateCreated: Date('now')
              }

              var sql = 'INSERT INTO Users (Username, Email, Password, Salt, DateCreated) VALUES (?,?,?,?,?)'
              var params = [data.Username, data.Email, data.Password, data.Salt, Date('now')]
              var user = db.run(sql, params, function (err, innerResult) {
                  if (err) {
                      res.status(400).json({ "error": err.message })
                      return;
                  }

              });
          }
          else {
              userExists = true;
              res.render('register', { warn: 'User already exists!' }); 
          }
      });

      setTimeout(() => {
          if (!userExists) {
              res.redirect("/login");
          } else {
              res.render('register', { warn: 'User already exists!' });
          }
      }, 500);


  } catch (err) {
      console.log(err);
  }
})

app.all('*', function (req, res, next) {
  if (!req.session.email) {
      res.redirect("/login");
      return;
  }
  next();
});

app.get("/join", (req, res) => {
  res.render('joinRoom',{ uname: req.session.username})
});

app.get("/", (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room, uname: req.session.username});
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId, userName) => {
    socket.join(roomId);
    setTimeout(()=>{
      socket.to(roomId).broadcast.emit("user-connected", userId);
    }, 1000)
    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message, userName);
    });
    // socket.on('disconnect', () => {
    //     socket.broadcast.to(roomId).emit('user-disconnected', userId);
    //   socket.disconnect();
    // });
    socket.on('disconnect', () => {
    socket.broadcast.emit("user-disconnected", userId); 
    });
  });
});

app.get('/clear/logout', (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

server.listen(process.env.PORT || 3030);