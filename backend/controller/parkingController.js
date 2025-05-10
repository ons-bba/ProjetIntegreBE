const { default: mongoose } = require('mongoose');
const Parking = require('../model/parking');
const { isValidObjectId } = require('../model/validator/validators');




const parkingController = {
    createParking: async (req, res) => {
        try {
            // Validation des coordonnées
            if (!req.body.localisation || !req.body.localisation.coordinates) {
                return res.status(400).json({ error: "Les coordonnées de localisation sont requises" });
            }
    
            const { longitude, latitude, ...rest } = req.body.localisation.coordinates?
                 {
                    longitude: req.body.localisation.coordinates[0],
                    latitude: req.body.localisation.coordinates[1],
                    ...req.body
                  }
                : req.body;
    
            const parkingData = {
                ...rest,
                localisation: {
                    type: 'Point',
                    coordinates: [parseFloat(longitude), parseFloat(latitude)]
                }
            };
    
            const parking = new Parking(parkingData);
            await parking.save();
            res.status(201).json(parking);
    
        } catch (err) {
            res.status(500).json({ error: err.message })

        }

    },
    getAllParkings: async (req, res) => {
        try {
            const parkings = await Parking.find().populate('prestations');
            if (!parkings) {
                return res.status(404).json({ message: 'service non disponible' })
            }
            res.json(parkings)

        } catch (err) {
            res.status(500).json({ error: err.message })
        }
    },

    getParkingById: async (req, res) => {
        try {
            const parking = await Parking.findById(req.params.id)
            if (!parking) {
                return res.status(404).json({ message: 'service non disponible' })
            }
            res.status(200).json(parking)

        } catch (err) {
            res.stauts(500).json({ error: err.json })
        }
    },

    updateParking: async (req, res) => {
        try {
            
            const {id}=req.params
            if(! mongoose.Types.ObjectId.isValid(id)){
                return res.status(400).json({message:"ID de parking invalid"})
            }
            if(Object.keys(req.body).length == 0){
                return res.status(400).json({message:"Aucun donnée fournie pour la mise ajour"})
            }
            const update = await Parking.findByIdAndUpdate(id, {$set : req.body}, { new: true, 
                runValidators: true
             });
            
            if (!update) {
                return res.status(404).json({ message: 'service non disponible' })
            }
            return res.status(200).json(update)

        } catch (err) {
            
            if(err.name === "ValidatorError"){
                return res.status(400).json({
                    success : false,
                    message: "Erreur de validation",
                    error : "err.message"
                })
            };
            return res.status(500).json({
                success : false,
                message: "Erreur serveur lors de la mise a jour de parking",
                error: err.message
            })
        }
    },

    deleteParking: async (req, res) => {
        
        const {id} = req.params

        try {

            if(!mongoose.Types.ObjectId.isValid(id)){
                throw new Error("id n'est pas un objectId")
            }
            const deleted = await Parking.findByIdAndDelete(id);

            if (!deleted) {

                throw new Error("Erreur serveur")
            }
            res.status(200).json({ message: 'Parking supprimé avec succès' });
        } catch (err) {
            res.status(500).json({ 
                success : false,
                message:"Erreur serveur lors de la mise a jour de parking",
                error: err.message });
        }



    },
    importParkingFromJson: async (req,res)=>{
        try{
            if(!req.body || !Array.isArray(req.body)){
                return res.status(400).json({
                    success : false,
                    message : "le corps de la requette doit contenir un tableau de parking"
                });
            }
            // valider et transformer chaque parking 
            const parkingToInsert = req.body.map(parkingData=>{
                //validation basique
                if(!parkingData.nom || !parkingData.placesTotal || ! parkingData.localisation?.coordinates){
                    throw new Error(`Parking invalid: ${JSON.stringify(parkingData)}`)
                }
                return {
                    nom : parkingData.nom,
                    statut:parkingData.statut || 'OUVERT',
                    placesTotal:parkingData.placesTotal,
                    placesDisponible: parkingData.placesDisponible || parkingData.placesTotal,
                    localisation: {
                        type: 'Point',
                        coordinates : [
                            parseFloat(parkingData.localisation.coordinates[0]),
                            parseFloat(parkingData.localisation.coordinates[1])
                        ]
                    },
                    prestations: parkingData.prestations || [],
                    horaires: parkingData.horaires || {
                        ouverture: '08:00',
                        fermeture: '20:00'
                    }
                }
            });
            // Insert en masse 
            const result = await Parking.insertMany(parkingToInsert,{ordered : false})
            res.status(201).json({
                sucess : true,
                message: `${result.length} parking créés avec succès`,
                data : result
            })

        }catch(err){
            // Gestion erreur en Bulk insert 
            if(err.name ==='BulkWriteError'){
                const successCount = err.result.result.nInserted;
                return res.status(207).json({
                    success: false,
                    message : `opération partiellement réussie(${successCount} parking créés)`,
                    error:  err.writeErrors.map(e=>e.errmsg)
                });
            }

        }
        res.status(500).json({
            success: false,
            message: "Erreur lors de l'import des parkings",
            error:err.message
        })
    }
}


module.exports = parkingController