const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

// imports from utils
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const {
    addUser,
    getUser,
    removeUser,
    getUsersInRoom,
    getUsersByInterest
} = require('./utils/users')


app.use(express.static(publicDirectoryPath))

// Socket.emit - sends event to specific client, io.emit - sends event to every connected client, socket.boradcast.emit - sends event to every connected client but you
// io.to.emit, socket.broadcast.to.emit (communicate to members in a room"to.")
io.on('connection', (socket) => {
    console.log('New WebsSocket connection')
    // Counts users in chat
    let usersOnChat = socket.client.conn.server.clientsCount
    
    // Create a lobby (room for everyone) and pass in custom messages
    // How many people are there in total
    // Welcome message
    // trending rooms

    // socket.on listens for request from chat.js(client)
    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })
        let usersOnChat = 0

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        usersOnChat++

        // socket.emit sends response to chat.js (client)
        socket.emit('message', generateMessage('Genius Bot', `Welcome, ${user.username}!`))
        socket.broadcast.to(user.room).emit('message', generateMessage('Genius Bot', `${user.username} has joined! There is a total of ${usersOnChat} Genius connected`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', ({ latitude, longitude }, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${latitude},${longitude}`))
        callback()
    })
    
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            usersOnChat--
            io.to(user.room).emit('message', generateMessage('Genius Bot', `${user.username} left! ${usersOnChat} Genius left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})




server.listen(port, () => {
    console.log(`Chat app listening on port ${port}!`)
})