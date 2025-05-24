
const mongoose = require('mongoose')
const Booking = require('../models/booking');
const Place = require('../models/place');
const Tarif = require('../models/tarif');
const Parking = require('../models/parking');
const moment = require('moment')

const bookingController = {
    createBooking: async (req, res) => {
        
        
        try {
            // 1 . Extraction des données 
            const { typePlace, dateDebut, duree, longitude, latitude } = req.body;
            console.log(typePlace, duree, dateDebut, longitude, latitude)

            const userId = req.user._id;
            console.log(userId)


            //2. validation geospatiale 
            if (!longitude || !latitude) {
                return res.status(400).json({
                    success: false,
                    message: 'coordonées GPS requise'
                });
            }

            // const point = {
            //     type: 'Point',
            //     coordinates: [parseFloat(longitude), parseFloat(latitude)]
            // };

            // 3. Recherche des parkings proches (utilisation de l'index 2dsphere)
            
                const parkings = await mongoose.model('Parking').aggregate([
                    {
                        $geoNear: {
                            near: {
                                type: 'Point',
                                 coordinates: [parseFloat(longitude), parseFloat(latitude)]
                            },
                            distanceField: 'distance',
                            spherical: true,
                        
                            query: {
                                statut: 'OUVERT',
                                placesDisponible: { $gt: 0 }
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: 'places',
                            let: { parkingId: '$_id' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ['$parking', '$$parkingId'] },
                                        type: typePlace,
                                        statut: 'libre'
                                    }
                                }
                            ],
                            as: 'placesDisponibles'
                        }
                    },
                    {
                        $match: { placesDisponibles: { $ne: [] } }
                    },
                    {
                        $limit: 3
                    }]);

                
                console.log("lenght de parking :"+parkings.length)

                if (parkings.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Aucun parking disponible dans votre zone'
                    });
                }

           

            // 4 . logique de reservation 

            const parking = parkings[0]
            const place = parking.placesDisponibles[0]
            console.log("parking:"+parking)
            console.log(place)
            console.log("userid : "+ userId+" place : " +place._id+" parking"+parking._id+" datedebut :"
                +new Date(dateDebut)+" dateFin :"+moment(dateDebut).add(duree, 'hours').toDate()
            )

            const booking = await mongoose.model('Booking').create(
                {
                    client: userId,
                    place: place._id,
                    parking: parking._id,
                    typeTarif:typePlace,
                    dateDebut: new Date(dateDebut),
                    dateFin: moment(dateDebut).add(duree, 'hours').toDate(),



                });


            // 5 . Mise à jour des disponibilités
            await mongoose.model('Place').updateOne(
                { _id: place._id },
                { $set: { statut: "réservée" } }
            );
            await mongoose.model('Parking').updateOne(
                { _id: parking._id },
                { $inc: { placesDisponible: -1 } }
                
            );

            

            res.json({
                success: true,
                data: {
                    parking: parking.nom,
                    distance: (parking.distance / 1000).toFixed(2) + 'km',
                    place: place.numero
                }
            });


        } catch (err) {
            
            res.status(500).json({
                success: false,
                message: err.message
            });

        } 
    }
}

module.exports = bookingController;

