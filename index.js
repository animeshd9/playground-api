const express = require('express')
require('dotenv').config()
const bodyParser = require('body-parser')
const { rabbitMQConnection } = require('./src/helpers/rabbitMq')
const { User } = require('./src/models/users')
const app = express()
const mongoose = require('mongoose')
const port = 3001 || process.env.port

app.use(bodyParser.json())


app.post('/signup', async ( req, res) => {
    try {
        const user = await User.findOne( { email: req.body.email }).sort({ createdAt: -1}).lean()
        console.log( user )
        if( user && user.inQueue ) {
          user.waitingTime = 5000
          return res.status(200).json({
            status:"Success",
            data: user
          })
        }
        const item = await User.create(req.body)
        await rabbitMQConnection.sendMessage( 'playground_queue', item )

        res.status(200).json( {
            status:"Success",
            message: "You're on the queue. Please check your email for more details. Thank you",
          })
      
    } catch (e) {
        console.log(e)
    }
} )

app.get('/status', async ( req, res) => {
  try {
    const { email } = req.query
    console.log(email)
    const user = await User.findOne({ "email": email, "active": true }).lean()
    console.log(user)

    /**
     * calculate the estimated time
     */

    if( user ) {
      user.waitingTime = 5000
      return res.status(200).json({
        status:"Success",
        data: user
      })
    }
    res.status(200).json( {
      message: "Please sign up again",
    })
  } catch (error) {
    
  }
})


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