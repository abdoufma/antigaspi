//@ts-check
const express = require('express');
const {join} = require('path');
const hbs = require('hbs');
const session = require('express-session');
const router = require('./router');
const {sessionConfig} = require('./config');
const PORT = process.env.PORT || 80;


const app = express();

app.set('view engine', 'html');
app.engine('html', hbs.__express);

app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(session(sessionConfig));
app.use(express.static(join(__dirname, 'public')));
app.set('views', join(__dirname, '/public'));
app.use(router);

// app.use((_, res, next) => res.render("404", {message: "you done fu**ed up son!"}));


app.listen(PORT, () => console.log(`listenning on *:${PORT}`));
