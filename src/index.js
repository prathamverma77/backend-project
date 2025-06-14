import dotenv from "dotenv"
import express from "express"; 
import connectDB from "./db/index.js";
import {app} from './app.js'

dotenv.config({
    path: './.env'
})
//const app = express();
connectDB()
.then(()=> {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`server is running at port : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ",err);
})
