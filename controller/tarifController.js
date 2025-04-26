const Tarif = require('../model/tarif');
const mongoose = require('mongoose');

//créer un nouveau tarif 

const tarifController = {
createTarif : async (req, res) => {
    try {
        const { parking, type, tarifHoraire, tarifJournalier, tarifMensuel, tarifReduit, dateDebut,
            dateFin } = req.body;
       // const createdBy = req.user._id; // supposons que l'utilistateur est authentifié
        const newTarif = new Tarif({
            parking,
            type,
            tarifHoraire,
            tarifJournalier,
            tarifMensuel,
            tarifReduit,
            dateDebut: dateDebut || new Date(),
            dateFin,
            //createdBy
        })
        const savedTarif = await newTarif.save();
        res.status(201).json({
            success: true,
            data: savedTarif,
            message: 'Tarif crée avec succés'
        })

    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message)
            return res.status(400).json({
                success: false,
                message: 'Erreur de validation',
                error: messages
            });

        }
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la creation du tarif',
            error: err.message
        });

    }
},


// récupérer tous les tarifs
getAlltarifs : async(req,res)=> {
    try {
        const { parking, type, activeOnly } = req.query;
        const filter = {};
        if (parking) filter.parking = parking;
        if (type) filter.type = type;
        if (activeOnly) {
            filter.dateDebut = { $lte: new Date() };
            filter.$or = [
                { dateFin: null },
                { dateFin: { $gt: new Date() } }
            ]
        }

        const tarifs = await Tarif.find(filter)
            .populate('parking', 'nom ')
            .populate('createdBy', 'name email')
            .sort({ dateDebut: -1 });

        res.status(200).json({
            success: true,
            count: tarifs.length,
            data: tarifs
        })

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération des tarifs',
            error: err.message
        });

    }
},

// récupérer un tarif spécifique 

getTarif : async (req,res)=>{
    try {
        const tarif = await Tarif.findById(req.params.id)
        .populate('parking','nom description')
        .populate('createdBy','name email');

        if(!tarif){
            return res.status(404).json({
                success:false,
                message:'Tarif non trouvé'
            });
        }
        res.status(200).json({
            success:true,
            data:tarif
        });

    }catch(err){
        if(err instanceof mongoose.CastError){
            return res.status(400).json({
                success: false,
                message: 'ID de tarif non valid'
            });
        }

        res.status(500).json({
            success: false,
            message:'Erreur serveur lors de la récupération du tarif'
        })

    }
},

// Mettre à jour un Tarif

updateTarif : async (req,res) =>  {
    try {
        const {dateFin, description, ...updateData}=req.body;
    //Ne pas permettre la modification de certains champs 
    delete updateData.parking;
    delete updateData.type;
    delete updateData.createdBy;
    

    const tarif = await Tarif.findByIdAndUpdate(req.params.id,
        {...updateData,
            dateFin,
            description
        },
        {new:true, runValidators:true}
    );

    if(!tarif){
        return res.status(404).json({
            success: false,
            message:'Tarif non trouvé'
        })
    }

    res.status(200).json({
        success: true,
        data:tarif,
        message:'Tarif mise à jour avec succès'
    })


    }catch(err){
        if(err.name==='ValidationError'){
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message:'Erreur de validation',
                errors: messages
            })

        }
        res.status(500).json({
            success:false,
            message:'Erreur serveur lors de la mise à jour du tarif',
            error: err.message
        })
    }

},



deleteTarif: async (req,res)=>{
    try{
        const tarif = await Tarif.findByIdAndDelete(req.params.id);
        if(!tarif){
            return res.status(404).json({
                success:false,
                message:'Tarif non trouvé'
            });
        }
        res.status(200).json({
            success:true,
            data:{},
            message:'Tarif supprimé avec succès'
        })

    }catch(err){
        if(err instanceof mongoose.CastError){
            return res.status(400).json({
                success:false,
                message:'ID de tarif invalid'
            });
        }
        res.status(500).json({
            success:false,
            message:'Erreur serveur lors de la suppression du tarif',
            error:err.message
        });

    };
},

//Récupérer les tarifs actifs pour un parking

getActiveTarifsForParking : async (req,res)=>{
    try {
        const now = new Date();
        const tarifs = await Tarif.find({
            parking:req.params.parkingId,
            dateDebut:{$lte : now},
            $or:[
                {dateFin:null},
                {dateFin:{$gt:now}}
            ]
        }).sort({type:1});

        res.status(200).json({
            success:true,
            count: tarifs.length,
            data:tarifs
        })

    }catch(err){
        res.status(500).json({
            success:false,
            message:'Erreur serveur lors de la récupération des taris ',
            error:err.message
        });

    }
}
}

module.exports = tarifController;




