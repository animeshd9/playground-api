const express = require('express')
require('dotenv').config()
const bodyParser = require('body-parser')
const cors = require('cors')
const { rabbitMQConnection } = require('./src/helpers/rabbitMq')
const { User } = require('./src/models/users')
const app = express()
const mongoose = require('mongoose')
const port = 3001 || process.env.port

app.use(cors());
app.use(bodyParser.json())


app.post('/singup', async ( req, res) => {
    try {
        const user = await User.findOne( { email: req.body.email })
        if( user && user.inQueue && user.haveContainer ) {
            res.status(500).json( { status: "Conflict", message: "User already in the queue or already assigned a docker container" })
        }
        const item = await User.create(req.body)
        await rabbitMQConnection.sendMessage( 'playground_queue', item )
        res.status(200).json( {
            status:"Success",
            message: "You're on the queue. Please check your email for more details. Thank you"
          })
      
    } catch (e) {
        console.log(e)
    }
} )

app.post('/enter', async ( req, res) => {})


app.listen( port, async () => {
    await connectAndStartQueueProducer()
    await conntectToDB();
    console.log(`Server is running on http://localhost:${port}`);

})

const conntectToDB = async () => {
    try {
      await mongoose.connect(process.env.MONGO_URL);
      console.log("Connected to db");
    } catch (error) {
      console.log(error);
    }
  };
  

const connectAndStartQueueProducer = async () => {
    await rabbitMQConnection.connect()
    await rabbitMQConnection.createQueue('playground_queue')
}