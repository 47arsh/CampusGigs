import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    name : {
        type : String,
        required : true,
        minlength : 2
    },
    email : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
    },
    password : {
        type : String,
        required : true,
        minlength : 6
    }
},{
    timestamps : true
})

const User = new mongoose.model("User" , userSchema);
export default User;