const isValidCoordinates = (coords)=>{
    if(!Array.isArray(coords) || coords.length !== 2){
        return false;
    }



const [longitude,laltitude] = coords;

//convertit en nombre si c'est une chaine

const lng = Number(longitude);
const lat = Number(laltitude);

// verifie que ce sont des nombres valides

if(isNaN(lng) || isNaN(lat)){
    return false
}
// vérifie les plages acceptables
return(lng>= -180 && lng<= 180 && lat>=-90 && lat<= 90)
}

const isValidObjectId=(id)=>{
    return mongoose.Types.ObjectId.isValid(id) && 
    (new mongoose.Types.ObjectId(id)).toString()===id;
}


module.exports = {isValidCoordinates,isValidObjectId}