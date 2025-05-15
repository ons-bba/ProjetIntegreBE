const Place = require('../models/place');
const Parking = require('../models/parking');
const Tarif = require('../models/tarif');

// CREATE - Créer une nouvelle place
exports.createPlace = async (req, res) => {
  try {
    const { numero, parking, type, tarif } = req.body;

    // Validation des références
    const [parkingExists, tarifExists] = await Promise.all([
      Parking.exists({ _id: parking }),
      tarif ? Tarif.exists({ _id: tarif}) : true
    ]);

    if (!parkingExists) {
      return res.status(404).json({ error: "Parking non trouvé" });
    }

    if (tarif && !tarifExists) {
      return res.status(404).json({ error: "Tarif non trouvé" });
    }

    const newPlace = new Place({
      numero,
      parking,
      type,
      tarif,
      statut: 'libre'
    });

    await newPlace.save();
    res.status(201).json(newPlace);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// READ - Récupérer toutes les places d'un parking
exports.getPlacesByParking = async (req, res) => {
  try {
    const places = await Place.find({ parking: req.params.parkingId })
                             .populate('tarif');
    res.json(places);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ - Récupérer une place spécifique
exports.getPlaceById = async (req, res) => {
  try {
    const place = await Place.findById(req.params.id)
                            .populate('tarif parking');
    if (!place) {
      return res.status(404).json({ error: "Place non trouvée" });
    }
    res.json(place);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE - Mettre à jour une place
exports.updatePlace = async (req, res) => {
  try {
    const { statut, tarifId } = req.body;

    // Vérifier le tarif si fourni
    if (tarifId && !await Tarif.exists({ _id: tarifId })) {
      return res.status(404).json({ error: "Tarif non trouvé" });
    }

    const updatedPlace = await Place.findByIdAndUpdate(
      req.params.id,
      { statut, tarif: tarifId },
      { new: true, runValidators: true }
    );

    if (!updatedPlace) {
      return res.status(404).json({ error: "Place non trouvée" });
    }

    res.json(updatedPlace);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE - Supprimer une place
exports.deletePlace = async (req, res) => {
  try {
    const deletedPlace = await Place.findByIdAndDelete(req.params.id);
    if (!deletedPlace) {
      return res.status(404).json({ error: "Place non trouvée" });
    }
    res.json({ message: "Place supprimée avec succès" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Statistiques utiles
exports.getParkingStats = async (req, res) => {
  try {
    const stats = await Place.aggregate([
      { $match: { parking: mongoose.Types.ObjectId(req.params.parkingId) } },
      {
        $group: {
          _id: "$statut",
          count: { $sum: 1 },
          byType: { $push: { type: "$type", count: 1 } }
        }
      }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};