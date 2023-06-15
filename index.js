const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRECT_KEY)


const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())


const verifyJWT = (req, res, next) => {


    const authorization = req.headers.authorization



    if (!authorization) {

        return res.status(403).send({ error: true, message: 'unauthorization author' })

    }

    const token = authorization.split(' ')[1]


    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {


        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorization err' })
        }

        req.decoded = decoded

        next()

    });

}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        // await client.connect();

        const database = client.db("BlitzDb");
        const usersCollection = database.collection("users");

        const classesCollection = database.collection("classes");
        const selectedClassCollection = database.collection("selectedClass");
        const paymentCollection = database.collection("payments");



        // jwt method 
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            if (user?.status !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' })
            }
            next()


        }


        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            if (user?.status !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden message' })
            }
            next()


        }

        const verifyStudent = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            if (user?.status !== 'student') {
                return res.status(403).send({ error: true, message: 'forbidden message' })
            }
            next()


        }



        app.post('/jwt', (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
                expiresIn: '1hr'
            })

            res.send({ token })

        })




        //  all Classes 

        app.get('/all-classes', async (req, res) => {


            const instructorClasses = await classesCollection.find().toArray()

            res.send(instructorClasses)

        })
















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



        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray()
            // console.log('get user', result)
            res.send(result)
        })



        app.delete('/user/delete/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await usersCollection.deleteOne(query)
            res.send(result)
        })





        app.get('/users/:email', async (req, res) => {
            const email = req.params.email

            const query = { email: email }

            // const result = await usersCollection.find().toArray() 
            const result = await usersCollection.findOne(query)

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


        app.patch('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'admin'
                },
            };

            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result)

        })
        // student 

        app.post('/select-class', verifyJWT, verifyStudent, async (req, res) => {
            const selectedClass = req.body

            const result = await selectedClassCollection.insertOne(selectedClass)
            res.send(result)

        })
        app.get('/select-class/:email', verifyJWT, verifyStudent, async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await selectedClassCollection.find(query).toArray()
            res.send(result)
        })


        app.delete('/select-class/delete/:id', verifyJWT, verifyStudent, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await selectedClassCollection.deleteOne(query)
            res.send(result)
        })


        app.get('/enroll/:email', verifyJWT, verifyStudent, async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await paymentCollection.find(query).sort({ date: -1 }).toArray()
            res.send(result)


        })


        // all payment history 
        // app.get('/all-payment', verifyJWT, verifyStudent, async (req, res) => {


        //     const result = await paymentCollection.find().sort({ date: -1 }).toArray()
        //     res.send(result)


        // })



        // instructor 
        app.post('/added-class', verifyJWT, verifyInstructor, async (req, res) => {
            const classes = req.body
            console.log(classes)
            const result = await classesCollection.insertOne(classes)
            res.send(result)

        })


        app.get('/instructor-classes/:email', verifyJWT, verifyInstructor, async (req, res) => {
            const email = req.params.email
            const query = { instructor_email: email }
            console.log(query)
            const instructorClasses = await classesCollection.find(query).toArray()
            console.log(instructorClasses)
            res.send(instructorClasses)

        })


        app.patch('/users/instructor/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'instructor'
                },
            };

            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result)

        })

        app.delete('/instructor-class/delete/:id', verifyJWT, verifyInstructor, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await classesCollection.deleteOne(query)
            res.send(result)
        })

        // Admin petch method 

        app.patch('/user/admin/approve/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'approve'
                },

            }

            const result = await classesCollection.updateOne(filter, updateDoc)
            res.send(result)
        })



        app.patch('/user/admin/denied/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const feedback = req.body.feedback
            // console.log(feedback)
            console.log(id, feedback)
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'denied',
                    feedback: feedback
                },

            }

            const result = await classesCollection.updateOne(filter, updateDoc)
            res.send(result)
        })



        // payment 

        app.post('/create-payment-intent', verifyJWT, verifyStudent, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100)
            // console.log(amount)

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });

            res.send({ clientSecret: paymentIntent.client_secret })


        })

        app.post('/payments', verifyJWT, verifyStudent, async (req, res) => {
            const payment = req.body
            const insertResult = await paymentCollection.insertOne(payment)
            const query = { _id: new ObjectId(payment.selectClassId) }
            const deleteResult = await selectedClassCollection.deleteOne(query)

            res.send({ insertResult, deleteResult })

        })



        // modified class seat count  

        app.patch('/modified-class/:id', async (req, res) => {

            const id = req.params.id
            const seats = parseInt(req.body.available_seats) - 1
            const enroll = parseInt(req.body.enrolled) + 1

            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    available_seats: seats,
                    enrolled: enroll,

                },

            }
            const result = await classesCollection.updateOne(filter, updateDoc)

            res.send(result)




        })






        app.get('/allInstructors', async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)

        })



        // instructor  classes get 
        app.get('/instructor/classes/:email', async (req, res) => {
            const email = req.params.email
            const filter = { instructor_email: email }
            const instructorClasses = await classesCollection.find(filter).toArray()

            res.send(instructorClasses)

        })
        


        app.get('/instructor/all-class/:email', async (req, res) => {
            const email = req.params.email

            const query = { instructor_email: email }

            const result = await classesCollection.find(query).toArray()
            res.send(result)

        })


        // popular classes 
        app.get('/popular-classes', async (req, res) => {


            const instructorClasses = await classesCollection.find().sort({ enrolled: -1 }).toArray()

            res.send(instructorClasses)

        })

        // popular instructor

        app.get('/popular-instructor', async (req, res) => {
            const result = await usersCollection.find().sort({ enrolled: -1 }).toArray()
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