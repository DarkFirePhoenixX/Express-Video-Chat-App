const express = require("express");
var nodemailer = require("nodemailer");
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

var smtpTransport = nodemailer.createTransport({
  host: "mail.smtp2go.com",
  port: 2525, // 8025, 587 and 25 can also be used.
  secure: false,
  auth: { 
  user: 'YOUR USERNAME',
  pass: 'YOUR PASSWORD',
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
  DateCreated DATE,
  PasswordReset text
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
  res.render('login', { warn: '' });
});

app.get("/register", (req, res) => {
  res.render('register', { warn: '' })
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
    const { Username = req.body.username, Email = req.body.email, Password = req.body.password } = req.body;
    if (req.body.password != req.body.repeatPassword) {
      res.render('register', { warn: 'Passwords do not match.' });
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
        res.render('register', { warn: 'Email already taken!' });
      }
    });

    setTimeout(() => {
      if (!userExists) {
        res.redirect('/login')
      } else {
        res.render('register', { warn: 'Email already taken!' });
      }
    }, 500);


  } catch (err) {
    console.log(err);
  }
})

app.get("/forgotten-password", (req, res) => {
  res.render('forgot-password',{warn: ''})
});

app.get("/forgotten-password", (req, res) => {
  res.redirect(`/forgot-password`);
});

app.post("/forgotten-password", (req, res) => {
  var sql = "SELECT Username FROM Users WHERE Email = ?"
  db.all(sql, req.body.email, (err, result) => {
    if (result.length === 0) {
      console.log(result)
      res.render(`forgot-password`,{warn: 'Provided email does not exist.'});
    }
    else {
      var passwordResetLink = uuidv4() + uuidv4();
      smtpTransport.sendMail({
        from: "s.slavkov@students.ue-varna.bg",
        to: `${req.body.email}`,
        subject: "Password reset link",
        text: `Your password reset link: https://2490-212-50-20-62.ngrok-free.app/renew-password/${passwordResetLink}`
        }, function(error, response){
        if(error){
        console.log(error);
        }else{
        console.log("Message sent: " + response.message);
        }
        });
      console.log(result)
      db.run(`UPDATE Users
            SET PasswordReset = ?,
              DateLoggedIn = DATETIME('now','localtime')
            WHERE Email = ?;`,
        passwordResetLink,
        req.body.email,
        (err) => {
          if (err) throw err;
        });
        res.render(`forgot-password`,{warn: 'Password reset link sent.'});
    }
  });
});

app.get("/renew-password/:id", (req, res) => {
  res.render('renew-password')
});

app.get("/renew-password/:id", (req, res) => {
  res.redirect(`renew-password`);
});

app.post("/renew-password", (req, res) => {
  var sql = "SELECT * FROM Users WHERE PasswordReset = ?"
    db.all(sql, req.body.resetLinkId, (err, result) => {
      if (err) {
        res.status(402).json({ "error": err.message });
      }
      if (result.length === 0) {
          console.log(result)
          res.send("<div style='display: flex; justify-content: center; align-items: center; height: 80vh'><h1>Link expired or invalid! Go back to: <a style='margin-left: 5px !important; text-decoration: none'  href='/login/'> Main page</a></h1></div>");
      }
      else{
        if (req.body.password == '') {
          res.render('renew-password', { warn: 'No password supplied.' });
        }
        else {
          var salt = bcrypt.genSaltSync(10);
          var passwordAlreadyReset = uuidv4() + uuidv4();
          db.run(`UPDATE Users
                  SET Password = ?,
                    Salt = ?,
                    PasswordReset = ?,
                    DateLoggedIn = DATETIME('now','localtime')
                  WHERE PasswordReset = ?;`,
            bcrypt.hashSync(req.body.password, salt),
            salt,
            passwordAlreadyReset,
            req.body.resetLinkId,
            (err) => {
              if (err) throw err;
            });
          res.redirect(`/renew-password`);
        }
      }
    });
  
});

app.all('*', function (req, res, next) {
  if (!req.session.email) {
    res.redirect("/login");
    return;
  }
  next();
});

app.get("/join", (req, res) => {
  res.render('joinRoom', { uname: req.session.username })
});

app.get("/", (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room, uname: req.session.username });
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId, userName) => {
    socket.join(roomId);
    setTimeout(() => {
      socket.to(roomId).broadcast.emit("user-connected", userId);
    }, 1000)
    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message, userName);
    });
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