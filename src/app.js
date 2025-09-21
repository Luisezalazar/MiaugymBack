const express = require("express")
const cors = require('cors')
const RoutineRoute = require("./routes/RoutineRoute")
const Person = require('./routes/PersonRoute')
const Register = require('./routes/RegisterRoute')
//https://app-gym-front.vercel.app
//http://localhost:5173
const app = express();

const corsOptions = {
    origin: 'https://app-gym-front.vercel.app',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions))

app.use(express.json());

app.use('/api/register', Register)
app.use('/api/Routine', RoutineRoute)
app.use('/api/person', Person)

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Active in ${port}`))