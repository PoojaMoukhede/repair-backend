const express =require('express');
const bodyParser=require("body-parser");
const app = express()
const cors = require('cors');
const mysql = require("mysql2");
const login = require('./Router/LoginRegister')
const customer = require('./Router/AddCustumber')
const orders = require('./Router/Order')

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

app.use('/',login)
app.use('/',customer)
app.use('/',orders)


app.listen(8000,()=>{
    console.log(`app running in ${8000}` )
}) 