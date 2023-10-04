const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
require('dotenv').config();



// Serve the static files (CSS, JS, etc.)
app.use(express.static(path.join(__dirname)));

const apiKey = process.env.OPENAI_API_KEY;
const url = "https://api.openai.com/v1/chat/completions";

var defaultPrompt = process.env.DEFAULT_PROMPT ;


async function getOpenAIResponse(userMessage) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: defaultPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 1.2,
        max_tokens: 128,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error from OpenAI API:', JSON.stringify(error, null, 2));
      throw new Error('API response not OK');
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;
    return assistantMessage;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

app.post('/message', async (req, res) => {
  const userMessage = req.body.message;
  const assistantMessage = await getOpenAIResponse(userMessage);
  res.send({ message: assistantMessage });
});

// Serve the Chat.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});













/////////////////////////////////////////////




const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
require('dotenv').config();


app.set('view engine', 'ejs');


const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const cloudinary = require('cloudinary').v2;

cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.API_KEY, 
  api_secret: process.env.API_SECRET 
});


app.use(session({
    secret: 'code',
    resave: false,
    saveUninitialized: true,
}));
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'Jim-blog-pictures',
    allowedFormats: ['jpg', 'png'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  }
});

const upload = multer({ storage: storage });

app.use(passport.initialize());
app.use(passport.session());

const MONGODB_URI = process.env.MONGO_URI;

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Connected to MongoDB!");
    })
    .catch(error => {
        console.log("error:", error.message);
    });
    
    app.get('/api/isUserLoggedIn', (req, res) => {
        if (req.isAuthenticated()) {
            res.json({ loggedIn: true });
        } else {
            res.json({ loggedIn: false });
        }
    });



// Хранение блог-постов
const postSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    title: String,
    content: String,
    image: String,
    category: String, 
    date: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

passport.use(new LocalStrategy(
    function(username, password, done) {
        if (username === 'Chakki2209' && password === 'Tanichka1') {
            return done(null, { id: 'user_id', name: 'Charlie' });
        } else {
            return done(null, false, { message: 'Incorrect login details.' });
        }
    }
));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    if (id === 'user_id') {
        done(null, { id: 'user_id', name: 'Jim' });
    } else {
        done(new Error('User not found'));
    }
});


function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(403).send('Доступ запрещен, ты не залогинен!');
}




app.post('/api/addpost',ensureAuthenticated, upload.single('postImage'), async (req, res) => {

     let imageUrl = null;
    
     if (req.file) {
        // Загрузка изображения на Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path);
        imageUrl = result.url;
        publicId = result.public_id; 
    }

    console.log("Attempting to add a post with data:", req.body);
    try {
        const newPost = new Post({
            _id: new mongoose.Types.ObjectId(),
            title: req.body.title,
            content: req.body.content,
            image: imageUrl, // здесь мы используем URL из Cloudinary
            category: req.body.category,
            date: req.body.date
        });
        await newPost.save();
        res.json({ success: true, message: 'Пост успешно добавлен!' });
    } catch (err) {
        console.error("Error while adding post:", err);
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/blogposts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ _id: -1 });
        res.json({ success: true, posts });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});



app.delete('/api/deletepost/:postId',ensureAuthenticated, async (req, res) => {
    try {
        await Post.deleteOne({ _id: req.params.postId });
        res.status(200).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});




app.post('/api/editpost/:postId',ensureAuthenticated, upload.single('postImage'), async (req, res) => {
    const postId = req.params.postId;
    
    let imageUrl;
    if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path);
        imageUrl = result.url;
    } else if (req.body.removeImage === 'true') {
        imageUrl = null;
    } else {
        imageUrl = undefined; // Оставь значение неизменным, если изображение не было загружено или удалено
    }

    // Удостоверимся, что мы не отправляем пустые значения в базу данных
    const updatedData = {};
    if (req.body.title) updatedData.title = req.body.title;
    if (req.body.content) updatedData.content = req.body.content;
    if (imageUrl !== undefined) updatedData.image = imageUrl;
    if (req.body.category) updatedData.category = req.body.category;

    try {
        await Post.findByIdAndUpdate(postId, updatedData);
        res.json({ success: true, message: 'Пост успешно обновлен, брат!' });
    } catch (err) {
        console.error("Ошибка при обновлении поста:", err);
        res.json({ success: false, message: 'Блять, какая-то ошибка: ' + err.message });
    }
});



app.get('/blog', async (req, res) => {
    try {
        const posts = await Post.find(); 
        if (req.isAuthenticated()) {
            res.render('blog_edit', { posts: posts, isUserLoggedIn: true });
        } else {
            res.render('blog', { posts: posts, isUserLoggedIn: false });  
        }
    } catch (error) {
        console.error("Ошибка при получении постов:", error);
        res.status(500).send('Ошибка сервера');
    }
    
});


app.get('/slogin', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});



app.post('/slogin', 
    passport.authenticate('local', { failureRedirect: '/slogin' }),
    function(req, res) {
        req.session.editMode = true; 
        res.redirect('/blog.html'); 
    }
);

app.get('/logout', function(req, res) {
    req.logout(() => {}); // Пустой callback
    req.session.editMode = false;
    res.redirect('/');
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/.`);
});
