import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectdb = async() =>{
    try {
        const connected = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n mongo db is connected to !! ${connected.connection.host}`)
    } catch (error) {
        console.log("Error:" ,error);
        throw error
    }
}


export default connectdb