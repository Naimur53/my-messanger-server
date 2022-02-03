const { MongoClient } = require('mongodb');
const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
const port = process.env.PORT || 5000;
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config()
const fileUpload = require('express-fileupload');
const { Server } = require('socket.io')
const server = http.createServer(app);

//io server
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

//middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

//socket io connection
io.on('connection', (socket) => {
    console.log(socket.id);
    socket.on('join', id => {
        console.log('Joining ', id);
        socket.join(id);
    });
    socket.on('leave', id => {
        console.log('leave', id);
        socket.leave(id);
    });
    socket.on('message', msg => {
        console.log('seend only', msg.room);
        socket.to(msg.room).emit('receive_message', msg);
        // socket.broadcast.emit('message', msg)
    });
    // socket.on('say to someone', (id, msg) => {
    //     socket.to(id).emit('my message', msg);
    //     console.log('person', id, msg);
    // });
    // socket.on('join_chat', data => {
    //     socket.join(data);
    //     console.log('join', data);
    // })
    socket.on('disconnect', () => {
        console.log('user disconnect', socket.id);
    })

})
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.icikx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        await client.connect();
        const database = client.db('messenger');
        const usersCollection = database.collection('users');
        const friendCollection = database.collection('friends');
        const chatCollection = database.collection('chat');

        app.get('/users', async (req, res) => {
            const cursor = await usersCollection.find({});
            const result = await cursor.toArray();
            res.json(result);
        })
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const result = await usersCollection.findOne(query);
            res.json(result);
        })

        app.post('/users', async (req, res) => {
            const data = req.body;
            const result = await usersCollection.insertOne(data);
            res.json(result)
        })
        app.put('/users', async (req, res) => {
            const data = req.body;
            const filter = { email: data.email };
            const options = { upsert: true };
            const updateDoc = {
                $set: data
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json()
        })
        app.get('/chat/:room', async (req, res) => {
            const room = parseInt(req.params.room);
            console.log("this is ", req.params);
            console.log('room', room);
            const query = { room };
            const result = await chatCollection.find(query).toArray();
            console.log('data come from mongodb');
            res.json(result);
        })
        app.post('/chat', async (req, res) => {
            const data = req.body;
            data.room = parseInt(data.room);
            const pic = req?.files?.pic;
            const picData = pic?.data;
            if (picData) {
                const encodedPic = picData.toString('base64');
                const imageBuffer = Buffer.from(encodedPic, 'base64');
                data.pic = imageBuffer.toString('base64');
            }
            else {
                delete data.pic;
            }
            console.log(data);

            const result = await chatCollection.insertOne(data);
            res.json(result)


        })
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Running assignment 12 server')
})

server.listen(port, () => {
    console.log("messenger server is running");
})