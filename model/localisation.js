const mongoose = require('mongoose');

const LocalisationSchema = new mongoose.Schema({
    coordonnes : {
        type : [number], //longitude et latitude
        required : true,
        active : {
            type : Boolean,
            default : true
        }
    }
})

