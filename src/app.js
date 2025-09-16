const express = require("express")
const cors = require('cors')
const RoutineRoute = require("./routes/RoutineRoute")
const Person = require ('./routes/PersonRoute')

const app = express();


//Cors
app.use(cors())
app.use(express.json());
app.use ('/api/Routine', RoutineRoute)
app.use('/api/person', Person)

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Active in ${port}`))