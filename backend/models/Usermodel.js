
const mongoose=require('mongoose')




const UserSchema= new mongoose.Schema({

    name:{
        type:String,
        require:true
    },
    email:{
        type:String,
        require:true,
        unique:true
    },
    password:{
        type:String,
        require:true
    }, 
    role:{
        type:String,
        enum:['admin','manager','staff'],
        default:'staff',
    
    },
    staffId:{ type:String, unique:true, sparse:true },
    department:{ type:mongoose.Schema.Types.ObjectId, ref:"Department" },
    designation:{ type:String },
    phone:{ type:String },
    isActive:{ type:Boolean, default:true },
    lastLogin:{ type:Date },
    ProfilePic:{
        type:String
   

    },
    createdAt:{
        type:Date,
        default:Date.now

    },},
    { timestamps: true }


)

const User=mongoose.model("User",UserSchema)

module.exports=User
