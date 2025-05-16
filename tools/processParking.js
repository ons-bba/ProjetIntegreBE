processParkingData: (text) => {
  return text.split('\n')
    .filter(line => line.trim() !== '')
    .map(line => {
      // Remplacer les points-virgules manquants
      const sanitizedLine = line.replace(/\.([A-Z]+)/g, ';$1');
      const [nom, statut, placesDisponible, longitude, latitude] = sanitizedLine.split(';');
      
      if (!nom || !statut || isNaN(placesDisponible) || isNaN(longitude) || isNaN(latitude)) {
        throw new Error(`Format invalide dans la ligne: ${line}`);
      }

      return {
        nom: nom.trim(),
        statut: statut.trim(),
        placesDisponible: parseInt(placesDisponible),
        localisation: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        }
      };
    });
}