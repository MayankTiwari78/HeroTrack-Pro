
const mongoose=require('mongoose')




const SupplierSchema= new mongoose.Schema({

    name:{
        type:String,
        require:true
    },
    supplierCode:{ type:String, unique:true, sparse:true },
    gstNumber:{ type:String },
    contactPerson:{ type:String },
    rating:{ type:Number, default:4 },
    status:{ type:String, enum:["active","inactive"], default:"active" },
    contactInfo:{
        phone:{type:String},
        email:{type:String},
        address:{type:String}
    },
    productsSupplied:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Product"

    },
},    { timestamps: true }


)

const Supplier=mongoose.model("Supplier",SupplierSchema)

module.exports=Supplier
