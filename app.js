//@ts-check
const express = require('express');
const {join} = require('path');
const session = require('express-session');
const router = require('./router');
const {sessionConfig} = require('./config');
const PORT = 80;


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(session(sessionConfig));
app.use(express.static(join(__dirname,'public')));
app.use(router);


app.listen(PORT, () => console.log(`listenning on *:${PORT}`));
