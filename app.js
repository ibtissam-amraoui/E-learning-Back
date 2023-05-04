const express = require('express');
const mongoose = require('mongoose');
const app = express();
const cors = require("cors");
app.use(cors());
const bcrypt = require("bcryptjs");
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
const jwt = require("jsonwebtoken");
var nodemailer = require('nodemailer');
const JWT_SECRET = "jrokfjroifjpùrofjprùofprùofprofpùrofprofrfjl,,lkkknfmrkfj[]jforifjioj?orkorfk";
const Course = require('./db/Course');
const CartItem = require('./db/cartItem.js');



const bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: '10mb' }));



// Connexion à la base de données MongoDB
mongoose.connect('mongodb://ibtissam:ibtissammongodb@ac-vgswrne-shard-00-00.opdhkzo.mongodb.net:27017,ac-vgswrne-shard-00-01.opdhkzo.mongodb.net:27017,ac-vgswrne-shard-00-02.opdhkzo.mongodb.net:27017/E-learning?ssl=true&replicaSet=atlas-imq6yc-shard-0&authSource=admin&retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to database');
}).catch(err => {
  console.log('Error connecting to database:', err);
});

const cartItemSchema = new mongoose.Schema({
  name: String,
  price: String,
  category: String,
  field: String,
  teacherId: String,
  description: String,
  image: String,
},
{
  collection: "Cart"
});
const cartSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  items: [cartItemSchema]
});
const Cart = mongoose.model('Cart', cartSchema,"Cart");


// Création du modèle de données pour les professeurs
const TeacherSchema = new mongoose.Schema({
  fname: String,
  lname: String,
  email: String,
  password: { type: String, unique: true },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'], // Role can be 'student' or 'teacher'
    required: true,
    default: 'teacher' // Default role is 'student'
  }
},
  {
    collection: "Teacher"
  }
);
const Professeur = mongoose.model('Professeur', TeacherSchema, 'Teacher');


// Création du modèle de données pour les admins
const AdminSchema = new mongoose.Schema({
  fname: String,
  lname: String,
  email: String,
  userType: String,
  password: { type: String, unique: true },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'], // Role can be 'student' or 'teacher'
    required: true,
    default: 'admin' // Default role is 'student'
  }
},
  {
    collection: "Admins"
  }
);

const Admin = mongoose.model('Admin', AdminSchema, 'Admins');


// Création du modèle de données pour les étudiants
const StudentSchema = new mongoose.Schema({
  fname: String,
  lname: String,
  email: String,
  password: { type: String, unique: true },
  userType: String,
  role: {
    type: String,
    enum: ['student', 'teacher'], // Role can be 'student' or 'teacher'
    required: true,
    default: 'student' // Default role is 'student'
  }
},
  {
    collection: "Student",
  }
);
const Etudiant = mongoose.model('Etudiant', StudentSchema, 'Student');


// parse requests of content-type - application/json
app.use(bodyParser.json());


// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
app.get('/api/check-email', (req, res) => {
  const emailExists = Professeur.some(user => user.email === req.query.email);
  res.json({ exists: emailExists });
});


app.post('/upload', (req, res) => {
  console.log(req, res)
});


//Route pour l'inscription des professeurs:
app.post('/register-teacher', async (req, res) => {
  const { fname, lname, email, password } = req.body;
  const encryptedPassword = await bcrypt.hash(password, 10);
  try {
    const oldUser = await Professeur.findOne({ email });
    if (oldUser) {
      return res.json({ error: "User Exists" })
    }
    await Professeur.create({
      fname,
      lname,
      email,
      password: encryptedPassword,
    });
    res.send({ status: "OK" });
  } catch (error) {
    res.send({ status: "Error" });
  }
});
app.post('/register-student', async (req, res) => {
  const { fname, lname, email, password, userType } = req.body;
  const encryptedPassword = await bcrypt.hash(password, 10);
  try {
    const oldUser = await Etudiant.findOne({ email });
    if (oldUser) {
      return res.json({ error: "User Exists" })
    }
    //if(userType=="student"){
    await Etudiant.create({
      fname,
      lname,
      email,
      password: encryptedPassword,
      userType,
    });
    res.send({ status: "OK" });/*}else if(userType=="admin"){
      await Admin.create({
        fname,
        lname,
        email,
        password: encryptedPassword,
        userType,
      });
      res.send({ status: "OK" });
}*/
  } catch (error) {
    res.send({ status: "Error" });

  }
});


//LOGIN API
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Vérifier si l'utilisateur est un professeur ou un étudiant
  let user = await Professeur.findOne({ email });
  let role = "teacher";
  if (!user) {
    user = await Etudiant.findOne({ email });
    role = "student";
  }
  if (!user) {
    user = await Admin.findOne({ email });
    role = "admin";
  }

  if (!user) {
    // Si l'utilisateur n'existe pas, renvoyer une erreur
    return res.json({ status: "error", message: "User not found" });
  }

  // Comparer le mot de passe avec le hash stocké dans la base de données
  if (await bcrypt.compare(password, user.password)) {
    // Si le mot de passe ne correspond pas, renvoyer une erreur
    //const token = jwt.sign({ role }, JWT_SECRET);
    const token = jwt.sign({ _id: user._id, role }, JWT_SECRET);

    // Add the token and role to the response JSON object
    return res.json({
      status: "OK",
      data: {
        token,
        userId: user._id,
        role
      }
    });
  } else {
    return res.json({ status: "error", error: "Invalid Password" });
  }
});



//Redirect student to his space
app.post("/studentSpace", async (req, res) => {
  const { token } = req.body;
  try {
    const student = jwt.verify(token, JWT_SECRET);
    const studentEmail = student.email;
    Etudiant.findOne({ email: studentEmail })
      .then((data) => {
        res.send({ status: "OK", data: data });
      }).catch((error) => {
        res.send({ status: "error", data: data });
      });
  } catch (error) {
  }
});


//Redirect teacher to his space
app.post("/teacherSpace", async (req, res) => {
  const { token } = req.body;
  try {
    const teacher = jwt.verify(token, JWT_SECRET);
    const teacherEmail = teacher.email;
    Professeur.findOne({ email: teacherEmail })
      .then((data) => {
        res.send({ status: "OK", data: data });
      }).catch((error) => {
        res.send({ status: "error", data: data });
      });
  } catch (error) {

  }

});


//Redirect admin to his space
app.post("/adminSpace", async (req, res) => {
  const { token } = req.body;
  try {
    const admin = jwt.verify(token, JWT_SECRET);
    const adminEmail = admin.email;
    Admin.findOne({ email: adminEmail })
      .then((data) => {
        res.send({ status: "OK", data: data });
      }).catch((error) => {
        res.send({ status: "error", data: data });
      });
  } catch (error) {
  }
});


//Forget password api
app.post("/forgetPassword", async (req, res) => {
  const { email } = req.body;
  try {
    let oldUser = await Etudiant.findOne({ email });
    if (!oldUser) {
      oldUser = await Professeur.findOne({ email });
      if (!oldUser) {
        return res.json({ status: "User does not exist" });
      }
    }
    const secret = JWT_SECRET + oldUser.password;
    const token = jwt.sign({ email: oldUser.email, id: oldUser._id }, secret, {
      expiresIn: '5m'
    });
    const link = `http://localhost:8000/resetPassword/${oldUser._id}/${token}`;
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'ibra.helpp@gmail.com',
        pass: 'wigugsbykcadygfa'
      }
    });

    const mailOptions = {
      from: "youremail@gmail.com",
      to: email,
      subject: "Resetting password",
      html: `<p>Follow the link below to reset your password :</p><a href="${link}">${link}</a>`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
    return res.json({
      status: "OK"
    });
  } catch (error) {
    console.log(error);
    return res.json({ status: "Error occurred" });
  }
});


//resetPassword api
app.get("/resetPassword/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  console.log(req.params);
  let oldUser = await Etudiant.findOne({ _id: id });
  if (oldUser) {
    const secret = JWT_SECRET + oldUser.password;

    try {
      const verify = jwt.verify(token, secret);
      res.render("index", { email: verify.email, status: "Not verified" })
    } catch (error) {
      console.log(error);
      res.send("Not Verified");
    }
  } else {
    oldUser = await Professeur.findOne({ _id: id });
    if (oldUser) {
      const secret = JWT_SECRET + oldUser.password;

      try {
        const verify = jwt.verify(token, secret);
        res.render("index", { email: verify.email, status: "Not verified" })
      } catch (error) {
        console.log(error);
        res.send("Not Verified");
      }
    }
  }
});


//resetPassword api
app.post("/resetPassword/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;
  let oldUser = await Etudiant.findOne({ _id: id });
  if (oldUser) {
    const secret = JWT_SECRET + oldUser.password;

    try {
      const verify = jwt.verify(token, secret);
      const encryptedPassword = await bcrypt.hash(password, 10);
      await Etudiant.updateOne({
        _id: id,
      },
        {
          $set: {
            password: encryptedPassword,
          },
        });
      res.render("index", { email: verify.email, status: "Verified" })
      res.render("index", { message: "Password reset successfully" });
    } catch (error) {
      console.log(error);
      res.json({ status: "Something went wrong" });
    }
  }
  else {
    oldUser = await Professeur.findOne({ _id: id });
    if (oldUser) {
      const secret = JWT_SECRET + oldUser.password;
      try {
        const verify = jwt.verify(token, secret);
        const encryptedPassword = await bcrypt.hash(password, 10);
        await Professeur.updateOne({
          _id: id,
        },
          {
            $set: {
              password: encryptedPassword,
            },
          });
        res.render("index", { email: verify.email, status: "Verified" })
        res.render("index", { message: "Password reset successfully" });
      } catch (error) {
        console.log(error);
        res.json({ status: "Something went wrong" });
      }
    }
  }
});
app.get('/profile/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await Professeur.findById(userId);
    res.render('profile', { user });
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});


//display courses list
app.get("/coursesA", async (req, res) => {
  const courses = await Course.find();
  if (courses.length > 0) {
    res.send(courses);
  } else {
    res.send({ result: "No course found !" })
  }
})


//delete a course
app.delete("/coursesA/:id", async (req, res) => {
  let result = await Course.deleteOne({ _id: req.params.id });
  res.send(result);
}),


  //display courses list
  app.get("/courses/:teacherId", async (req, res) => {
    const courses = await Course.find({ teacherId: req.params.teacherId });
    if (courses.length > 0) {
      res.send(courses);
    } else {
      res.send({ "result": "No REcord Found." });
    }
  })


//delete a course
app.delete("/courses/:id", async (req, res) => {
  let result = await Course.deleteOne({ _id: req.params.id });
  res.send(result);
}),


  //display teachers list
  app.get("/teachers", async (req, res) => {
    const teachers = await Professeur.find();
    if (teachers.length > 0) {
      res.send(teachers);
    } else {
      res.send({ result: "No teacher found !" })
    }
  })


//delete a teacher
app.delete("/teachers/:id", async (req, res) => {
  let result = await Professeur.deleteOne({ _id: req.params.id });
  res.send(result);
}),


  //display students list
  app.get("/students", async (req, res) => {
    const students = await Etudiant.find();
    if (students.length > 0) {
      res.send(students);
    } else {
      res.send({ result: "No student found !" })
    }
  })


//delete a student
app.delete("/students/:id", async (req, res) => {
  let result = await Etudiant.deleteOne({ _id: req.params.id });
  res.send(result);
}),



  //Add a new course

  app.post('/add-course', async (req, res) => {
    const { base64 } = req.body;
    const courseData = req.body;

    try {
      // Store the image in the course data
      courseData.image = base64;

      // Store the course data in the Course collection
      const course = new Course(courseData);
      const result = await course.save();

      //res.send(result);
      res.send({ status: "OK" });
    } catch (error) {
      res.send({ Status: "error", data: error });
    }
  });


app.get("/get-image", async (req, res) => {
  try {
    await Images.find({}).then(data => {
      res.send({ status: "ok", data: data })
    })

  } catch (error) {

  }
})

//update course

app.get("/course/:id", async (req, res) => {
  let result = await Course.findOne({ _id: req.params.id });
  if (result) {
    res.send(result);
  }
  else {
    res.send({ "result": "No REcord Found." });
  }

});


app.put("/course/:id", async(req, res) => {
  let result = await Course.updateOne(
    {
      _id: req.params.id
    },
    {
      $set: req.body

    }
  )
  res.send(result);
})

app.get("/teachers/:id", async (req, res) => {
  let result = await Professeur.findOne({ _id: req.params.id });
  if (result) {
    res.send(result);
  }
  else {
    res.send({ "result": "No REcord Found." });
  }

});


app.put("/teachers/:id", async(req, res) => {
  let result = await Professeur.updateOne(
    {
      _id: req.params.id
    },
    {
      $set: req.body

    }
  )
  res.send(result);
})

app.get("/students/:id", async (req, res) => {
  let result = await Etudiant.findOne({ _id: req.params.id });
  if (result) {
    res.send(result);
  }
  else {
    res.send({ "result": "No REcord Found." });
  }

});


app.put("/students/:id", async(req, res) => {
  let result = await Etudiant.updateOne(
    {
      _id: req.params.id
    },
    {
      $set: req.body

    }
  )
  res.send(result);
})

app.post('/cart/:studentId', async (req, res) => {
  const { studentId } = req.params;
  const { name,price,category,field,teacherId,description,image}= req.body;

  const cartItem = new CartItem({name,price,category,field,teacherId,description,image });

  try {
    const cart = await Cart.findOne({ studentId });
    if (cart) {
      cart.items.push(cartItem);
      await cart.save();
    } else {
      const newCart = new Cart({ studentId, items: [cartItem] });
      await newCart.save();
    }
    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});




app.listen(8000, () => {
  console.log('Serveur en écoute sur le port 8000');
});


