const express = require('express');
const router = express.Router();
const Prestation = require('../model/prestation');



// create : Ajouter un nouveau service 

router.post('/', async(req,res)=>{
    try {
        const prest = new Prestation(req.body);
        await prest.save();
        res.status(201).json(prest)

    }catch(err){
        res.status(400).json({error:err.message})
    }
});






module.exports = router


