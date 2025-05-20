    const express = require('express');
    const router = express.Router();
    const path = require('path');
    const fs = require('fs');

    // Încărcare date produse
    const produsePath = path.join(__dirname, '../resurse/json/produse.json');
    let produseData = { produse: [] };

    try {
        const rawData = fs.readFileSync(produsePath, 'utf8');
        produseData = JSON.parse(rawData);
    } catch (err) {
        console.error('Eroare la încărcarea produselor:', err);
    }

    // Ruta pentru pagina produsului
    router.get('/:id', (req, res) => {
        const idProdus = req.params.id;
        const produs = produseData.produse.find(p => p.id === idProdus);
        

        if (!produs) {
            return res.status(404).render('pagini/eroare', {
                titlu: "Produs negăsit",
                text: "Produsul solicitat nu există în catalogul nostru."
            });
        }
        
        res.render('pagini/produs', {
            titlu: `SciMind - ${produs.nume}`,
            produs: produs,
            caleImagini: "/resurse/imagini/produse"
        });
    });

    // Ruta pentru lista de produse (opțional)
    router.get('/', (req, res) => {
        res.render('pagini/produse', {
            titlu: "SciMind - Catalog produse",
            produse: produseData.produse
        });
    });

    module.exports = router;