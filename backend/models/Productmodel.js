
const mongoose=require('mongoose')




const ProductSchema= new mongoose.Schema({

    name:{
        type:String,
        required:true
    },
    partNumber:{
        type:String,
        unique:true,
        sparse:true,
        index:true
    },
    partName:{
        type:String
    },
    Desciption:{
        type:String,
        required:true,

    },
    description:{
        type:String
    },
    Category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Category"
    }, 
    manufacturer:{
        type:String
    },
    Price:{
        type:Number,
        required:true,
        
    
    },
    unitCost:{
        type:Number
    },
    quantity:{
        type:Number,
        default:0
    },
    currentStock:{
        type:Number,
        default:0
    },
    reorderLevel:{
        type:Number,
        default:10
    },
    unitOfMeasure:{
        type:String,
        default:"pcs"
    },
    location:{
        type:String
    },
    status:{
        type:String,
        enum:["active","inactive","discontinued"],
        default:"active"
    },
    image:{
        type:String,

    },
    supplier: { type: mongoose.Schema.Types.ObjectId, 
        ref: "Supplier" },
},
{ timestamps: true }

)

ProductSchema.pre("validate", function(next) {
    this.partName = this.partName || this.name;
    this.name = this.name || this.partName;
    this.description = this.description || this.Desciption;
    this.Desciption = this.Desciption || this.description || "No description provided";
    this.unitCost = this.unitCost ?? this.Price;
    this.Price = this.Price ?? this.unitCost ?? 0;
    this.currentStock = this.currentStock ?? this.quantity ?? 0;
    this.quantity = this.quantity ?? this.currentStock ?? 0;
    next();
});

const Product=mongoose.model("Product",ProductSchema)

module.exports=Product
