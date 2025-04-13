const express = require("express");
const path = require("path");
const fs = require("fs");
const eroriConfig = JSON.parse(fs.readFileSync("erori.json"));
const app = express();

// Configurare
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Resurse statice
app.use("/resurse", express.static(path.join(__dirname, "resurse")));

// Rute principale
app.get(["/", "/index", "/home"], (req, res) => {
    res.render("index", { 
        ip: req.ip,
        titlu: "SciMind - Pagina principală" 
    });
});

app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "resurse/ico/favicon.ico"));
});

// Funcție pentru a afisa eroarea corespunzătoare
function afiseazaEroare(res, identificator) {
    const eroare = eroriConfig.info_erori.find(e => e.identificator === identificator) || eroriConfig.eroare_default;
    const status = eroare.status ? identificator : 200;

    // Verifică calea imaginii și afișează în consolă
    const caleImagine = eroriConfig.cale_baza + eroare.imagine;
    console.log('Încerc să încarc imaginea:', caleImagine);

    // Redirecționează către pagina de eroare
    res.status(status).render("pagini/eroare", {
        titlu: eroare.titlu,
        text: eroare.text,
        imagine: caleImagine
    });
}

// Ruta generală pentru pagini dinamice
// Ruta principală pentru pagini
app.get("/pagini/:numePagina", (req, res) => {
    const numePagina = req.params.numePagina;
    const caleView = `pagini/${numePagina}`;
    
    // Verificăm dacă fișierul există
    const caleFisier = path.join(__dirname, 'views', caleView + '.ejs');
    
    fs.access(caleFisier, fs.constants.F_OK, (err) => {
        if (err) {
            afiseazaEroare(res, 404);
        } else {
            res.render(caleView, { 
                titlu: `SciMind - ${numePagina.replace(/-/g, ' ')}`
            });
        }
    });
});

// Ruta pentru eroare.ejs (special case)
app.get("/eroare", (req, res) => {
    res.render("pagini/eroare", {
        titlu: "Pagină de eroare"
    });
});

// Pornire server
const PORT = 8080;
app.listen(PORT, () => {
    console.log(`
    Serverul rulează pe portul ${PORT}
    Accesează: http://localhost:${PORT}
    `);
});
