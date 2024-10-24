require('dotenv').config();
const path = require('path');
const express = require('express');
const userRecommendationsController = require('./controllers/userRecommendationsController.js');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', userRecommendationsController);

app.listen( process.env.PORT, () => console.log('Server running at http://localhost:3000'));
