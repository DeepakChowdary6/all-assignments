const express = require('express');
const app = express();
const mongoose=require('mongoose')
const jwt=require('jsonwebtoken')

app.use(express.json());

const SECRET='jiwonlabg39yb'

const userSchema=new mongoose.Schema({
  username:{type:String},
  password:{type:String},
  purchasedCourses:[{type:mongoose.Schema.Types.ObjectId,ref:'Course'}]
})
const adminSchema=new mongoose.Schema({
  username:{type:String},
  password:{type:String},
})

const courseSchema=new mongoose.Schema({
  title:String,
  description:String,
  price:Number,
  imageLink:String,
  published:Boolean
})
const User=new mongoose.model('User',userSchema);
const Course=new mongoose.model('Course',courseSchema);
const Admin=new mongoose.model('Admin',adminSchema);

mongoose.connect('mongodb+srv://deepak:p4biHpYKxcND1G7b@cluster0.7aofybd.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true, dbName: "courses" });
const authenticateJwt=(req,res,next)=>{
const authHeader=req.headers.authorization;
if(authHeader){
  const token=authHeader.split(" ")[1];
  jwt.verify(token,SECRET,(err,user)=>{
    if(err){
      return res.sendStatus(403);
    }
    req.user=user;
    next();
  })
}else{
  return res.statusCode(401);//if the request is unauthorized it is used as a status code
}
}

// Admin routes
app.post('/admin/signup', async (req, res) => {
  // logic to sign up admin
const {username,password}=req.body;
const admin=await Admin.findOne({username});
if(admin){
  res.statusCode(403).json({message:"Admin already exists"});
}else{
 const obj={username:username,password:password};
  const newAdmin=new Admin(obj);
  newAdmin.save();
  const token=jwt.sign({username,role:'admin'},SECRET,{expiresIn:'1h'});

  res.json({message:"Admin Created Successfully",token});

}

});

app.post('/admin/login', async (req, res) => {
  // logic to log in admin
  const {username,password}=req.body;
  const admin=await Admin.findOne({username,password});
  if(admin){
    const token=jwt.sign({username,role:'admin'},SECRET,{expiresIn:'1h'});
    res.json({message:"Logged in Successfully",token});
  }else{
    res.statusCode(403).send({message:"Invalid username or password"})
  }
});

app.post('/admin/courses',authenticateJwt,async (req, res) => {
  // logic to create a course
  const course=new Course(req.body);
  await course.save();
  res.json({message:"Course created successfully",courseId:course.id});

});

app.put('/admin/courses/:courseId',authenticateJwt, (req, res) => {
  // logic to edit a course
  const course=Course.findIdAndUpdate(req.params.courseId,req.body,{new:true});
  if(course){
     res.json({message:"course updated successfully"});
  }else{
    res.statusCode(403).json({message:'Course not found'});
  }
});

app.get('/admin/courses',authenticateJwt, (req, res) => {
  // logic to get all courses
  const courses=Course.find({});
  res.json({courses});
});

// User routes
app.post('/users/signup', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user) {
    res.status(403).json({ message: 'User already exists' });
  } else {
    const newUser = new User({ username, password });
    await newUser.save();
    const token = jwt.sign({ username, role: 'user' }, SECRET, { expiresIn: '1h' });
    res.json({ message: 'User created successfully', token });
  }
});

app.post('/users/login', async (req, res) => {
  const { username, password } = req.headers;
  const user = await User.findOne({ username, password });
  if (user) {
    const token = jwt.sign({ username, role: 'user' }, SECRET, { expiresIn: '1h' });
    res.json({ message: 'Logged in successfully', token });
  } else {
    res.status(403).json({ message: 'Invalid username or password' });
  }
});

app.get('/users/courses',authenticateJwt, async (req, res) => {
  // logic to list all courses
  const courses = await Course.find({published: true});
  res.json({ courses });
});

app.post('/users/courses/:courseId', authenticateJwt,async(req, res) => {
  // logic to purchase a course
  const course = await Course.findById(req.params.courseId);
  console.log(course);
  if (course) {
    const user = await User.findOne({ username: req.user.username });
    if (user) {
      user.purchasedCourses.push(course);
      await user.save();
      res.json({ message: 'Course purchased successfully' });
    } else {
      res.status(403).json({ message: 'User not found' });
    }
  } else {
    res.status(404).json({ message: 'Course not found' });
  }
});

app.get('/users/purchasedCourses',authenticateJwt,async(req, res) => {
  // logic to view purchased courses
  const user = await User.findOne({ username: req.user.username }).populate('purchasedCourses');
  if (user) {
    res.json({ purchasedCourses: user.purchasedCourses || [] });
  } else {
    res.status(403).json({ message: 'User not found' });
  }
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
