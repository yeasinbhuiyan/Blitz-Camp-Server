const express = require('express');
const app = express()
const cors = require('cors');
const port = process.env.PORT || 5000
require('dotenv').config()



const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())





const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.9xgdj4e.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const database = client.db("BlitzDb");
        const usersCollection = database.collection("users");
        const classesCollection = database.collection("classes");



        // users methods 

        app.put('/users', async (req, res) => {
            const user = req.body
            console.log(user)
            const query = { email: user.email }

            const checkUser = await usersCollection.findOne(query)
            if (checkUser) {
                return res.send({ message: 'user already exists' })
            }

            const options = { upsert: true }
            const updateDoc = {
                $set: user,
            }
            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })


        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray()
            // console.log('get user', result)
            res.send(result)
        })


        app.get('/users/:email', async (req, res) => {
            const email = req.params.email
            console.log(email)
            const query = { email: email }
            console.log(query)
            // const result = await usersCollection.find().toArray() 
            const result = await usersCollection.findOne(query)
            console.log('getuser', result)
            if (result) {
                res.send(result)
            }
            else {
                res.send({})
            }
        })







        // admin  
        app.get('/users/admin/:email', async (req, res) => {

            const email = req.params.email

            // if (req.decoded.email !== email) {
            //     res.send({ admin: false })
            // }

            const query = { email: email }
            const user = await usersCollection.findOne(query)

            // ToDo 
            const result = { admin: user?.status === 'admin' }
            res.send(result)

        })




        // instructor 
        app.post('/added-class', async (req, res) => {
            const classes = req.body
            const result = await classesCollection.insertOne(classes)
            res.send(result)

        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('this server name is Blitz Camp')
})

app.listen(port, () => {
    console.log(`this Server Running On ${port}`)
})