require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
const path = require("path");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = 3000;

// Database Connection
const uri = process.env.MONGO_URI; // Store in .env for security
const client = new MongoClient(uri);
let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db("assignment4");
        console.log("Connected to MongoDB");
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
    }
}
connectDB();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
app.use(cors());
app.set("view engine", "ejs");

// FatSecret API Credentials
const CLIENT_ID = process.env.FATSECRET_CLIENT_ID;
const CLIENT_SECRET = process.env.FATSECRET_CLIENT_SECRET;
const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const API_URL = "https://platform.fatsecret.com/rest/server.api";

let accessToken = null;
let tokenExpiry = 0;

// Function to get FatSecret access token
async function getAccessToken() {
    try {
        const response = await axios.post(TOKEN_URL, null, {
            params: {
                grant_type: 'client_credentials',
                client_id: process.env.FATSECRET_CLIENT_ID,
                client_secret: process.env.FATSECRET_CLIENT_SECRET,
				scope: "basic",
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching access token:', error.response?.data || error.message);
        return null;
    }
}

app.post('/search', async (req, res) => {
    const { query } = req.body;
    const token = await getAccessToken();
    if (!token) {
        return res.status(500).send('Failed to retrieve access token.');
    }

    try {
        const response = await axios.get(API_URL, {
            params: {
                method: 'recipes.search',
                search_expression: query,
                format: 'json',
            },
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const recipes = response.data.recipes.recipe;
        res.render('index', { recipes });
    } catch (error) {
        console.error('Error fetching recipes:', error.response?.data || error.message);
        res.status(500).send('Failed to fetch recipes.');
    }
});

// Localization Middleware
app.use((req, res, next) => {
    req.session.lang = req.query.lang || req.session.lang || "en";
    res.locals.session = req.session || {};
    res.locals.lang = req.session.lang || "en";
    next();
});

// Authentication Middleware
const isAuthenticated = (req, res, next) => req.session.user ? next() : res.redirect('/login');
const isAdmin = (req, res, next) => req.session.user?.admin ? next() : res.redirect('/');

// User Registration
app.get('/register', (req, res) => {
	res.render('register', { message: "", lang: req.session.lang || "en" });
});
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const existingUser = await db.collection('users').findOne({ username });

    if (existingUser) return res.render('register', { message: 'Username already exists!' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection('users').insertOne({
        username, password: hashedPassword, admin: username === "Rustemdastan", createdAt: new Date()
    });

    res.redirect('/login');
});

// User Login
app.get('/login', (req, res) => {
    res.render('login', { message: "", lang: req.session.lang || "en" });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await db.collection('users').findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.render('login', { message: 'Invalid username or password!', lang: req.session.lang || "en" });
    }

    req.session.user = user;
    res.redirect('/index');
});

// Logout
app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

// Admin Panel
app.get('/admin', isAdmin, async (req, res) => {
    const users = await db.collection('users').find().toArray();
    const items = await db.collection('cookingItems').find().toArray();
    res.render('admin', { users, items, lang: req.session.lang || "en" });  // Single response
});

app.post('/admin/add-user', isAdmin, async (req, res) => {
    const { username, password, admin } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection('users').insertOne({
        username, password: hashedPassword, admin: admin === "on", createdAt: new Date()
    });
    res.redirect('/admin');
});

app.post('/admin/delete-user/:id', isAdmin, async (req, res) => {
    await db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) });
    res.redirect('/admin');
});

// Manage dishes
app.post('/admin/add', isAdmin, async (req, res) => {
    const { name_en, name_ru, desc_en, desc_local, img1, img2, img3 } = req.body;
    await db.collection('cookingItems').insertOne({
        name_en, name_ru, desc_en, desc_local, images: [img1, img2, img3],
        createdAt: new Date(), updatedAt: null, deletedAt: null
    });
    res.redirect('/admin');
});

app.post('/admin/delete/:id', isAdmin, async (req, res) => {
    await db.collection('cookingItems').deleteOne({ _id: new ObjectId(req.params.id) });
    res.redirect('/admin');
});

// Sample Route
app.get("/", (req, res) => {
	res.render('index', { items, lang: req.session.lang || "en" });
});

// Main page
app.get("/index", async (req, res) => {
    try {
        const items = await db.collection('cookingItems').find().toArray();
        res.render("index", { items, lang: req.session.lang || "en" });
    } catch (error) {
        console.error("Error fetching items:", error);
        res.render("index", { items: [], lang: req.session.lang || "en" });
    }
});

// Quiz Functionality
app.get('/quiz', isAuthenticated, async (req, res, next) => {
    try {
        const questions = await db.collection('quizzes').aggregate([{ $sample: { size: 5 } }]).toArray();
        res.render('quiz', { 
            questions, 
            timeLimit: 60, 
            lang: req.session.lang || "en",
            score: null,
            total: null
        });
    } catch (error) {
        next(error);
    }
});

app.post('/quiz/submit', isAuthenticated, async (req, res) => {
    let score = 0;
    const answers = req.body;
    const questions = await db.collection('quizzes')
        .find({ _id: { $in: Object.keys(answers).map(id => new ObjectId(id)) } })
        .toArray();

    questions.forEach(q => {
        if (answers[q._id] === q.correctAnswer) score++;
    });

    res.render('quizResult', { score, total: questions.length });
});

// Social Sharing
app.get('/share', (req, res) => res.render('share', { score: req.query.score, total: req.query.total }));

// Start Server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));