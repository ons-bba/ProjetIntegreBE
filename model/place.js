const mongoose = require('mongoose')
const placeSchema = mongoose.Schema({
  numero : {
    type : String,
    unique : true,
    validate : {
       validator: async function(numero){
      const existing = await this.constructor.findOne({
        numero : numero,
        parking : this.parking
      });
      return !existing
    },
    message : 'Le numero de place doit étre unique dans ce parking'
  }
  },
  
  disponible : {type : boolean ,default : true},
  type : { type:String , enum : ['standard', 'handicape','electrique'], default : 'standard'},
  parking : {type : mongoose.Schema.Types.ObjectId , ref : Parking, required : true}

})