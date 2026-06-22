const mongoose=require("mongoose")


require("dotenv").config()

module.exports.MongoDBconfig=()=>{
    mongoose.connect(process.env.MONGODB_URL)
    .then(()=>{
        console.info("connected to database successfully")
    })
    .catch((err)=>{
        console.error("MongoDB Connection Error", err)
    })

}
